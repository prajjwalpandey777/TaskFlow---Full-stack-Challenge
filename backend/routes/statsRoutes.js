const router = require('express').Router();
const { getStats } = require('../controllers/taskController');
const userIdentification = require('../middleware/userIdentification');
const asyncHandler = require('../middleware/asyncHandler');
router.use(userIdentification);
router.get('/', asyncHandler(getStats));
module.exports = router;
