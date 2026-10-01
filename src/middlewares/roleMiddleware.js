const { registrarLog } = require('../services/auditoriaService');

/**
 * Middleware para controle de acesso baseado em papéis (RBAC - Role-Based Access Control)
 * Blindagem de privilégios no modelo Zero-Trust
 * 
 * @param {Array<string>|string} allowedRoles Papéis permitidos (ex: 'admin', ['admin', 'conselheiro'])
 */
function requireRole(allowedRoles) {
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Não autenticado',
                message: 'Usuário não identificado na requisição.'
            });
        }

        const userRole = req.user.role;

        if (!rolesArray.includes(userRole)) {
            // Registra tentativa de violação de privilégio
            await registrarLog({
                usuarioId: req.user.idUsuario,
                username: req.user.username,
                role: userRole,
                acao: 'ACESSO_NEGADO_ROLE',
                recurso: req.originalUrl,
                status: 'ACESSO_NEGADO',
                detalhes: {
                    metodo: req.method,
                    roleNecessario: rolesArray,
                    roleUsuario: userRole
                },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            return res.status(403).json({
                error: 'Acesso Proibido',
                message: `Seu perfil (${userRole}) não possui permissão para executar esta ação ou acessar este recurso.`
            });
        }

        next();
    };
}

module.exports = {
    requireRole
};
