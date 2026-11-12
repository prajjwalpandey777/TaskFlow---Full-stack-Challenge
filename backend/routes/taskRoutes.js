const router = require('express').Router();
const c = require('../controllers/taskController');

router.get('/', c.getTasks);
router.get('/:id', c.getTask);
router.post('/', c.createTask);
router.put('/:id', c.updateTask);
router.patch('/:id/complete', c.completeTask);
router.patch('/:id/incomplete', c.incompleteTask);
router.delete('/:id', c.deleteTask);

module.exports = router;
