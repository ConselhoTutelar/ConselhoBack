const { Router } = require('express');
const { getMarcadores, createMarcador, geocodificar } = require('../controllers/marcadorController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

// Rotas de marcadores protegidas
router.get('/marcadores-mapa', authMiddleware, getMarcadores);
router.post('/marcadores-mapa', authMiddleware, createMarcador);
router.post('/marcadores-mapa/geocodificar', authMiddleware, geocodificar);

module.exports = router;
