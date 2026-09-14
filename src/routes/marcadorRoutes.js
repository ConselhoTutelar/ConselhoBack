const { Router } = require('express');
const { getMarcadores, createMarcador } = require('../controllers/marcadorController');

const router = Router();

router.get('/marcadores-mapa', getMarcadores);
router.post('/marcadores-mapa', createMarcador);

module.exports = router;
