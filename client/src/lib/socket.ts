import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from './api';

let socket: Socket | null = null;
let currentSocketUrl: string = '';

export const getSocket = (): Socket => {
  const targetUrl = getSocketUrl();

  // If socket already exists for this URL, reuse it
  if (socket && currentSocketUrl === targetUrl) {
    return socket;
  }

  // Disconnect existing socket if targetUrl changed
  if (socket) {
    try {
      socket.disconnect();
    } catch {}
    socket = null;
  }

  currentSocketUrl = targetUrl;
  socket = io(targetUrl, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log(`📡 Connected to SprintSync Real-Time WebSocket at ${targetUrl}`);
    // Re-join user room if token is present
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('ss_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user.id) socket?.emit('join', user.id);
        } catch {}
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('📡 Disconnected from WebSocket server:', reason);
  });

  socket.on('connect_error', (error) => {
    console.warn(`📡 WebSocket connection error (${targetUrl}):`, error.message);
  });

  return socket;
};

export const resetSocket = () => {
  if (socket) {
    try {
      socket.disconnect();
    } catch {}
    socket = null;
    currentSocketUrl = '';
  }
};

export const joinUserRoom = (userId: string) => {
  const s = getSocket();
  if (s.connected) {
    s.emit('join', userId);
  } else {
    s.once('connect', () => {
      s.emit('join', userId);
    });
  }
};
