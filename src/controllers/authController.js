const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { gerarToken } = require('../utils/jwt');
const { registrarLog } = require('../services/auditoriaService');

/**
 * Autenticação do Usuário (Zero-Trust Login)
 */
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({
                error: 'Dados incompletos',
                message: 'Informe o nome de usuário e a senha.'
            });
        }

        const loginInformado = username.trim();

        const usuarios = await query(`
            SELECT * FROM Usuario 
            WHERE (username = ? OR matricula = ?) AND ativo = TRUE
            LIMIT 1
        `, [loginInformado, loginInformado]);

        const usuario = usuarios[0];

        if (!usuario) {
            await registrarLog({
                username: loginInformado,
                acao: 'LOGIN_FALHA',
                recurso: '/auth/login',
                status: 'FALHA',
                detalhes: 'Usuário não encontrado ou inativo',
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            return res.status(401).json({
                error: 'Credenciais inválidas',
                message: 'Usuário ou senha incorretos.'
            });
        }

        // Verifica a senha com o hash bcrypt
        const senhaCorreta = await bcrypt.compare(password.trim(), usuario.password);

        if (!senhaCorreta) {
            await registrarLog({
                usuarioId: usuario.idUsuario,
                username: usuario.username,
                role: usuario.role,
                acao: 'LOGIN_FALHA',
                recurso: '/auth/login',
                status: 'FALHA',
                detalhes: 'Senha incorreta',
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            return res.status(401).json({
                error: 'Credenciais inválidas',
                message: 'Usuário ou senha incorretos.'
            });
        }

        // Gera token JWT com as credenciais assinadas
        const token = gerarToken(usuario);

        // Trilha de auditoria para o acesso autenticado com sucesso
        await registrarLog({
            usuarioId: usuario.idUsuario,
            username: usuario.username,
            role: usuario.role,
            acao: 'LOGIN_SUCESSO',
            recurso: '/auth/login',
            status: 'SUCESSO',
            detalhes: {
                loginTime: new Date().toISOString(),
                primeiroAcessoPendente: Boolean(usuario.precisaTrocarSenha)
            },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        // Retorna os dados do usuário (sem a senha com hash) e o token
        const { password: _, ...usuarioSeguro } = usuario;
        usuarioSeguro.precisaTrocarSenha = Boolean(usuario.precisaTrocarSenha);

        res.json({
            message: 'Autenticado com sucesso',
            token,
            user: usuarioSeguro
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            error: 'Erro interno',
            message: 'Ocorreu um erro no processamento do login.'
        });
    }
};

/**
 * Alteração de Senha (obrigatória no primeiro acesso ou voluntária pelo usuário autenticado)
 */
const alterarSenha = async (req, res) => {
    try {
        const { senhaAtual, novaSenha } = req.body;
        const idUsuario = req.user?.idUsuario;

        if (!senhaAtual || !novaSenha || typeof senhaAtual !== 'string' || typeof novaSenha !== 'string') {
            return res.status(400).json({
                error: 'Dados incompletos',
                message: 'Informe a senha atual (ou temporária) e a nova senha.'
            });
        }

        const novaLimpa = novaSenha.trim();
        if (novaLimpa.length < 6) {
            return res.status(400).json({
                error: 'Senha muito curta',
                message: 'A nova senha deve possuir no mínimo 6 caracteres.'
            });
        }

        const usuarios = await query('SELECT * FROM Usuario WHERE idUsuario = ? AND ativo = TRUE LIMIT 1', [idUsuario]);
        const usuario = usuarios[0];

        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const senhaAtualValida = await bcrypt.compare(senhaAtual.trim(), usuario.password);
        if (!senhaAtualValida) {
            await registrarLog({
                usuarioId: usuario.idUsuario,
                username: usuario.username,
                role: usuario.role,
                acao: 'ALTERAR_SENHA_FALHA',
                recurso: '/auth/alterar-senha',
                status: 'FALHA',
                detalhes: 'Senha atual/temporária informada incorretamente',
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            return res.status(401).json({
                error: 'Senha atual incorreta',
                message: 'A senha atual/temporária informada não confere.'
            });
        }

        const mesmaSenha = await bcrypt.compare(novaLimpa, usuario.password);
        if (mesmaSenha) {
            return res.status(400).json({
                error: 'Senha idêntica',
                message: 'A nova senha deve ser diferente da senha temporária/atual.'
            });
        }

        const novoHash = await bcrypt.hash(novaLimpa, 10);
        await query(
            'UPDATE Usuario SET password = ?, precisaTrocarSenha = FALSE WHERE idUsuario = ?',
            [novoHash, usuario.idUsuario]
        );

        const usuarioAtualizado = {
            ...usuario,
            precisaTrocarSenha: false
        };
        delete usuarioAtualizado.password;

        const novoToken = gerarToken(usuarioAtualizado);

        await registrarLog({
            usuarioId: usuario.idUsuario,
            username: usuario.username,
            role: usuario.role,
            acao: 'ALTERAR_SENHA_SUCESSO',
            recurso: '/auth/alterar-senha',
            status: 'SUCESSO',
            detalhes: { motivo: 'Redefinição de senha pessoal concluída com sucesso' },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        return res.json({
            message: 'Senha alterada com sucesso!',
            token: novoToken,
            user: usuarioAtualizado
        });
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        return res.status(500).json({
            error: 'Erro interno',
            message: 'Não foi possível concluir a alteração de senha.'
        });
    }
};

/**
 * Retorna os dados do usuário autenticado atual
 */
const getMe = async (req, res) => {
    try {
        const usuarios = await query(`
            SELECT idUsuario, username, nome, email, cargo, role, telefone, matricula, unidade, areaAtuacao, plantao, idConselheiro, precisaTrocarSenha, criadoEm 
            FROM Usuario 
            WHERE idUsuario = ?
        `, [req.user.idUsuario]);

        if (!usuarios || usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const user = {
            ...usuarios[0],
            precisaTrocarSenha: Boolean(usuarios[0].precisaTrocarSenha)
        };

        res.json({ user });
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ error: 'Erro ao buscar perfil do usuário' });
    }
};

/**
 * Encerramento de Sessão (Logout auditado)
 */
const logout = async (req, res) => {
    try {
        if (req.user) {
            await registrarLog({
                usuarioId: req.user.idUsuario,
                username: req.user.username,
                role: req.user.role,
                acao: 'LOGOUT',
                recurso: '/auth/logout',
                status: 'SUCESSO',
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });
        }
        res.json({ message: 'Sessão encerrada com sucesso' });
    } catch (error) {
        console.error('Erro ao efetuar logout:', error);
        res.status(500).json({ error: 'Erro ao registrar encerramento de sessão' });
    }
};

module.exports = {
    login,
    alterarSenha,
    getMe,
    logout
};
