const express = require('express');
const router = express.Router();
const {
  getBoard,
  addColumn,
  updateColumn,
  deleteColumn,
} = require('../controllers/boardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getBoard);
router.post('/columns', addColumn);
router.route('/columns/:id')
  .put(updateColumn)
  .delete(deleteColumn);

module.exports = router;

