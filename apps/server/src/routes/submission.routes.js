import { Router } from 'express';
import {
  getStudentSubmission,
  postStudentSubmission,
  fetchPublicLeaderboard,
  fetchEventSettings,
  listAdminSubmissions,
  showAdminSubmission,
  evaluateAdminSubmission,
  reopenAdminSubmission,
  fetchAdminLeaderboard,
  updateAdminEventSetting,
} from '../controllers/submission.controller.js';
import { requireAuth, requireAdminAuth } from '../middleware/auth.js';
import { eventGuard } from '../middleware/eventGuard.js';

const router = Router();

// Student Endpoints
router.get('/submission', requireAuth, getStudentSubmission);
router.post('/submission', requireAuth, eventGuard({ requireLive: true, requireActiveTeam: true }), postStudentSubmission);
router.get('/leaderboard', fetchPublicLeaderboard);
router.get('/event/settings', fetchEventSettings);

// Admin Endpoints
router.get('/admin/submissions', requireAdminAuth, listAdminSubmissions);
router.get('/admin/submissions/:id', requireAdminAuth, showAdminSubmission);
router.post('/admin/submissions/:id/evaluate', requireAdminAuth, evaluateAdminSubmission);
router.post('/admin/submissions/:id/reopen', requireAdminAuth, reopenAdminSubmission);
router.get('/admin/leaderboard', requireAdminAuth, fetchAdminLeaderboard);
router.post('/admin/event/settings', requireAdminAuth, updateAdminEventSetting);

export default router;
