import { io } from 'socket.io-client';

const API_BASE_URL = 'http://localhost:4000';

export const socket = io(API_BASE_URL, {
  autoConnect: false,
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
