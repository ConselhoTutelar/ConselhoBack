const { Router } = require('express');
const { getDocumentos } = require('../controllers/documentoController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = Router();

// Consulta segura de documentos
router.get('/documentos', authMiddleware, getDocumentos);

module.exports = router;
