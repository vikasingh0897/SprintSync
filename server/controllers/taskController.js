const { taskService, employeeService, notificationService, sprintService } = require('../services/dataService');
const { sendTaskAssignmentEmail } = require('../services/emailService');
const {
  emitTaskCreated,
  emitTaskMoved,
  emitTaskUpdated,
  emitTaskDeleted,
  emitTaskAssigned,
  emitNotification,
} = require('../sockets/socketHandler');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    const { sprintId, columnId } = req.query;
    const filter = {};
    if (sprintId) filter.sprintId = sprintId;
    if (columnId) filter.columnId = columnId;

    const tasks = await taskService.getAll(filter);
    return res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new task (Real-time with Email Alert on assignment)
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      assignee,
      assigneeId,
      columnId,
      category,
      dueDate,
      storyPoints,
      sprintId,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    // Default to active sprint if not passed
    let activeSprintId = sprintId;
    if (!activeSprintId) {
      const activeSprint = await sprintService.getActive();
      activeSprintId = activeSprint ? activeSprint._id : null;
    }

    // Resolve assignee details if assigneeId is given
    let resolvedAssignee = assignee;
    let employee = null;
    if (assigneeId) {
      employee = await employeeService.findById(assigneeId);
      if (employee) {
        resolvedAssignee = employee.name;
      }
    } else if (assignee) {
      const allEmployees = await employeeService.getAll();
      employee = allEmployees.find(e => e.name.toLowerCase() === assignee.toLowerCase());
    }

    const newTask = await taskService.create({
      title: title.trim(),
      description: description || '',
      priority: priority || 'Medium',
      assignee: resolvedAssignee || null,
      assigneeId: employee ? (employee._id || employee.id) : (assigneeId || null),
      columnId: columnId || 'col-backlog',
      category: category || 'Feature',
      dueDate: dueDate || null,
      storyPoints: storyPoints ? Number(storyPoints) : 3,
      sprintId: activeSprintId,
      createdBy: req.user?.id || null,
    });

    // ── Email & Real-time Alert for Task Assignment ──
    let emailAlertSent = false;
    let emailPreviewUrl = null;

    if (employee && employee.email) {
      try {
        const assignorName = req.user?.name || 'Workspace Lead';
        const emailResult = await sendTaskAssignmentEmail(employee, newTask, assignorName);
        emailAlertSent = emailResult.success;
        emailPreviewUrl = emailResult.previewUrl || null;

        // In-app Notification for assigned user
        const notif = await notificationService.create({
          recipientId: employee.userId || employee._id,
          recipientEmail: employee.email,
          title: `Task Assigned: ${newTask.title}`,
          message: `${assignorName} assigned you to "${newTask.title}" [${newTask.priority} Priority].`,
          type: 'task_assigned',
          data: { taskId: newTask._id, priority: newTask.priority },
        });
        emitNotification(notif);

        // Socket event for real-time task assignment alert
        emitTaskAssigned({ task: newTask, employee, assignorName });
      } catch (emailErr) {
        console.error('[TaskController] Failed to dispatch task assignment email:', emailErr.message);
      }
    }

    // Socket event for new task added to board
    emitTaskCreated(newTask);

    return res.status(201).json({
      success: true,
      data: newTask,
      emailAlertSent,
      emailPreviewUrl,
    });
  } catch (error) {
    console.error('[TaskController] Create error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update task (Real-time with Email Alert if newly assigned/reassigned)
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await taskService.findById(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const previousAssigneeId = existing.assigneeId;
    const updated = await taskService.update(id, req.body);

    // Check if assignee has changed or was newly assigned
    if (
      req.body.assigneeId &&
      req.body.assigneeId !== previousAssigneeId
    ) {
      const employee = await employeeService.findById(req.body.assigneeId);
      if (employee && employee.email) {
        try {
          const assignorName = req.user?.name || 'Workspace Lead';
          await sendTaskAssignmentEmail(employee, updated, assignorName);

          const notif = await notificationService.create({
            recipientId: employee.userId || employee._id,
            recipientEmail: employee.email,
            title: `Task Assigned: ${updated.title}`,
            message: `${assignorName} assigned you to "${updated.title}".`,
            type: 'task_assigned',
            data: { taskId: updated._id },
          });
          emitNotification(notif);

          emitTaskAssigned({ task: updated, employee, assignorName });
        } catch (emailErr) {
          console.error('[TaskController] Failed to dispatch task update assignment email:', emailErr.message);
        }
      }
    }

    // Broadcast update to all board clients
    emitTaskUpdated(updated);

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Move task across columns / order (Real-time Kanban Drag-and-Drop)
// @route   PATCH /api/tasks/:id/move
// @access  Private
const moveTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { columnId, order } = req.body;

    const updated = await taskService.update(id, {
      columnId,
      order: order !== undefined ? order : 0,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Real-time broadcast for smooth instant multi-client board sync
    emitTaskMoved({ id, columnId, order });

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete task (Real-time)
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await taskService.delete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    emitTaskDeleted(id);

    return res.json({ success: true, message: 'Task deleted successfully', id });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  moveTask,
  deleteTask,
};

