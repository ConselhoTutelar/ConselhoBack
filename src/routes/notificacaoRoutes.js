const { Router } = require('express');
const { createNotificacao, getNotificacoes } = require('../controllers/notificacaoController');

const router = Router();

router.post('/notificacoes', createNotificacao);
router.get('/notificacoes', getNotificacoes);

module.exports = router;
