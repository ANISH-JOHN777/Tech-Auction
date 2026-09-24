import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { checkHealth } from './db/postgres.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import auctionRoutes from './routes/auction.routes.js';
import aiRoutes from './routes/ai.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import eventRoutes from './routes/event.routes.js';
import workspaceRoutes from './routes/workspace.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Support reverse proxy for Render / Cloudflare deployment
  app.set('trust proxy', 1);

  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint verifying live PostgreSQL connection
  app.get('/api/health', async (req, res) => {
    const isDbConnected = await checkHealth();
    if (isDbConnected) {
      res.json({
        success: true,
        data: {
          status: 'ok',
          database: 'connected',
        },
      });
    } else {
      res.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_DISCONNECTED',
          message: 'PostgreSQL database connection failed.',
        },
      });
    }
  });

  // Mount API routers
  app.use('/api', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/auction', auctionRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api', submissionRoutes);
  app.use('/api', eventRoutes);
  app.use('/api/workspace', workspaceRoutes);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
