const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getAll, getSummary, getById } = require('../controllers/analysis.controller');

router.use(authenticate);
router.get('/stats/summary', getSummary);   // must be before /:id
router.get('/', getAll);
router.get('/:id', getById);

module.exports = router;