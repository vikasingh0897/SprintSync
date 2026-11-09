const { sprintService, notificationService } = require('../services/dataService');
const {
  emitSprintCreated,
  emitSprintDeleted,
  emitSprintUpdated,
  emitNotification,
} = require('../sockets/socketHandler');

// @desc    Get all sprints
// @route   GET /api/sprints
// @access  Private
const getSprints = async (req, res) => {
  try {
    const sprints = await sprintService.getAll();
    return res.json({ success: true, count: sprints.length, data: sprints });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get active sprint
// @route   GET /api/sprints/active
// @access  Private
const getActiveSprint = async (req, res) => {
  try {
    const sprint = await sprintService.getActive();
    return res.json({ success: true, data: sprint });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new sprint (Real-time)
// @route   POST /api/sprints
// @access  Private
const createSprint = async (req, res) => {
  try {
    const { name, goal, startDate, endDate, status } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Sprint name is required' });
    }

    const newSprint = await sprintService.create({
      name,
      goal: goal || '',
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: status || 'active',
      createdBy: req.user?.id || null,
    });

    // ── Real-time Socket Broadcast ──
    emitSprintCreated(newSprint);

    // In-app notification
    const notif = await notificationService.create({
      title: 'New Sprint Created',
      message: `"${newSprint.name}" has been created and is now live.`,
      type: 'sprint_update',
      data: { sprintId: newSprint._id },
    });
    emitNotification(notif);

    return res.status(201).json({ success: true, data: newSprint });
  } catch (error) {
    console.error('[SprintController] Create error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update sprint (Real-time)
// @route   PUT /api/sprints/:id
// @access  Private
const updateSprint = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await sprintService.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    // ── Real-time Socket Broadcast ──
    emitSprintUpdated(updated);

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete sprint (Real-time)
// @route   DELETE /api/sprints/:id
// @access  Private
const deleteSprint = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await sprintService.delete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    // ── Real-time Socket Broadcast ──
    emitSprintDeleted(id);

    return res.json({ success: true, message: 'Sprint deleted successfully', id });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSprints,
  getActiveSprint,
  createSprint,
  updateSprint,
  deleteSprint,
};

