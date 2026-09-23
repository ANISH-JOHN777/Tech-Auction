import { getDb } from '../db/database.js';
import { config } from '../config/env.js';

export async function getTeamWallet(teamId) {
  const db = getDb();
  let wallet = await db.get('SELECT * FROM wallets WHERE team_id = ?', [teamId]);
  
  if (!wallet) {
    const now = new Date().toISOString();
    await db.run('INSERT INTO wallets (team_id, balance, held_balance, updated_at) VALUES (?, 1000, 0, ?)', [teamId, now]);
    await db.run(
      `INSERT INTO wallet_transactions (team_id, amount, type, description, created_at) VALUES (?, 1000, 'INITIAL_BALANCE', 'Default starting auction credits', ?)`,
      [teamId, now]
    );
    wallet = await db.get('SELECT * FROM wallets WHERE team_id = ?', [teamId]);
  }

  const available = wallet.balance - wallet.held_balance;
  return {
    ...wallet,
    available,
  };
}

export async function getWalletTransactions(teamId) {
  const db = getDb();
  return await db.all('SELECT * FROM wallet_transactions WHERE team_id = ? ORDER BY id DESC', [teamId]);
}

export async function getAuctionRoomState(track) {
  if (!['full-stack', 'cybersecurity'].includes(track)) {
    return null;
  }
  const db = getDb();
  const room = await db.get('SELECT * FROM auction_rooms WHERE track = ?', [track]);
  if (!room) return null;

  let currentItem = null;
  let bidHistory = [];

  if (room.current_item_id) {
    currentItem = await db.get('SELECT * FROM auction_items WHERE id = ?', [room.current_item_id]);
    if (currentItem) {
      if (currentItem.highest_team_id) {
        const leader = await db.get('SELECT name, code FROM teams WHERE id = ?', [currentItem.highest_team_id]);
        currentItem.highest_team_name = leader?.name || '—';
        currentItem.highest_team_code = leader?.code || '—';
      }
      bidHistory = await db.all(
        'SELECT id, amount, team_code, team_name, created_at FROM bids WHERE item_id = ? ORDER BY id DESC LIMIT 20',
        [currentItem.id]
      );
    }
  }

  return {
    room,
    currentItem,
    bidHistory,
  };
}

export async function getAuctionCatalog(track) {
  const db = getDb();
  return await db.all('SELECT * FROM auction_items WHERE track = ? ORDER BY id ASC', [track]);
}

