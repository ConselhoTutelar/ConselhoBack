const { Router } = require('express');
const { getRoot, testDb } = require('../controllers/indexController');

const router = Router();

router.get('/', getRoot);
router.get('/test-db', testDb);

module.exports = router;
