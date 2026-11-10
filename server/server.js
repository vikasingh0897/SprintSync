const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server directory regardless of execution CWD
dotenv.config({ path: path.join(__dirname, '.env') });

const { connectDB } = require('./config/db');
const { initSocket } = require('./sockets/socketHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const sprintRoutes = require('./routes/sprintRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const taskRoutes = require('./routes/taskRoutes');
const boardRoutes = require('./routes/boardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

// Production-ready Socket.io setup (allows onrender.com and custom origins)
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

initSocket(io);

// Connect to MongoDB
connectDB();

// Production-ready CORS middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint (Render uses this to verify service health)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'SprintSync Backend',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Root ping
app.get('/', (req, res) => {
  res.send('⚡ SprintSync Production MERN Backend is running.');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Global error handler
app.use((err, req, res) => {
  console.error('[ServerError]', err.stack || err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`⚡ SprintSync Backend listening on port ${PORT} (0.0.0.0)`);
  console.log(`  🌐 Configured Client origin: ${clientUrl}`);
  console.log(`  📡 WebSocket server active`);
});
