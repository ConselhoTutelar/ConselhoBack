const { Router } = require('express');
const { createNotificacao, getNotificacoes, getNotificacaoById } = require('../controllers/notificacaoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

// Todas as rotas de notificações requerem autenticação (Zero-Trust)
router.post('/notificacoes', authMiddleware, createNotificacao);
router.get('/notificacoes', authMiddleware, getNotificacoes);
router.get('/notificacoes/:id', authMiddleware, getNotificacaoById);

module.exports = router;
