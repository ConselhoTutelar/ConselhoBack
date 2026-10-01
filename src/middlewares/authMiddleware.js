const { verificarToken } = require('../utils/jwt');
const { registrarLog } = require('../services/auditoriaService');

/**
 * Middleware Zero-Trust: Nunca Confie, Sempre Verifique
 * Valida a assinatura criptográfica do token JWT em cada requisição
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

    if (!payload) {
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

    // Injeta os dados do usuário autenticado no request de forma segura
    req.user = payload;
    next();
}

module.exports = authMiddleware;
