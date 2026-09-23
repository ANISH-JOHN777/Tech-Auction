import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import auctionRoutes from './routes/auction.routes.js';
import aiRoutes from './routes/ai.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import eventRoutes from './routes/event.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
  });

  // Mount API routers
  app.use('/api', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/auction', auctionRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api', submissionRoutes);
  app.use('/api', eventRoutes);


  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
