import { Router } from 'express';
import { login, studentLogin, joinOrCreateTeam, getMe, selectChallenge } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/auth/student-login', studentLogin);
router.post('/student-login', studentLogin);
router.post('/team/join-or-create', requireAuth, joinOrCreateTeam);
router.post('/auth/team/join-or-create', requireAuth, joinOrCreateTeam);
router.get('/me', requireAuth, getMe);
router.post('/team/challenge', requireAuth, selectChallenge);

export default router;
