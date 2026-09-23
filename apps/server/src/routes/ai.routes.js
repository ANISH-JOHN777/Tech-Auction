import { Router } from 'express';
import {
  getStatus,
  startAI,
  stopAI,
  chatAI,
  listAdminSessions,
  revokeAdminSession,
} from '../controllers/ai.controller.js';
import { requireAuth, requireAdminAuth } from '../middleware/auth.js';
import { eventGuard } from '../middleware/eventGuard.js';

const router = Router();

// Student endpoints
router.get('/status', requireAuth, getStatus);
router.post('/start', requireAuth, eventGuard({ requireLive: true, requireActiveTeam: true }), startAI);
router.post('/stop', requireAuth, stopAI);
router.post('/chat', requireAuth, eventGuard({ requireLive: true, requireActiveTeam: true }), chatAI);

// Admin monitoring endpoints
router.get('/admin/sessions', requireAdminAuth, listAdminSessions);
router.post('/admin/revoke/:id', requireAdminAuth, revokeAdminSession);

export default router;

