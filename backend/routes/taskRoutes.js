const router = require('express').Router();
const c = require('../controllers/taskController');
const userIdentification = require('../middleware/userIdentification');
const asyncHandler = require('../middleware/asyncHandler');

router.use(userIdentification);

router.get('/', asyncHandler(c.getTasks));
router.get('/:id', asyncHandler(c.getTask));
router.post('/', asyncHandler(c.createTask));
router.put('/:id', asyncHandler(c.updateTask));
router.patch('/:id/complete', asyncHandler(c.completeTask));
router.patch('/:id/incomplete', asyncHandler(c.incompleteTask));
router.delete('/:id', asyncHandler(c.deleteTask));

module.exports = router;
