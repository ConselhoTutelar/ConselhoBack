const { Router } = require('express');
const { createAtendimento, getAtendimentos, getAtendimentoById } = require('../controllers/atendimentoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

// Todas as rotas de atendimentos requerem autenticação (Zero-Trust)
router.post('/atendimentos', authMiddleware, createAtendimento);
router.get('/atendimentos', authMiddleware, getAtendimentos);
router.get('/atendimentos/:id', authMiddleware, getAtendimentoById);

module.exports = router;
