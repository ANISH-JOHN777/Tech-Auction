import crypto from 'crypto';
import { config } from '../config/env.js';
import { getDb } from '../db/database.js';
import { parseAndImportCSV } from '../services/csvImport.service.js';
import { seedDemoData } from '../db/schema.js';
import {
  getAuctionRoomState,
  getAuctionCatalog,
  manualWalletAdjustment,
  finalizeExpiredItem,
} from '../services/auctionEngine.service.js';
import { startItemAuction, pauseItemAuction } from '../services/timerScheduler.service.js';
import { broadcastAuctionEvent } from '../socket/auction.socket.js';

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

    const db = getDb();
    await db.run(
      `INSERT INTO sessions (token, team_code, user_type, created_at, expires_at) VALUES (?, 'ADMIN', 'admin', datetime('now'), ?)`,
      [token, expiresAt]
    );

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
    const db = getDb();

    let query = 'SELECT * FROM teams WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (code LIKE ? OR name LIKE ? OR college LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (challenge && ['full-stack', 'cybersecurity'].includes(challenge)) {
      query += ' AND challenge = ?';
      params.push(challenge);
    }

    query += ' ORDER BY id ASC';

    const teams = await db.all(query, params);

    for (const team of teams) {
      const members = await db.all('SELECT id, name, email, phone, role FROM team_members WHERE team_id = ?', [team.id]);
      team.members = members;

      const wallet = await db.get('SELECT balance, held_balance FROM wallets WHERE team_id = ?', [team.id]);
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
    const db = getDb();

    const team = await db.get('SELECT * FROM teams WHERE id = ?', [id]);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { code: 'TEAM_NOT_FOUND', message: 'Team not found.' },
      });
    }

    const members = await db.all('SELECT id, name, email, phone, role FROM team_members WHERE team_id = ?', [team.id]);
    team.members = members;

    const wallet = await db.get('SELECT * FROM wallets WHERE team_id = ?', [team.id]);
    if (wallet) {
      team.wallet_details = wallet;
    }

    const transactions = await db.all('SELECT * FROM wallet_transactions WHERE team_id = ? ORDER BY id DESC', [team.id]);
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

    const db = getDb();
    const team = await db.get('SELECT * FROM teams WHERE id = ?', [id]);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: { code: 'TEAM_NOT_FOUND', message: 'Team not found.' },
      });
    }

    const updates = [];
    const params = [];

    if (login_enabled !== undefined) {
      updates.push('login_enabled = ?');
      params.push(login_enabled ? 1 : 0);
    }
    if (auction_eligible !== undefined) {
      updates.push('auction_eligible = ?');
      params.push(auction_eligible ? 1 : 0);
    }
    if (wallet !== undefined && Number.isInteger(Number(wallet)) && Number(wallet) >= 0) {
      updates.push('wallet = ?');
      params.push(Number(wallet));
      // Update persistent wallet table
      const now = new Date().toISOString();
      await db.run('UPDATE wallets SET balance = ?, updated_at = ? WHERE team_id = ?', [Number(wallet), now, id]);
      await db.run(
        `INSERT INTO wallet_transactions (team_id, amount, type, description, created_at) VALUES (?, ?, 'ADMIN_ADJUSTMENT', 'Organizer updated team wallet balance', ?)`,
        [id, Number(wallet) - team.wallet, now]
      );
    }
    if (challenge !== undefined) {
      const valid = ['full-stack', 'cybersecurity', null, ''].includes(challenge) ? (challenge || null) : team.challenge;
      updates.push('challenge = ?');
      params.push(valid);
    }
    if (pin !== undefined && pin.toString().trim()) {
      updates.push('pin = ?');
      params.push(pin.toString().trim());
    }
    if (name !== undefined && name.trim()) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(id);
      await db.run(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updatedTeam = await db.get('SELECT * FROM teams WHERE id = ?', [id]);
    const members = await db.all('SELECT id, name, email, phone, role FROM team_members WHERE team_id = ?', [id]);
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
    const db = getDb();
    await seedDemoData(db);
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO event_admin_actions (admin_user, team_id, action, reason, created_at)
       VALUES (?, NULL, 'DEMO_DATA_RESET', 'Organizer requested demo event data reset', ?)`,
      [req.admin?.username || 'admin', now]
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

    const db = getDb();
    const result = await db.run(
      `INSERT INTO auction_items (track, item_code, name, description, item_type, starting_price, minimum_increment, duration_seconds, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        track,
        item_code.trim().toUpperCase(),
        name.trim(),
        description || '',
        item_type || 'HINT',
        Number(starting_price) || 100,
        Number(minimum_increment) || 25,
        Number(duration_seconds) || 60,
      ]
    );

    const newItem = await db.get('SELECT * FROM auction_items WHERE id = ?', [result.lastID]);

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

    const db = getDb();
    const item = await db.get('SELECT * FROM auction_items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Auction item not found.' } });
    }

    const updates = [];
    const params = [];

    if (starting_price !== undefined) { updates.push('starting_price = ?'); params.push(Number(starting_price)); }
    if (minimum_increment !== undefined) { updates.push('minimum_increment = ?'); params.push(Number(minimum_increment)); }
    if (duration_seconds !== undefined) { updates.push('duration_seconds = ?'); params.push(Number(duration_seconds)); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description.trim()); }

    if (updates.length > 0) {
      params.push(id);
      await db.run(`UPDATE auction_items SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updatedItem = await db.get('SELECT * FROM auction_items WHERE id = ?', [id]);

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
    const db = getDb();
    const winners = await db.all(`
      SELECT w.id, w.winning_bid, w.created_at, i.item_code, i.name as item_name, i.track, t.name as team_name, t.code as team_code
      FROM auction_winners w
      JOIN auction_items i ON w.item_id = i.id
      JOIN teams t ON w.team_id = t.id
      ORDER BY w.id DESC
    `);

    res.json({
      success: true,
      data: { winners },
    });
  } catch (err) {
    next(err);
  }
}
