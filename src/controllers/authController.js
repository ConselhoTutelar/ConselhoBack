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

        if (!username || !password) {
            return res.status(400).json({
                error: 'Dados incompletos',
                message: 'Informe o nome de usuário e a senha.'
            });
        }

        const usuarios = await query(`
            SELECT * FROM Usuario WHERE username = ? AND ativo = TRUE
        `, [username.trim()]);

        const usuario = usuarios[0];

        if (!usuario) {
            await registrarLog({
                username: username.trim(),
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
            detalhes: { loginTime: new Date() },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        // Retorna os dados do usuário (sem a senha com hash) e o token
        const { password: _, ...usuarioSeguro } = usuario;

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
 * Retorna os dados do usuário autenticado atual
 */
const getMe = async (req, res) => {
    try {
        const usuarios = await query(`
            SELECT idUsuario, username, nome, email, cargo, role, telefone, matricula, unidade, areaAtuacao, plantao, criadoEm 
            FROM Usuario 
            WHERE idUsuario = ?
        `, [req.user.idUsuario]);

        if (!usuarios || usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({ user: usuarios[0] });
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
    getMe,
    logout
};
