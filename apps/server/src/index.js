import http from 'http';
import { Server } from 'socket.io';
import { config, validateEnv } from './config/env.js';
import { initDb, checkHealth } from './db/database.js';
import { createApp } from './app.js';
import { initializeAuctionSocket } from './socket/auction.socket.js';
import { initializeTimerScheduler } from './services/timerScheduler.service.js';

async function startServer() {
  try {
    // 1. Validate environment configuration
    validateEnv();

    // 2. Initialize PostgreSQL Database Singleton & Migrations
    await initDb();
    console.log('[DB] PostgreSQL connected');

    // 3. Verify PostgreSQL schema health
    const healthy = await checkHealth();
    if (!healthy) {
      throw new Error('Database ping failed after migration.');
    }
    console.log('[DB] Schema verified');

    // 4. Initialize Timer Scheduler to recover active auction timers
    await initializeTimerScheduler();
    console.log('[AUCTION] Scheduler initialized');

    // 5. Create Express application & HTTP server
    const app = createApp();
    const server = http.createServer(app);

    // 6. Initialize Socket.IO Server
    const io = new Server(server, {
      cors: {
        origin: config.clientOrigin,
        methods: ['GET', 'POST'],
      },
    });

    // 7. Setup Socket events & rooms
    initializeAuctionSocket(io);
    console.log('[SOCKET] Socket.IO initialized');

    // 8. Start HTTP server binding explicitly to 0.0.0.0 (Render requirement)
    const PORT = process.env.PORT || config.port;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] Listening on 0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('[FATAL] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
