const { Router } = require('express');
const {
    getConselheiros,
    getConselheiroById,
    createConselheiro,
    updateConselheiro,
    deleteConselheiro
} = require('../controllers/conselheiroController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

const router = Router();

// Consulta de profissionais permitida para usuários autenticados
router.get('/conselheiros', authMiddleware, getConselheiros);
router.get('/conselheiros/:id', authMiddleware, getConselheiroById);

// Gestão de profissionais (Cadastro, Edição e Exclusão) restrita para papel 'admin' (Secretário/Diretor)
router.post('/conselheiros', authMiddleware, requireRole('admin'), createConselheiro);
router.put('/conselheiros/:id', authMiddleware, requireRole('admin'), updateConselheiro);
router.delete('/conselheiros/:id', authMiddleware, requireRole('admin'), deleteConselheiro);

module.exports = router;
