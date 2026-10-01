const { Router } = require('express');
const { login, getMe, logout } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

// Rota pública de autenticação
router.post('/auth/login', login);

// Rotas protegidas por verificação contínua Zero-Trust
router.get('/auth/me', authMiddleware, getMe);
router.post('/auth/logout', authMiddleware, logout);

module.exports = router;
