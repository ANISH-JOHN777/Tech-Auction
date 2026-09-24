import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api.js';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ['websocket', 'polling'],
});

export function connectSocket() {
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}

export function joinAuctionRoom(challenge) {
  if (challenge) {
    socket.emit('join-auction-room', { challenge });
  }
}
