const { Router } = require('express');
const { createDenuncia, getDenuncias, getDenunciaById } = require('../controllers/denunciaController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

// Todas as rotas de denúncias requerem autenticação (Zero-Trust)
router.post('/denuncias', authMiddleware, createDenuncia);
router.get('/denuncias', authMiddleware, getDenuncias);
router.get('/denuncias/:id', authMiddleware, getDenunciaById);

module.exports = router;
