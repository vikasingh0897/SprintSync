const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { employeeService, userService, notificationService } = require('../services/dataService');
const { sendEmployeeInviteEmail } = require('../services/emailService');
const {
  emitEmployeeCreated,
  emitEmployeeConfirmed,
  emitEmployeeUpdated,
  emitEmployeeDeleted,
  emitNotification,
} = require('../sockets/socketHandler');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    process.env.JWT_SECRET || 'sprintsync_super_secret_jwt_key_2026_production_ready',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private
const getEmployees = async (req, res) => {
  try {
    const employees = await employeeService.getAll();
    return res.json({ success: true, count: employees.length, data: employees });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Invite / Set up employee with email confirmation (Real-time)
// @route   POST /api/employees/invite
// @access  Private
const inviteEmployee = async (req, res) => {
  try {
    const { name, email, role, department, avatarColor } = req.body;

    if (!name || !email || !role || !department) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, role, and department',
      });
    }

    const existingEmp = await employeeService.findByEmail(email);
    if (existingEmp) {
      return res.status(400).json({
        success: false,
        message: 'An employee with this email already exists',
      });
    }

    // Generate secure confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const confirmationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Generate initials
    const parts = name.trim().split(' ');
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();

    // Default avatar colors
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];
    const chosenColor = avatarColor || colors[Math.floor(Math.random() * colors.length)];

    const newEmployee = await employeeService.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role.trim(),
      department: department.trim(),
      avatarColor: chosenColor,
      initials,
      status: 'Pending Confirmation',
      confirmationToken,
      confirmationExpires,
    });

    // Send confirmation invitation email
    const emailResult = await sendEmployeeInviteEmail(newEmployee, confirmationToken);

    // Real-time WebSocket event
    emitEmployeeCreated(newEmployee);

    // Create in-app notification
    const notif = await notificationService.create({
      title: 'Employee Invited',
      message: `${newEmployee.name} (${newEmployee.role}) was invited to the team. Confirmation email dispatched.`,
      type: 'employee_invite',
      data: { employeeId: newEmployee._id, email: newEmployee.email },
    });
    emitNotification(notif);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const confirmationLink = `${clientUrl}/confirm-employee?token=${confirmationToken}&email=${encodeURIComponent(newEmployee.email)}`;

    return res.status(201).json({
      success: true,
      message: 'Employee invited successfully and confirmation email sent.',
      data: newEmployee,
      confirmationLink,
      emailPreviewUrl: emailResult.previewUrl || null,
    });
  } catch (error) {
    console.error('[EmployeeController] Invite error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify invitation token
// @route   GET /api/employees/verify-invite
// @access  Public
const verifyInviteToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Confirmation token is required' });
    }

    const employee = await employeeService.findByToken(token);
    if (!employee) {
      return res.status(400).json({ success: false, message: 'Invalid or expired confirmation token' });
    }

    if (employee.confirmationExpires && new Date(employee.confirmationExpires) < new Date()) {
      return res.status(400).json({ success: false, message: 'Confirmation link has expired. Please ask for a new invite.' });
    }

    return res.json({
      success: true,
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Confirm invite and set password (Real-time activation)
// @route   POST /api/employees/confirm-invite
// @access  Public
const confirmInvite = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const employee = await employeeService.findByToken(token);
    if (!employee) {
      return res.status(400).json({ success: false, message: 'Invalid or expired confirmation token' });
    }

    // Check if user already exists or create new user
    let user = await userService.findByEmail(employee.email);
    if (!user) {
      user = await userService.create({
        name: employee.name,
        email: employee.email,
        password,
        role: 'employee',
        department: employee.department,
      });
    }

    // Update employee status to Active
    const updatedEmployee = await employeeService.update(employee._id, {
      status: 'Active',
      confirmationToken: null,
      confirmationExpires: null,
      userId: user._id,
    });

    // Real-time broadcast: employee confirmed
    emitEmployeeConfirmed(updatedEmployee);

    // In-app notification
    const notif = await notificationService.create({
      title: 'Account Activated',
      message: `${employee.name} has confirmed their email and joined the team!`,
      type: 'employee_confirmed',
      data: { employeeId: employee._id },
    });
    emitNotification(notif);

    const authToken = generateToken(user);

    return res.json({
      success: true,
      message: 'Account successfully confirmed and activated!',
      token: authToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('[EmployeeController] Confirm error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Resend confirmation email
// @route   POST /api/employees/:id/resend-confirmation
// @access  Private
const resendConfirmation = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await employeeService.findById(id);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const confirmationExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const updated = await employeeService.update(id, {
      confirmationToken,
      confirmationExpires,
    });

    const emailResult = await sendEmployeeInviteEmail(updated, confirmationToken);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const confirmationLink = `${clientUrl}/confirm-employee?token=${confirmationToken}&email=${encodeURIComponent(updated.email)}`;

    return res.json({
      success: true,
      message: 'Confirmation email resent successfully',
      confirmationLink,
      emailPreviewUrl: emailResult.previewUrl || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await employeeService.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    emitEmployeeUpdated(updated);
    return res.json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await employeeService.delete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    emitEmployeeDeleted(id);
    return res.json({ success: true, message: 'Employee removed successfully', id });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEmployees,
  inviteEmployee,
  verifyInviteToken,
  confirmInvite,
  resendConfirmation,
  updateEmployee,
  deleteEmployee,
};

