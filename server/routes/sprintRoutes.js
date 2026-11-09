const express = require('express');
const router = express.Router();
const {
  getSprints,
  getActiveSprint,
  createSprint,
  updateSprint,
  deleteSprint,
} = require('../controllers/sprintController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getSprints)
  .post(createSprint);

router.get('/active', getActiveSprint);

router.route('/:id')
  .put(updateSprint)
  .delete(deleteSprint);

module.exports = router;

