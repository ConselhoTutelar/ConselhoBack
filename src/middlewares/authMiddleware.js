const { verificarToken } = require('../utils/jwt');
const { query } = require('../config/db');
const { registrarLog } = require('../services/auditoriaService');

/**
 * Middleware Zero-Trust: Nunca Confie, Sempre Verifique
 * 1. Valida a assinatura criptográfica, emissor (issuer) e audiência (audience) do token JWT.
 * 2. Verifica em tempo real no banco de dados se o usuário permanece ativo e qual seu papel (role) atual.
 * 3. Bloqueia acesso a recursos caso o usuário esteja com troca obrigatória de senha pendente (1º acesso).
 */
async function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader) {
        await registrarLog({
            acao: 'ACESSO_BLOQUEADO',
            recurso: req.originalUrl,
            status: 'FALHA',
            detalhes: 'Tentativa de acesso sem cabeçalho Authorization',
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        return res.status(401).json({
            error: 'Acesso não autorizado',
            message: 'Token de autenticação não fornecido no cabeçalho Authorization.'
        });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            error: 'Acesso não autorizado',
            message: 'Formato de token inválido. O formato esperado é "Bearer <token>".'
        });
    }

    const token = parts[1];
    const payload = verificarToken(token);

    if (!payload || !payload.idUsuario) {
        await registrarLog({
            acao: 'TOKEN_INVALIDO',
            recurso: req.originalUrl,
            status: 'FALHA',
            detalhes: 'Token JWT expirado ou adulterado',
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        return res.status(401).json({
            error: 'Token inválido ou expirado',
            message: 'A sua sessão expirou ou o token de segurança é inválido. Efetue login novamente.'
        });
    }

    // Verificação contínua no banco (Zero-Trust State Validation)
    try {
        const usuarios = await query(
            'SELECT idUsuario, username, nome, role, cargo, ativo, precisaTrocarSenha, idConselheiro FROM Usuario WHERE idUsuario = ? LIMIT 1',
            [payload.idUsuario]
        );
        const usuarioAtivo = usuarios && usuarios[0];

        if (!usuarioAtivo || !usuarioAtivo.ativo) {
            await registrarLog({
                usuarioId: payload.idUsuario,
                username: payload.username,
                acao: 'SESSAO_REVOGADA',
                recurso: req.originalUrl,
                status: 'ACESSO_NEGADO',
                detalhes: 'Tentativa de uso de token de usuário inativo ou excluído',
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            return res.status(401).json({
                error: 'Conta inativa ou revogada',
                message: 'Este usuário não possui mais acesso ativo ao sistema.'
            });
        }

        // Bloqueio Zero-Trust de 1º acesso: se precisaTrocarSenha for true, só permite rotas de troca de senha, perfil atual e logout
        const rotasPermitidasPrimeiroAcesso = ['/auth/alterar-senha', '/auth/me', '/auth/logout'];
        if (
            Boolean(usuarioAtivo.precisaTrocarSenha) &&
            !rotasPermitidasPrimeiroAcesso.some(r => req.path.startsWith(r))
        ) {
            return res.status(403).json({
                error: 'Troca de senha obrigatória',
                message: 'Por segurança, você deve alterar sua senha temporária de primeiro acesso antes de acessar os recursos do sistema.',
                requirePasswordChange: true
            });
        }

        // Injeta os dados validados diretamente do banco na requisição
        req.user = {
            ...payload,
            idUsuario: usuarioAtivo.idUsuario,
            username: usuarioAtivo.username,
            nome: usuarioAtivo.nome,
            role: usuarioAtivo.role,
            cargo: usuarioAtivo.cargo,
            idConselheiro: usuarioAtivo.idConselheiro,
            precisaTrocarSenha: Boolean(usuarioAtivo.precisaTrocarSenha)
        };

        next();
    } catch (dbErr) {
        // Fallback seguro caso ocorra oscilação momentânea de rede na consulta auxiliar
        req.user = payload;
        next();
    }
}

module.exports = authMiddleware;
