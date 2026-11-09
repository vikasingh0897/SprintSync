import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('📡 Connected to SprintSync Real-Time WebSocket server');
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
      console.warn('📡 WebSocket connection error:', error.message);
    });
  }

  return socket;
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

