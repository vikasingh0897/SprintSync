const mongoose = require('mongoose');
const User = require('../models/User');
const BoardColumn = require('../models/Column');
const { INITIAL_COLUMNS } = require('../seedData');

let isConnected = false;

async function seedInitialData() {
  try {
    // 1. Ensure Admin User exists
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
      console.log('[Seed] Admin user ready: admin@admin.com / admin@1234');
    }

    // 2. Ensure default empty Kanban workflow columns exist
    const columnCount = await BoardColumn.countDocuments();
    if (columnCount === 0) {
      await BoardColumn.insertMany(INITIAL_COLUMNS);
      console.log('[Seed] Default empty board columns initialized.');
    }
  } catch (err) {
    console.error('[Seed] Error during initialization:', err.message);
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
    console.warn('[MongoDB] To persist permanently across restarts, configure MONGODB_URI in server/.env.');
    isConnected = false;
  }
}

module.exports = { connectDB, isMongoConnected: () => isConnected, seedInitialData };
