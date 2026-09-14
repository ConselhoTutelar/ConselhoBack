const { Router } = require('express');
const { getDocumentos } = require('../controllers/documentoController');

const router = Router();

router.get('/documentos', getDocumentos);

module.exports = router;
