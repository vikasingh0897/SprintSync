let io = null;

function initSocket(socketIoInstance) {
  io = socketIoInstance;

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join user-specific notification room
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`[Socket] Client ${socket.id} joined user:${userId}`);
      }
    });

    // Join sprint room
    socket.on('join_sprint', (sprintId) => {
      if (sprintId) {
        socket.join(`sprint:${sprintId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    console.warn('[Socket] Socket.io not initialized yet.');
  }
  return io;
}

// ── Sprints Real-time Emitters ─────────────────────────────
function emitSprintCreated(sprint) {
  if (io) {
    io.emit('sprint:created', sprint);
    console.log(`[Socket] Broadcast sprint:created: ${sprint.name}`);
  }
}

function emitSprintDeleted(sprintId) {
  if (io) {
    io.emit('sprint:deleted', { id: sprintId });
    console.log(`[Socket] Broadcast sprint:deleted: ${sprintId}`);
  }
}

function emitSprintUpdated(sprint) {
  if (io) {
    io.emit('sprint:updated', sprint);
    console.log(`[Socket] Broadcast sprint:updated: ${sprint.name}`);
  }
}

// ── Employee Real-time Emitters ────────────────────────────
function emitEmployeeCreated(employee) {
  if (io) {
    io.emit('employee:created', employee);
    console.log(`[Socket] Broadcast employee:created: ${employee.name}`);
  }
}

function emitEmployeeConfirmed(employee) {
  if (io) {
    io.emit('employee:confirmed', employee);
    console.log(`[Socket] Broadcast employee:confirmed: ${employee.name}`);
  }
}

function emitEmployeeUpdated(employee) {
  if (io) {
    io.emit('employee:updated', employee);
    console.log(`[Socket] Broadcast employee:updated: ${employee.name}`);
  }
}

function emitEmployeeDeleted(employeeId) {
  if (io) {
    io.emit('employee:deleted', { id: employeeId });
    console.log(`[Socket] Broadcast employee:deleted: ${employeeId}`);
  }
}

// ── Tasks Real-time Emitters ───────────────────────────────
function emitTaskCreated(task) {
  if (io) {
    io.emit('task:created', task);
    console.log(`[Socket] Broadcast task:created: ${task.title}`);
  }
}

function emitTaskMoved(data) {
  if (io) {
    io.emit('task:moved', data);
  }
}

function emitTaskUpdated(task) {
  if (io) {
    io.emit('task:updated', task);
    console.log(`[Socket] Broadcast task:updated: ${task.title}`);
  }
}

function emitTaskDeleted(taskId) {
  if (io) {
    io.emit('task:deleted', { id: taskId });
    console.log(`[Socket] Broadcast task:deleted: ${taskId}`);
  }
}

function emitTaskAssigned(data) {
  if (io) {
    io.emit('task:assigned', data);
    if (data.employee?.userId) {
      io.to(`user:${data.employee.userId}`).emit('notification:new', data);
    }
  }
}

// ── Notifications Emitter ──────────────────────────────────
function emitNotification(notification) {
  if (io) {
    if (notification.recipientId) {
      io.to(`user:${notification.recipientId}`).emit('notification:new', notification);
    }
    // Also broadcast general notification
    io.emit('notification:broadcast', notification);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitSprintCreated,
  emitSprintDeleted,
  emitSprintUpdated,
  emitEmployeeCreated,
  emitEmployeeConfirmed,
  emitEmployeeUpdated,
  emitEmployeeDeleted,
  emitTaskCreated,
  emitTaskMoved,
  emitTaskUpdated,
  emitTaskDeleted,
  emitTaskAssigned,
  emitNotification,
};

