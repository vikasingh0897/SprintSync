const { sprintService, employeeService, taskService, notificationService } = require('../services/dataService');
const {
  sendSprintEndedEmail,
  sendSprintNotificationEmail,
  sendSprintCreatedEmail,
} = require('../services/emailService');
const {
  emitSprintCreated,
  emitSprintDeleted,
  emitSprintUpdated,
  emitNotification,
} = require('../sockets/socketHandler');

let isCheckingExpiredSprints = false;

/**
 * Collect unique recipient emails from all employees (with optional admin/sender fallback).
 */
async function getTeamRecipientEmails() {
  const employees = await employeeService.getAll();
  const emails = new Set();

  for (const emp of employees) {
    if (emp && emp.email) {
      emails.add(emp.email.trim().toLowerCase());
    }
  }

  if (emails.size === 0) {
    const fallback = process.env.ADMIN_EMAIL || process.env.BREVO_SENDER_EMAIL || process.env.FROM_EMAIL;
    if (fallback && fallback.includes('@') && !fallback.endsWith('@sprintsync.io')) {
      emails.add(fallback.trim().toLowerCase());
    }
  }

  return Array.from(emails);
}

/**
 * Compute task stats for a sprint from Task collection.
 */
async function getSprintTaskStats(sprintId) {
  const tasks = await taskService.getAll({ sprintId: sprintId.toString() });
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.columnId === 'col-done').length;
  const inProgressTasks = tasks.filter((t) => t.columnId === 'col-inprogress').length;
  return { totalTasks, completedTasks, inProgressTasks };
}

/**
 * Send Sprint Ended summary email via Brevo and record in-app notification.
 */
async function sendEndEmailForSprint(sprint) {
  const sprintId = sprint._id || sprint.id;
  const recipients = await getTeamRecipientEmails();
  const stats = await getSprintTaskStats(sprintId);

  const emailResult = await sendSprintEndedEmail(recipients, sprint, stats);
  await sprintService.update(sprintId, { endNotified: true });

  const notif = await notificationService.create({
    title: `Sprint Ended: ${sprint.name}`,
    message: `"${sprint.name}" is completed (${stats.completedTasks}/${stats.totalTasks} tasks done).${emailResult.success ? ' Summary email sent to team.' : ''}`,
    type: 'sprint_update',
    data: { sprintId, status: 'completed', emailSent: !!emailResult.success },
  });
  emitNotification(notif);

  return { ...emailResult, recipientCount: recipients.length };
}

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
    const { name, goal, startDate, endDate, status, notifyTeam } = req.body;

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

    // ── Email Confirmation to Sprint Creator ──
    const creatorEmail = (
      req.user?.email ||
      process.env.ADMIN_EMAIL ||
      process.env.FROM_EMAIL ||
      process.env.SMTP_USER ||
      ''
    ).trim();
    const creatorName = (req.user?.name || req.user?.email || 'Sprint Lead').trim();
    let creatorEmailResult = null;

    if (creatorEmail && creatorEmail.includes('@') && !creatorEmail.endsWith('@sprintsync.io')) {
      creatorEmailResult = await sendSprintCreatedEmail(creatorEmail, newSprint, creatorName);
      if (creatorEmailResult?.success) {
        console.log(`[SprintController] Sprint creation email sent to creator: ${creatorEmail}`);
      } else {
        console.warn(`[SprintController] Could not send sprint creation email to creator (${creatorEmail}):`, creatorEmailResult?.error);
      }
    }

    // Optionally notify team via email when sprint is created
    let emailResult = null;
    if (notifyTeam) {
      const recipients = await getTeamRecipientEmails();
      const senderName = req.user?.name || req.user?.email || 'SprintSync Admin';
      const title = `New Sprint Started: ${newSprint.name}`;
      const message = newSprint.goal
        ? `Sprint "${newSprint.name}" has been launched. Goal: ${newSprint.goal}`
        : `Sprint "${newSprint.name}" has been created. Head to the Kanban Board to view and pick up tasks.`;
      emailResult = await sendSprintNotificationEmail(recipients, newSprint, title, message, senderName);
    }

    return res.status(201).json({
      success: true,
      data: newSprint,
      creatorEmailSent: !!creatorEmailResult?.success,
      teamEmailSent: emailResult ? !!emailResult.success : undefined,
      emailSent: (creatorEmailResult?.success || emailResult?.success) ? true : false,
      emailProvider: creatorEmailResult?.provider || emailResult?.provider || undefined,
      emailError: creatorEmailResult?.error || emailResult?.error || undefined,
    });
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
    const existing = await sprintService.findById(id);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    const updatePayload = { ...req.body };
    if (updatePayload.status && updatePayload.status !== 'completed' && existing.status === 'completed') {
      updatePayload.endNotified = false;
    }

    const updated = await sprintService.update(id, updatePayload);

    // ── Real-time Socket Broadcast ──
    emitSprintUpdated(updated);

    // Automatically email team via Brevo when sprint transitions to 'completed'
    let emailResult = null;
    if (updated.status === 'completed' && (existing.status !== 'completed' || !existing.endNotified)) {
      emailResult = await sendEndEmailForSprint(updated);
      const refreshed = await sprintService.findById(id);
      return res.json({
        success: true,
        data: refreshed || updated,
        emailSent: !!emailResult.success,
        emailProvider: emailResult.provider || null,
        emailError: emailResult.error || null,
        emailPreviewUrl: emailResult.previewUrl || null,
      });
    }

    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send manual Sprint update / reminder email via Brevo
