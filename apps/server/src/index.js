import http from 'http';
import { Server } from 'socket.io';
import { config } from './config/env.js';
import { initDb } from './db/database.js';
import { createApp } from './app.js';
import { initializeAuctionSocket } from './socket/auction.socket.js';
import { initializeTimerScheduler } from './services/timerScheduler.service.js';

async function startServer() {
  try {
    // Initialize SQLite Database Singleton & Schema
    await initDb();
    console.log('[DB] SQLite Database initialized successfully.');

    // Initialize Timer Scheduler to recover active auction timers
    await initializeTimerScheduler();

    // Create Express application
    const app = createApp();
    const server = http.createServer(app);

    // Initialize Socket.IO Server
    const io = new Server(server, {
      cors: {
        origin: config.clientOrigin,
        methods: ['GET', 'POST'],
      },
    });

    // Setup Socket events & rooms
    initializeAuctionSocket(io);

    // Start HTTP server
    server.listen(config.port, () => {
      console.log(`[SERVER] Tech Auction Server running on http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('[FATAL] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
