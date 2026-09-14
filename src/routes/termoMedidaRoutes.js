const { Router } = require('express');
const {
    createTermoMenor,
    getTermosMenor,
    createTermoResponsavel,
    getTermosResponsavel
} = require('../controllers/termoMedidaController');

const router = Router();

router.post('/termos-medidas-menor', createTermoMenor);
router.get('/termos-medidas-menor', getTermosMenor);

router.post('/termos-medidas-responsavel', createTermoResponsavel);
router.get('/termos-medidas-responsavel', getTermosResponsavel);

module.exports = router;