// @route   POST /api/sprints/:id/notify
// @access  Private
const notifySprint = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message } = req.body || {};

    const sprint = await sprintService.findById(id);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    const recipients = await getTeamRecipientEmails();
    const senderName = req.user?.name || req.user?.email || 'SprintSync Team';

    let emailResult;
    let notifTitle;
    let notifMessage;

    if (sprint.status === 'completed' && !message) {
      emailResult = await sendEndEmailForSprint(sprint);
      return res.json({
        success: true,
        message: emailResult.success
          ? `Sprint summary email sent to ${recipients.length} team member(s).`
          : 'Sprint notification logged, but email delivery failed.',
        recipientCount: recipients.length,
        emailSent: !!emailResult.success,
        emailProvider: emailResult.provider || null,
        emailError: emailResult.error || null,
        emailPreviewUrl: emailResult.previewUrl || null,
      });
    } else {
      notifTitle = (title && title.trim()) || `Sprint Update: ${sprint.name}`;
      notifMessage =
        (message && message.trim()) ||
        `Please review your assigned tasks for "${sprint.name}" on the SprintSync Kanban board.`;

      emailResult = await sendSprintNotificationEmail(
        recipients,
        sprint,
        notifTitle,
        notifMessage,
        senderName
      );

      const notif = await notificationService.create({
        title: notifTitle,
        message: notifMessage,
        type: 'sprint_update',
        data: { sprintId: sprint._id || sprint.id, emailSent: !!emailResult.success },
      });
      emitNotification(notif);
    }

    return res.json({
      success: true,
      message: emailResult.success
        ? `Notification email sent to ${recipients.length} recipient(s).`
        : 'In-app notification created, but email delivery failed.',
      recipientCount: recipients.length,
      emailSent: !!emailResult.success,
      emailProvider: emailResult.provider || null,
      emailError: emailResult.error || null,
      emailPreviewUrl: emailResult.previewUrl || null,
    });
  } catch (error) {
    console.error('[SprintController] Notify error:', error);
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

/**
 * Periodically check for active sprints whose endDate has elapsed
 * and notify team via Brevo once (guarded by endNotified).
 */
async function checkExpiredSprints() {
  if (isCheckingExpiredSprints) return;
  isCheckingExpiredSprints = true;
  try {
    const sprints = await sprintService.getAll();
    const now = new Date();
    for (const sprint of sprints) {
      if (sprint.status === 'active' && sprint.endDate && !sprint.endNotified) {
        const end = new Date(sprint.endDate);
        if (!Number.isNaN(end.getTime()) && end <= now) {
          const sprintId = sprint._id || sprint.id;
          const updated = await sprintService.update(sprintId, { status: 'completed' });
          if (updated) {
            emitSprintUpdated(updated);
            await sendEndEmailForSprint(updated);
            console.log(`🏁 [SprintScheduler] Sprint "${updated.name}" ended automatically; email dispatched.`);
          }
        }
      }
    }
  } catch (err) {
    console.error('[SprintScheduler] Error checking expired sprints:', err.message);
  } finally {
    isCheckingExpiredSprints = false;
  }
}

module.exports = {
  getSprints,
  getActiveSprint,
  createSprint,
  updateSprint,
  deleteSprint,
  notifySprint,
  checkExpiredSprints,
};

