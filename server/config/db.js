const mongoose = require('mongoose');
const User = require('../models/User');
const Sprint = require('../models/Sprint');
const Employee = require('../models/Employee');
const Task = require('../models/Task');
const BoardColumn = require('../models/Column');
const { INITIAL_COLUMNS, INITIAL_EMPLOYEES, INITIAL_TASKS } = require('../seedData');

let isConnected = false;

async function seedInitialData() {
  try {
    // 1. Seed Admin User
    const adminExists = await User.findOne({ email: 'admin@admin.com' });
    if (!adminExists) {
      await User.create({
        name: 'Admin User',
        email: 'admin@admin.com',
        password: 'admin@1234',
        role: 'admin',
        department: 'Management',
        isVerified: true,
      });
      console.log('[Seed] Admin user seeded: admin@admin.com / admin@1234');
    }

    // 2. Seed Default Sprint
    let activeSprint = await Sprint.findOne({ status: 'active' });
    if (!activeSprint) {
      activeSprint = await Sprint.create({
        name: 'Sprint 14 - Foundation & Core',
        goal: 'Complete real-time sprint & employee collaboration flows with email alerting',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'active',
      });
      console.log('[Seed] Active sprint seeded:', activeSprint.name);
    }

    // 3. Seed Columns
    const columnCount = await BoardColumn.countDocuments();
    if (columnCount === 0) {
      await BoardColumn.insertMany(INITIAL_COLUMNS);
      console.log('[Seed] Default board columns seeded.');
    }

    // 4. Seed Employees
    const employeeCount = await Employee.countDocuments();
    let seededEmployees = [];
    if (employeeCount === 0) {
      seededEmployees = await Employee.insertMany(INITIAL_EMPLOYEES);
      console.log(`[Seed] ${seededEmployees.length} default employees seeded.`);
    } else {
      seededEmployees = await Employee.find();
    }

    // 5. Seed Tasks
    const taskCount = await Task.countDocuments();
    if (taskCount === 0) {
      const tasksWithRefs = INITIAL_TASKS.map((t) => {
        const matchingEmp = seededEmployees.find((e) => e.name === t.assignee);
        return {
          ...t,
          assigneeId: matchingEmp ? matchingEmp._id.toString() : null,
          sprintId: activeSprint ? activeSprint._id : null,
        };
      });
      await Task.insertMany(tasksWithRefs);
      console.log(`[Seed] ${tasksWithRefs.length} initial tasks seeded.`);
    }
  } catch (err) {
    console.error('[Seed] Error during seeding:', err.message);
  }
}

async function connectDB() {
  mongoose.set('bufferCommands', false);
  let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sprintsync';

  // Ensure database name is present for MongoDB Atlas URIs ending with / or .net
  if (uri.startsWith('mongodb+srv://')) {
    if (uri.endsWith('.mongodb.net/')) {
      uri = uri + 'sprintsync?retryWrites=true&w=majority';
    } else if (uri.endsWith('.mongodb.net')) {
      uri = uri + '/sprintsync?retryWrites=true&w=majority';
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    await seedInitialData();
  } catch (error) {
    console.warn(`[MongoDB] Connection warning (${error.message}).`);
    console.warn('[MongoDB] Running with in-memory state engine fallback so server functions without crashing.');
    console.warn('[MongoDB] To persist permanently across restarts, configure MONGODB_URI in server/.env (e.g. MongoDB Atlas or local mongod).');
    isConnected = false;
  }
}

module.exports = { connectDB, isMongoConnected: () => isConnected, seedInitialData };

