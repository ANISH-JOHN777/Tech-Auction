import { Router } from 'express';
import { login, getMe, selectChallenge } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.post('/team/challenge', requireAuth, selectChallenge);

export default router;
