let ioInstance = null;

export function initializeAuctionSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    socket.on('join-auction-room', ({ challenge, track }) => {
      const selectedTrack = track || challenge;
      if (['full-stack', 'cybersecurity'].includes(selectedTrack)) {
        const roomName = `room_${selectedTrack}`;
        socket.join(roomName);
        console.log(`[SOCKET] Socket ${socket.id} joined ${roomName}`);
      }
    });

    socket.on('leave-auction-room', ({ track }) => {
      if (track) {
        socket.leave(`room_${track}`);
      }
    });
  });
}

export function broadcastAuctionEvent(track, eventName, data) {
  if (ioInstance && ['full-stack', 'cybersecurity'].includes(track)) {
    const roomName = `room_${track}`;
    ioInstance.to(roomName).emit(eventName, data);
  }
}
