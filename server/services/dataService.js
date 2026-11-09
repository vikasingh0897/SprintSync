const mongoose = require('mongoose');
const User = require('../models/User');
const Sprint = require('../models/Sprint');
const Employee = require('../models/Employee');
const Task = require('../models/Task');
const BoardColumn = require('../models/Column');
const Notification = require('../models/Notification');
const { INITIAL_COLUMNS, INITIAL_EMPLOYEES, INITIAL_TASKS } = require('../seedData');
const bcrypt = require('bcryptjs');

// In-memory fallback stores
let memUsers = [
  {
    _id: 'user-admin-001',
    name: 'Admin User',
    email: 'admin@admin.com',
    passwordHash: bcrypt.hashSync('admin@1234', 10),
    role: 'admin',
    department: 'Management',
    isVerified: true,
  },
];

let memSprints = [
  {
    _id: 'sprint-001',
    name: 'Sprint 14 - Foundation & Core',
    goal: 'Complete real-time sprint & employee collaboration flows with email alerting',
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    status: 'active',
  },
];

let memColumns = INITIAL_COLUMNS.map((c, i) => ({
  _id: `col-${i + 1}`,
  ...c,
}));

let memEmployees = INITIAL_EMPLOYEES.map((e, i) => ({
  _id: `emp-00${i + 1}`,
  ...e,
  confirmationToken: e.status === 'Pending Confirmation' ? 'demo-token-12345' : null,
}));

let memTasks = INITIAL_TASKS.map((t, i) => ({
  _id: `task-00${i + 1}`,
  ...t,
  assigneeId: memEmployees.find((e) => e.name === t.assignee)?._id || null,
  sprintId: 'sprint-001',
  createdAt: new Date(),
}));

let memNotifications = [
  {
    _id: 'notif-001',
    title: 'Welcome to SprintSync',
    message: 'SprintSync real-time workspace is active and ready.',
    type: 'general',
    isRead: false,
    createdAt: new Date(),
  },
];

function isDbActive() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

