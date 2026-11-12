const router = require('express').Router();
const { getStats } = require('../controllers/taskController');
router.get('/', getStats);
module.exports = router;
