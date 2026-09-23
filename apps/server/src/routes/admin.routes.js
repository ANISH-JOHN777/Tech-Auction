import { Router } from 'express';
import {
  adminLogin,
  getAdminMe,
  getTeams,
  getTeamById,
  updateTeam,
  importRegistrations,
  resetDemoData,
  getAdminAuctionState,
  createAuctionItem,
  updateAuctionItem,
  adminStartAuction,
  adminPauseAuction,
  adminEndItemEarly,
  adminAdjustWallet,
  getAuctionWinners,
} from '../controllers/admin.controller.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = Router();

// Staff Auth & Team Management
router.post('/login', adminLogin);
router.get('/me', requireAdminAuth, getAdminMe);
router.get('/teams', requireAdminAuth, getTeams);
router.get('/teams/:id', requireAdminAuth, getTeamById);
router.patch('/teams/:id', requireAdminAuth, updateTeam);
router.post('/import/registrations', requireAdminAuth, importRegistrations);
router.post('/reset-demo', requireAdminAuth, resetDemoData);

// Admin Auction Engine Controls
router.get('/auction', requireAdminAuth, getAdminAuctionState);
router.post('/auction/items', requireAdminAuth, createAuctionItem);
router.patch('/auction/items/:id', requireAdminAuth, updateAuctionItem);
router.post('/auction/start', requireAdminAuth, adminStartAuction);
router.post('/auction/pause', requireAdminAuth, adminPauseAuction);
router.post('/auction/end-item', requireAdminAuth, adminEndItemEarly);
router.post('/wallet/adjust', requireAdminAuth, adminAdjustWallet);
router.get('/auction/winners', requireAdminAuth, getAuctionWinners);

export default router;
