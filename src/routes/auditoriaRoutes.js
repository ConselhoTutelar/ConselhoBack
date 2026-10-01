const { Router } = require('express');
const {
    getLogs,
    getIntegridade,
    getEstatisticas
} = require('../controllers/auditoriaController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

const router = Router();

// Todas as rotas de auditoria são estritamente restritas a administradores (Diretoria/Secretaria/Auditores)
router.get('/auditoria', authMiddleware, requireRole('admin'), getLogs);
router.get('/auditoria/integridade', authMiddleware, requireRole('admin'), getIntegridade);
router.get('/auditoria/estatisticas', authMiddleware, requireRole('admin'), getEstatisticas);

module.exports = router;
