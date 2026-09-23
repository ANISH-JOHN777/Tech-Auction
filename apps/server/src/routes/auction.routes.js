import { Router } from 'express';
import { placeBid, getAuctionState, getCatalog, getWallet } from '../controllers/auction.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { eventGuard } from '../middleware/eventGuard.js';

const router = Router();

router.get('/wallet', requireAuth, getWallet);
router.get('/catalog/:challenge', requireAuth, getCatalog);
router.get('/catalog', requireAuth, getCatalog);
router.get('/:challenge', requireAuth, getAuctionState);
router.get('/', requireAuth, getAuctionState);
router.post('/bid', requireAuth, eventGuard({ requireLive: true, requireActiveTeam: true }), placeBid);

export default router;
