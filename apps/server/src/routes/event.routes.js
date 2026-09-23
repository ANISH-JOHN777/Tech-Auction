import { Router } from 'express';
import { requireAuth, requireAdminAuth } from '../middleware/auth.js';
import {
  postHeartbeat,
  postViolation,
  getViolations,
  patchViolationStatus,
  patchTeamStatus,
  postEventState,
  getEventSummary,
  getAuditLogs,
} from '../controllers/event.controller.js';

const router = Router();

// Student Event Activity Endpoints
router.post('/event/heartbeat', requireAuth, postHeartbeat);
router.post('/event/violation', requireAuth, postViolation);
router.get('/event/summary', getEventSummary);

// Admin Event & Anti-Malpractice Endpoints
router.post('/admin/event/state', requireAdminAuth, postEventState);
router.get('/admin/violations', requireAdminAuth, getViolations);
router.patch('/admin/violations/:id', requireAdminAuth, patchViolationStatus);
router.patch('/admin/teams/:id/status', requireAdminAuth, patchTeamStatus);
router.get('/admin/event/audit', requireAdminAuth, getAuditLogs);

export default router;