export async function placeAtomicBid({ team, amount }) {
  const db = getDb();

  // 1. Validation Checks
  if (!team || team.auction_eligible !== 1) {
    const err = new Error('Your team is not eligible to participate in the auction.');
    err.statusCode = 403;
    err.code = 'NOT_ELIGIBLE';
    throw err;
  }

  const track = team.challenge;
  if (!track || !['full-stack', 'cybersecurity'].includes(track)) {
    const err = new Error('You must be assigned to a valid challenge track to bid.');
    err.statusCode = 400;
    err.code = 'INVALID_TRACK';
    throw err;
  }

  const room = await db.get('SELECT * FROM auction_rooms WHERE track = ?', [track]);
  if (!room || room.status !== 'ACTIVE' || !room.current_item_id) {
    const err = new Error('Auction room is not currently active for bidding.');
    err.statusCode = 409;
    err.code = 'AUCTION_NOT_ACTIVE';
    throw err;
  }

  const item = await db.get('SELECT * FROM auction_items WHERE id = ?', [room.current_item_id]);
  if (!item || item.status !== 'ACTIVE') {
    const err = new Error('The current auction item is not active.');
    err.statusCode = 409;
    err.code = 'ITEM_NOT_ACTIVE';
    throw err;
  }

  // Verify track isolation (Server authoritative)
  if (item.track !== track) {
    const err = new Error('You cannot bid on items belonging to a different challenge track.');
    err.statusCode = 403;
    err.code = 'TRACK_MISMATCH';
    throw err;
  }

  // Check Timer expiry
  const now = new Date();
  if (item.timer_ends_at && new Date(item.timer_ends_at) <= now) {
    const err = new Error('Auction timer for this item has expired.');
    err.statusCode = 400;
    err.code = 'TIMER_EXPIRED';
    throw err;
  }

  const numericAmount = Number(amount);
  if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
    const err = new Error('Bid amount must be a positive integer.');
    err.statusCode = 400;
    err.code = 'INVALID_AMOUNT';
    throw err;
  }

  const minRequired = item.current_bid === 0
    ? item.starting_price
    : item.current_bid + item.minimum_increment;

  if (numericAmount < minRequired) {
    const err = new Error(`Bid must be at least ${minRequired} credits (Current: ${item.current_bid}, Increment: ${item.minimum_increment}).`);
    err.statusCode = 400;
    err.code = 'BID_TOO_LOW';
    throw err;
  }

  // Begin atomic SQLite transaction to prevent race conditions
  await db.exec('BEGIN IMMEDIATE');
  try {
    // Re-verify item inside transaction
    const lockedItem = await db.get('SELECT * FROM auction_items WHERE id = ?', [item.id]);
    const currentHighest = lockedItem.current_bid;
    const prevHighestTeamId = lockedItem.highest_team_id;

    const minRequiredTx = currentHighest === 0
      ? lockedItem.starting_price
      : currentHighest + lockedItem.minimum_increment;

    if (numericAmount < minRequiredTx) {
      throw new Error(`Another bid of ${currentHighest} credits was accepted. Your bid of ${numericAmount} is too low.`);
    }

    // Check bidder wallet balance inside transaction
    const bidderWallet = await db.get('SELECT * FROM wallets WHERE team_id = ?', [team.id]);
    if (!bidderWallet) {
      throw new Error('Wallet not initialized for team.');
    }

    let additionalHold = numericAmount;
    if (prevHighestTeamId === team.id) {
      additionalHold = numericAmount - currentHighest;
    }

    const availableBalance = bidderWallet.balance - bidderWallet.held_balance;
    if (availableBalance < additionalHold) {
      throw new Error(`Insufficient credits. Required hold: ${additionalHold} credits, Available balance: ${availableBalance} credits.`);
    }

    const txTime = new Date().toISOString();

    // 1. Release previous bidder's hold if different team
    if (prevHighestTeamId && prevHighestTeamId !== team.id) {
      const prevWallet = await db.get('SELECT * FROM wallets WHERE team_id = ?', [prevHighestTeamId]);
      if (prevWallet) {
        await db.run(
          'UPDATE wallets SET held_balance = MAX(0, held_balance - ?), updated_at = ? WHERE team_id = ?',
          [currentHighest, txTime, prevHighestTeamId]
        );
        await db.run(
          `INSERT INTO wallet_transactions (team_id, amount, type, description, reference_id, created_at)
           VALUES (?, ?, 'BID_RELEASE', ?, ?, ?)`,
          [prevHighestTeamId, currentHighest, `Outbid on item ${lockedItem.item_code}`, lockedItem.id.toString(), txTime]
        );
      }
    }

    // 2. Hold new bidder's credits
    await db.run(
      'UPDATE wallets SET held_balance = held_balance + ?, updated_at = ? WHERE team_id = ?',
      [additionalHold, txTime, team.id]
    );
    await db.run(
      `INSERT INTO wallet_transactions (team_id, amount, type, description, reference_id, created_at)
       VALUES (?, ?, 'BID_HOLD', ?, ?, ?)`,
      [team.id, numericAmount, `Active bid hold for item ${lockedItem.item_code}`, lockedItem.id.toString(), txTime]
    );

    // 3. Update auction item
    await db.run(
      'UPDATE auction_items SET current_bid = ?, highest_team_id = ? WHERE id = ?',
      [numericAmount, team.id, lockedItem.id]
    );

    // 4. Insert bid log entry
    await db.run(
      `INSERT INTO bids (room_id, item_id, team_id, team_code, team_name, amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [room.id, lockedItem.id, team.id, team.code, team.name, numericAmount, txTime]
    );

    await db.exec('COMMIT');

    const updatedRoomState = await getAuctionRoomState(track);
    const updatedWallet = await getTeamWallet(team.id);

    return {
      track,
      roomState: updatedRoomState,
      wallet: updatedWallet,
      bidAmount: numericAmount,
    };
  } catch (err) {
    await db.exec('ROLLBACK');
    if (!err.statusCode) err.statusCode = 400;
    throw err;
  }
}

export async function finalizeExpiredItem(itemId) {
  const db = getDb();
  const item = await db.get('SELECT * FROM auction_items WHERE id = ?', [itemId]);
  if (!item || item.status !== 'ACTIVE') return null;

  const now = new Date().toISOString();

  if (item.highest_team_id && item.current_bid > 0) {
    const winnerTeamId = item.highest_team_id;
    const winningBid = item.current_bid;
    const winnerTeam = await db.get('SELECT * FROM teams WHERE id = ?', [winnerTeamId]);

    await db.exec('BEGIN IMMEDIATE');
    try {
      // 1. Mark item as SOLD
      await db.run("UPDATE auction_items SET status = 'SOLD' WHERE id = ?", [item.id]);

      // 2. Record Winner
      await db.run(
        'INSERT INTO auction_winners (item_id, team_id, winning_bid, created_at) VALUES (?, ?, ?, ?)',
        [item.id, winnerTeamId, winningBid, now]
      );

      // 3. Finalize Winner Wallet
      await db.run(
        'UPDATE wallets SET balance = balance - ?, held_balance = MAX(0, held_balance - ?), updated_at = ? WHERE team_id = ?',
        [winningBid, winningBid, now, winnerTeamId]
      );

      // 4. Record ITEM_PURCHASE transaction
      await db.run(
        `INSERT INTO wallet_transactions (team_id, amount, type, description, reference_id, created_at)
         VALUES (?, ?, 'ITEM_PURCHASE', ?, ?, ?)`,
        [winnerTeamId, -winningBid, `Purchased auction item ${item.item_code}: ${item.name}`, item.id.toString(), now]
      );

      // 5. IF ITEM IS AI ASSIST (FS-05 or CY-06 or item_type === 'AI_ASSIST'), create AVAILABLE entitlement!
      if (item.item_type === 'AI_ASSIST' || item.item_code === 'FS-05' || item.item_code === 'CY-06') {
        const duration = config.aiDurationSeconds || 900;
        await db.run(
          `INSERT INTO ai_entitlements (team_id, team_code, track, auction_item_id, provider, duration_seconds, status, request_count, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'gemini', ?, 'AVAILABLE', 0, ?, ?)`,
          [winnerTeamId, winnerTeam?.code || 'TEAM', item.track, item.id, duration, now, now]
        );
        console.log(`[AUCTION ENGINE] Created AVAILABLE AI entitlement for team ${winnerTeam?.code} (Track: ${item.track}).`);
      }

      await db.exec('COMMIT');
    } catch (err) {
      await db.exec('ROLLBACK');
      console.error('[AUCTION ENGINE] Finalize winner failed:', err);
    }
  } else {
    // Unsold item
    await db.run("UPDATE auction_items SET status = 'UNSOLD' WHERE id = ?", [item.id]);
  }

  // Update room state
  const nextItem = await db.get("SELECT * FROM auction_items WHERE track = ? AND status = 'PENDING' ORDER BY id ASC LIMIT 1", [item.track]);
  if (!nextItem) {
    await db.run("UPDATE auction_rooms SET status = 'COMPLETED', current_item_id = NULL WHERE track = ?", [item.track]);
  } else {
    await db.run("UPDATE auction_rooms SET status = 'WAITING', current_item_id = ? WHERE track = ?", [nextItem.id, item.track]);
  }

  return await getAuctionRoomState(item.track);
}

export async function manualWalletAdjustment({ teamId, amount, description }) {
  const db = getDb();
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount === 0) {
    throw new Error('Adjustment amount must be a non-zero integer.');
  }

  const wallet = await db.get('SELECT * FROM wallets WHERE team_id = ?', [teamId]);
  if (!wallet) {
    throw new Error('Team wallet not found.');
  }

  if (wallet.balance + numericAmount < 0) {
    throw new Error(`Adjustment would result in negative balance. Current: ${wallet.balance} credits.`);
  }

  const now = new Date().toISOString();
  await db.run('UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE team_id = ?', [numericAmount, now, teamId]);
  await db.run(
    `INSERT INTO wallet_transactions (team_id, amount, type, description, created_at) VALUES (?, ?, 'ADMIN_ADJUSTMENT', ?, ?)`,
    [teamId, numericAmount, description || 'Admin balance adjustment', now]
  );

  return await getTeamWallet(teamId);
}
