import crypto from 'crypto';
import { config } from '../config/env.js';
import { parseAndImportCSV } from '../services/csvImport.service.js';
import { seedDemoData } from '../db/seed.js';
import { teamRepository } from '../db/repositories/team.repository.js';
import { walletRepository } from '../db/repositories/wallet.repository.js';
import { sessionRepository } from '../db/repositories/session.repository.js';
import { auctionRepository } from '../db/repositories/auction.repository.js';
import { auditRepository } from '../db/repositories/audit.repository.js';
import {
  getAuctionRoomState,
  getAuctionCatalog,
  manualWalletAdjustment,
  finalizeExpiredItem,
} from '../services/auctionEngine.service.js';
import { startItemAuction, pauseItemAuction } from '../services/timerScheduler.service.js';

export async function adminLogin(req, res, next) {
  try {
    const { username, password } = req.body;

    if (
      !username ||
      !password ||
      username.trim() !== config.adminUsername ||
      password.trim() !== config.adminPassword
    ) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_ADMIN_CREDENTIALS',
          message: 'Invalid admin username or password.',
        },
      });
    }

    const token = 'admin_session_' + crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await sessionRepository.createSession({
      token,
      teamCode: 'ADMIN',
      userType: 'admin',
      expiresAt,
    });

    res.json({
      success: true,
      data: {
        token,
        username: config.adminUsername,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminMe(req, res, next) {
  try {
    res.json({
      success: true,
      data: {
        adminToken: req.adminToken,
        username: config.adminUsername,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getTeams(req, res, next) {
  try {
    const { search, challenge } = req.query;
    const teams = await teamRepository.findAll({ search, challenge });

    for (const team of teams) {
      const members = await teamRepository.getMembers(team.id);
      team.members = members;

      const wallet = await walletRepository.findByTeamId(team.id);
      if (wallet) {
        team.wallet = wallet.balance;
        team.held_balance = wallet.held_balance;
        team.available_balance = wallet.balance - wallet.held_balance;
      }
    }

    res.json({
      success: true,
      data: {
        teams,
        total: teams.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getTeamById(req, res, next) {
  try {
    const { id } = req.params;

    const team = await teamRepository.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { code: 'TEAM_NOT_FOUND', message: 'Team not found.' },
      });
    }

    const members = await teamRepository.getMembers(team.id);
    team.members = members;

    const wallet = await walletRepository.findByTeamId(team.id);
    if (wallet) {
      team.wallet_details = wallet;
    }

    const transactions = await walletRepository.getTransactions(team.id);
    team.transactions = transactions;

    res.json({
      success: true,
      data: { team },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTeam(req, res, next) {
  try {
    const { id } = req.params;
    const { login_enabled, auction_eligible, wallet, challenge, pin, name } = req.body;

    const team = await teamRepository.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { code: 'TEAM_NOT_FOUND', message: 'Team not found.' },
      });
    }

    const updates = {};

    if (login_enabled !== undefined) {
      updates.login_enabled = login_enabled ? 1 : 0;
    }
    if (auction_eligible !== undefined) {
      updates.auction_eligible = auction_eligible ? 1 : 0;
    }
    if (wallet !== undefined && Number.isInteger(Number(wallet)) && Number(wallet) >= 0) {
      updates.wallet = Number(wallet);
      const delta = Number(wallet) - team.wallet;
      await walletRepository.adjustBalance({
        teamId: id,
        amount: delta,
        description: 'Organizer updated team wallet balance',
      });
    }
    if (challenge !== undefined) {
      updates.challenge = ['full-stack', 'cybersecurity', null, ''].includes(challenge) ? (challenge || null) : team.challenge;
    }
    if (pin !== undefined && pin.toString().trim()) {
      updates.pin = pin.toString().trim();
    }
    if (name !== undefined && name.trim()) {
      updates.name = name.trim();
    }

    const updatedTeam = await teamRepository.updateTeam(id, updates);
    const members = await teamRepository.getMembers(id);
    updatedTeam.members = members;

    res.json({
      success: true,
      data: { team: updatedTeam },
    });
  } catch (err) {
    next(err);
  }
}

export async function importRegistrations(req, res, next) {
  try {
    const { csvText } = req.body;
    if (!csvText) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CSV_CONTENT', message: 'No CSV content provided.' },
      });
    }

    const result = await parseAndImportCSV(csvText);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function resetDemoData(req, res, next) {
  try {
    await seedDemoData();
    await auditRepository.recordAdminAction(
      req.admin?.username || 'admin',
      null,
      'DEMO_DATA_RESET',
      'Organizer requested demo event data reset'
    );
    res.json({
      success: true,
      data: { message: 'Database reset to clean demo state successfully.' },
    });
  } catch (err) {
    next(err);
  }
}

// ==================================================
// ADMIN AUCTION CONTROLS
// ==================================================

export async function getAdminAuctionState(req, res, next) {
  try {
    const fsRoom = await getAuctionRoomState('full-stack');
    const cyRoom = await getAuctionRoomState('cybersecurity');
    const fsCatalog = await getAuctionCatalog('full-stack');
    const cyCatalog = await getAuctionCatalog('cybersecurity');

    res.json({
      success: true,
      data: {
        'full-stack': { roomState: fsRoom, catalog: fsCatalog },
        'cybersecurity': { roomState: cyRoom, catalog: cyCatalog },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createAuctionItem(req, res, next) {
  try {
    const { track, item_code, name, description, item_type, starting_price, minimum_increment, duration_seconds } = req.body;

    if (!['full-stack', 'cybersecurity'].includes(track)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TRACK', message: 'Track must be full-stack or cybersecurity' } });
    }
    if (!item_code || !name) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'item_code and name are required' } });
    }

    const newItem = await auctionRepository.createItem({
      track,
      item_code,
      name,
      description,
      item_type,
      starting_price,
      minimum_increment,
      duration_seconds,
    });

    res.json({
      success: true,
      data: { item: newItem },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAuctionItem(req, res, next) {
  try {
    const { id } = req.params;
    const { starting_price, minimum_increment, duration_seconds, status, name, description } = req.body;

    const item = await auctionRepository.getItemById(id);
    if (!item) {
      return res.status(404).json({ success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Auction item not found.' } });
    }

    const updates = {};
    if (starting_price !== undefined) updates.starting_price = Number(starting_price);
    if (minimum_increment !== undefined) updates.minimum_increment = Number(minimum_increment);
    if (duration_seconds !== undefined) updates.duration_seconds = Number(duration_seconds);
    if (status !== undefined) updates.status = status;
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();

    const updatedItem = await auctionRepository.updateItem(id, updates);

    res.json({
      success: true,
      data: { item: updatedItem },
    });
  } catch (err) {
    next(err);
  }
}

export async function adminStartAuction(req, res, next) {
  try {
    const { track, itemId, durationSeconds } = req.body;
    if (!['full-stack', 'cybersecurity'].includes(track)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TRACK', message: 'Track must be full-stack or cybersecurity' } });
    }

    const roomState = await startItemAuction(track, itemId, durationSeconds);

    res.json({
      success: true,
      data: roomState,
    });
  } catch (err) {
    next(err);
  }
}

export async function adminPauseAuction(req, res, next) {
  try {
    const { track } = req.body;
    if (!['full-stack', 'cybersecurity'].includes(track)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TRACK', message: 'Track must be full-stack or cybersecurity' } });
    }

    const roomState = await pauseItemAuction(track);

    res.json({
      success: true,
      data: roomState,
    });
  } catch (err) {
    next(err);
  }
}

export async function adminEndItemEarly(req, res, next) {
  try {
    const { itemId } = req.body;
    const roomState = await finalizeExpiredItem(itemId);

    res.json({
      success: true,
      data: roomState,
    });
  } catch (err) {
    next(err);
  }
}

export async function adminAdjustWallet(req, res, next) {
  try {
    const { teamId, amount, description } = req.body;
    const updatedWallet = await manualWalletAdjustment({ teamId, amount, description });

    res.json({
      success: true,
      data: { wallet: updatedWallet },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuctionWinners(req, res, next) {
  try {
    const winners = await auctionRepository.getWinners();

    res.json({
      success: true,
      data: { winners },
    });
  } catch (err) {
    next(err);
  }
}