// ── Sprints ────────────────────────────────────────────────
const sprintService = {
  async getAll() {
    if (isDbActive()) return await Sprint.find().sort({ createdAt: -1 });
    return [...memSprints].reverse();
  },
  async getActive() {
    if (isDbActive()) return await Sprint.findOne({ status: 'active' });
    return memSprints.find((s) => s.status === 'active') || memSprints[0] || null;
  },
  async create(data) {
    if (isDbActive()) return await Sprint.create(data);
    const newSprint = {
      _id: `sprint-${Date.now()}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (newSprint.status === 'active') {
      memSprints.forEach((s) => (s.status = 'planning'));
    }
    memSprints.push(newSprint);
    return newSprint;
  },
  async update(id, data) {
    if (isDbActive()) {
      if (data.status === 'active') {
        await Sprint.updateMany({ _id: { $ne: id } }, { status: 'planning' });
      }
      return await Sprint.findByIdAndUpdate(id, data, { new: true });
    }
    const idx = memSprints.findIndex((s) => s._id.toString() === id.toString());
    if (idx === -1) return null;
    if (data.status === 'active') {
      memSprints.forEach((s) => (s.status = 'planning'));
    }
    memSprints[idx] = { ...memSprints[idx], ...data, updatedAt: new Date() };
    return memSprints[idx];
  },
  async delete(id) {
    if (isDbActive()) {
      return await Sprint.findByIdAndDelete(id);
    }
    const idx = memSprints.findIndex((s) => s._id.toString() === id.toString());
    if (idx === -1) return null;
    const removed = memSprints.splice(idx, 1)[0];
    return removed;
  },
};

// ── Employees ──────────────────────────────────────────────
const employeeService = {
  async getAll() {
    if (isDbActive()) return await Employee.find().sort({ createdAt: -1 });
    return [...memEmployees];
  },
  async findByEmail(email) {
    if (isDbActive()) return await Employee.findOne({ email: email.toLowerCase() });
    return memEmployees.find((e) => e.email.toLowerCase() === email.toLowerCase());
  },
  async findByToken(token) {
    if (isDbActive()) return await Employee.findOne({ confirmationToken: token });
    return memEmployees.find((e) => e.confirmationToken === token);
  },
  async findById(id) {
    if (isDbActive()) return await Employee.findById(id);
    return memEmployees.find((e) => e._id.toString() === id.toString());
  },
  async create(data) {
    if (isDbActive()) return await Employee.create(data);
    const newEmp = {
      _id: `emp-${Date.now()}`,
      tasksCompleted: 0,
      tasksInProgress: 0,
      tasksPending: 0,
      completionRate: 0,
      avgScore: 85,
      joinedDate: new Date().toISOString().split('T')[0],
      ...data,
      createdAt: new Date(),
    };
    memEmployees.unshift(newEmp);
    return newEmp;
  },
  async update(id, data) {
    if (isDbActive()) return await Employee.findByIdAndUpdate(id, data, { new: true });
    const idx = memEmployees.findIndex((e) => e._id.toString() === id.toString());
    if (idx === -1) return null;
    memEmployees[idx] = { ...memEmployees[idx], ...data, updatedAt: new Date() };
    return memEmployees[idx];
  },
  async delete(id) {
    if (isDbActive()) return await Employee.findByIdAndDelete(id);
    const idx = memEmployees.findIndex((e) => e._id.toString() === id.toString());
    if (idx === -1) return null;
    return memEmployees.splice(idx, 1)[0];
  },
};

// ── Tasks ──────────────────────────────────────────────────
const taskService = {
  async getAll(filter = {}) {
    if (isDbActive()) return await Task.find(filter).sort({ order: 1, createdAt: -1 });
    let tasks = [...memTasks];
    if (filter.sprintId) tasks = tasks.filter((t) => t.sprintId === filter.sprintId);
    if (filter.columnId) tasks = tasks.filter((t) => t.columnId === filter.columnId);
    return tasks;
  },
  async findById(id) {
    if (isDbActive()) return await Task.findById(id);
    return memTasks.find((t) => t._id.toString() === id.toString());
  },
  async create(data) {
    if (isDbActive()) return await Task.create(data);
    const newTask = {
      _id: `task-${Date.now()}`,
      order: 0,
      storyPoints: 3,
      category: 'Feature',
      ...data,
      createdAt: new Date(),
    };
    memTasks.unshift(newTask);
    return newTask;
  },
  async update(id, data) {
    if (isDbActive()) return await Task.findByIdAndUpdate(id, data, { new: true });
    const idx = memTasks.findIndex((t) => t._id.toString() === id.toString());
    if (idx === -1) return null;
    memTasks[idx] = { ...memTasks[idx], ...data, updatedAt: new Date() };
    return memTasks[idx];
  },
  async delete(id) {
    if (isDbActive()) return await Task.findByIdAndDelete(id);
    const idx = memTasks.findIndex((t) => t._id.toString() === id.toString());
    if (idx === -1) return null;
    return memTasks.splice(idx, 1)[0];
  },
};

// ── Columns ────────────────────────────────────────────────
const columnService = {
  async getAll() {
    if (isDbActive()) return await BoardColumn.find().sort({ order: 1 });
    return [...memColumns];
  },
  async create(data) {
    if (isDbActive()) return await BoardColumn.create(data);
    const newCol = {
      _id: `col-${Date.now()}`,
      ...data,
    };
    memColumns.push(newCol);
    return newCol;
  },
  async update(id, data) {
    if (isDbActive()) return await BoardColumn.findOneAndUpdate({ columnId: id }, data, { new: true });
    const idx = memColumns.findIndex((c) => c.columnId === id || c._id === id);
    if (idx === -1) return null;
    memColumns[idx] = { ...memColumns[idx], ...data };
    return memColumns[idx];
  },
  async delete(id) {
    if (isDbActive()) return await BoardColumn.findOneAndDelete({ columnId: id });
    const idx = memColumns.findIndex((c) => c.columnId === id || c._id === id);
    if (idx === -1) return null;
    return memColumns.splice(idx, 1)[0];
  },
};

// ── Users ──────────────────────────────────────────────────
const userService = {
  async findByEmail(email) {
    if (isDbActive()) return await User.findOne({ email: email.toLowerCase() }).select('+password');
    return memUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },
  async findById(id) {
    if (isDbActive()) return await User.findById(id).select('-password');
    const u = memUsers.find((u) => u._id.toString() === id.toString());
    if (!u) return null;
    const { passwordHash, ...safeUser } = u;
    return safeUser;
  },
  async create(data) {
    if (isDbActive()) return await User.create(data);
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(data.password, salt);
    const newUser = {
      _id: `user-${Date.now()}`,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: hash,
      role: data.role || 'employee',
      department: data.department || 'General',
      isVerified: true,
      createdAt: new Date(),
    };
    memUsers.push(newUser);
    const { passwordHash, ...safeUser } = newUser;
    return safeUser;
  },
  async verifyPassword(user, password) {
    if (isDbActive() && user.matchPassword) {
      return await user.matchPassword(password);
    }
    return bcrypt.compareSync(password, user.passwordHash || user.password);
  },
};

// ── Notifications ──────────────────────────────────────────
const notificationService = {
  async getAll(recipientId) {
    if (isDbActive()) {
      return await Notification.find({
        $or: [{ recipientId }, { recipientId: null }],
      }).sort({ createdAt: -1 }).limit(30);
    }
    return memNotifications.filter((n) => !n.recipientId || n.recipientId === recipientId);
  },
  async create(data) {
    if (isDbActive()) return await Notification.create(data);
    const newNotif = {
      _id: `notif-${Date.now()}`,
      isRead: false,
      ...data,
      createdAt: new Date(),
    };
    memNotifications.unshift(newNotif);
    if (memNotifications.length > 50) memNotifications.pop();
    return newNotif;
  },
  async markRead(id) {
    if (isDbActive()) return await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    const notif = memNotifications.find((n) => n._id.toString() === id.toString());
    if (notif) notif.isRead = true;
    return notif;
  },
  async markAllRead(recipientId) {
    if (isDbActive()) {
      return await Notification.updateMany(
        { $or: [{ recipientId }, { recipientId: null }] },
        { isRead: true }
      );
    }
    memNotifications.forEach((n) => {
      if (!n.recipientId || n.recipientId === recipientId) n.isRead = true;
    });
    return { success: true };
  },
};

module.exports = {
  sprintService,
  employeeService,
  taskService,
  columnService,
  userService,
  notificationService,
  isDbActive,
};

