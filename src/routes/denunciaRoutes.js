const { Router } = require('express');
const { createDenuncia, getDenuncias } = require('../controllers/denunciaController');

const router = Router();

router.post('/denuncias', createDenuncia);
router.get('/denuncias', getDenuncias);

module.exports = router;
