const { notificationService } = require('../services/dataService');
const { getDevEmailOutbox } = require('../services/emailService');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const notifications = await notificationService.getAll(userId);
    return res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await notificationService.markRead(id);
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    await notificationService.markAllRead(userId);
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get recent dev email previews (for easy testing without external email access)
// @route   GET /api/notifications/dev-emails
// @access  Public
const getDevEmails = async (req, res) => {
  try {
    const outbox = getDevEmailOutbox();
    return res.json({ success: true, data: outbox });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getDevEmails,
};

