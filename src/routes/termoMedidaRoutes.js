const { Router } = require('express');
const {
    createTermoMenor,
    getTermosMenor,
    createTermoResponsavel,
    getTermosResponsavel
} = require('../controllers/termoMedidaController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

// Medidas para Criança ou Adolescente
router.post('/termos-medidas-menor', authMiddleware, createTermoMenor);
router.get('/termos-medidas-menor', authMiddleware, getTermosMenor);

// Medidas para Pais ou Responsáveis
router.post('/termos-medidas-responsavel', authMiddleware, createTermoResponsavel);
router.get('/termos-medidas-responsavel', authMiddleware, getTermosResponsavel);

module.exports = router;
