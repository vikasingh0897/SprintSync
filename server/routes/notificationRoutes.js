const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getDevEmails,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// Public dev email inspection endpoint
router.get('/dev-emails', getDevEmails);

router.use(protect);
router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);

module.exports = router;

