const { Router } = require('express');
const { getConselheiros } = require('../controllers/conselheiroController');

const router = Router();

router.get('/conselheiros', getConselheiros);

module.exports = router;
