const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'conselho_tutelar_panambi_rs_zero_trust_jwt_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Gera um token JWT seguro contendo as claims mínimas necessárias (Zero-Trust)
 */
function gerarToken(usuario) {
    const payload = {
        idUsuario: usuario.idUsuario,
        username: usuario.username,
        nome: usuario.nome,
        role: usuario.role,
        cargo: usuario.cargo,
        email: usuario.email
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'conselho-tutelar-panambi',
        audience: 'conselho-tutelar-web'
    });
}

/**
 * Valida o token JWT e retorna o payload decodificado
 */
function verificarToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'conselho-tutelar-panambi',
            audience: 'conselho-tutelar-web'
        });
    } catch (error) {
        return null;
    }
}

module.exports = {
    gerarToken,
    verificarToken
};
