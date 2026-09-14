const { Router } = require('express');
const { createAtendimento, getAtendimentos } = require('../controllers/atendimentoController');

const router = Router();

router.post('/atendimentos', createAtendimento);
router.get('/atendimentos', getAtendimentos);

module.exports = router;
