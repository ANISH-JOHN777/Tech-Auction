import { query, getClient } from '../db/postgres.js';
import { config } from '../config/env.js';
import { walletRepository } from '../db/repositories/wallet.repository.js';
import { auctionRepository } from '../db/repositories/auction.repository.js';
import { bidRepository } from '../db/repositories/bid.repository.js';
import { aiRepository } from '../db/repositories/ai.repository.js';

export async function getTeamWallet(teamId) {
  let wallet = await walletRepository.findByTeamId(teamId);
  
  if (!wallet) {
    wallet = await walletRepository.createWallet(teamId, 1000);
  }

  const available = wallet.balance - wallet.held_balance;
  return {
    ...wallet,
    available,
  };
}

export async function getWalletTransactions(teamId) {
  return await walletRepository.getTransactions(teamId);
}

export async function getAuctionRoomState(track) {
  if (!['full-stack', 'cybersecurity'].includes(track)) {
    return null;
  }
  const room = await auctionRepository.getRoomByTrack(track);
  if (!room) return null;

  let currentItem = null;
  let bidHistory = [];

  if (room.current_item_id) {
    currentItem = await auctionRepository.getItemById(room.current_item_id);
    if (currentItem) {
      if (currentItem.highest_team_id) {
        const leaderRes = await query('SELECT name, code FROM teams WHERE id = $1', [currentItem.highest_team_id]);
        const leader = leaderRes.rows[0];
        currentItem.highest_team_name = leader?.name || '—';
        currentItem.highest_team_code = leader?.code || '—';
      }
      bidHistory = await bidRepository.getBidsForItem(currentItem.id, 20);
    }
  }

  return {
    room,
    currentItem,
    bidHistory,
  };
}

export async function getAuctionCatalog(track) {
  return await auctionRepository.getCatalog(track);
}

export async function placeAtomicBid({ team, amount }) {
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

  const room = await auctionRepository.getRoomByTrack(track);
  if (!room || room.status !== 'ACTIVE' || !room.current_item_id) {
    const err = new Error('Auction room is not currently active for bidding.');
    err.statusCode = 409;
    err.code = 'AUCTION_NOT_ACTIVE';
    throw err;
  }

  const item = await auctionRepository.getItemById(room.current_item_id);
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

  // Begin atomic PostgreSQL transaction with ROW LOCKING (FOR UPDATE)
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Lock Target Auction Item Row
    const itemLockRes = await client.query(
      'SELECT * FROM auction_items WHERE id = $1 FOR UPDATE',
      [item.id]
    );
    const lockedItem = itemLockRes.rows[0];
    if (!lockedItem || lockedItem.status !== 'ACTIVE') {
      throw new Error('Target auction item is no longer active.');
    }

    const currentHighest = lockedItem.current_bid;
    const prevHighestTeamId = lockedItem.highest_team_id;

    const minRequiredTx = currentHighest === 0
      ? lockedItem.starting_price
      : currentHighest + lockedItem.minimum_increment;

    if (numericAmount < minRequiredTx) {
      throw new Error(`Another bid of ${currentHighest} credits was accepted. Your bid of ${numericAmount} is too low.`);
    }

    // 2. Lock Bidding Team Wallet Row
    const bidderWalletRes = await client.query(
      'SELECT * FROM wallets WHERE team_id = $1 FOR UPDATE',
      [team.id]
    );
    const bidderWallet = bidderWalletRes.rows[0];
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

    // 3. Lock and Release Previous Bidder's Hold if different team
    if (prevHighestTeamId && prevHighestTeamId !== team.id) {
      const prevWalletRes = await client.query(
        'SELECT * FROM wallets WHERE team_id = $1 FOR UPDATE',
        [prevHighestTeamId]
      );
      const prevWallet = prevWalletRes.rows[0];
      if (prevWallet) {
        await client.query(
          'UPDATE wallets SET held_balance = GREATEST(0, held_balance - $1), updated_at = $2 WHERE team_id = $3',
          [currentHighest, txTime, prevHighestTeamId]
        );
        await walletRepository.recordTransaction({
          teamId: prevHighestTeamId,
          amount: currentHighest,
          type: 'BID_RELEASE',
          description: `Outbid on item ${lockedItem.item_code}`,
          referenceId: lockedItem.id.toString(),
          client,
        });
      }
    }

    // 4. Hold new bidder's credits
    await client.query(
      'UPDATE wallets SET held_balance = held_balance + $1, updated_at = $2 WHERE team_id = $3',
      [additionalHold, txTime, team.id]
    );
    await walletRepository.recordTransaction({
      teamId: team.id,
      amount: numericAmount,
      type: 'BID_HOLD',
      description: `Active bid hold for item ${lockedItem.item_code}`,
      referenceId: lockedItem.id.toString(),
      client,
    });

    // 5. Update auction item
    await client.query(
      'UPDATE auction_items SET current_bid = $1, highest_team_id = $2 WHERE id = $3',
      [numericAmount, team.id, lockedItem.id]
    );

    // 6. Insert bid log entry
    await bidRepository.recordBid({
      roomId: room.id,
      itemId: lockedItem.id,
      teamId: team.id,
      teamCode: team.code,
      teamName: team.name,
      amount: numericAmount,
    }, client);

    await client.query('COMMIT');

    const updatedRoomState = await getAuctionRoomState(track);
    const updatedWallet = await getTeamWallet(team.id);

    return {
      track,
      roomState: updatedRoomState,
      wallet: updatedWallet,
      bidAmount: numericAmount,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    if (!err.statusCode) err.statusCode = 400;
    throw err;
  } finally {
    client.release();
  }
}

export async function finalizeExpiredItem(itemId) {
  const item = await auctionRepository.getItemById(itemId);
  if (!item || item.status !== 'ACTIVE') return null;

  const now = new Date().toISOString();

  if (item.highest_team_id && item.current_bid > 0) {
    const winnerTeamId = item.highest_team_id;
    const winningBid = item.current_bid;
    const winnerTeamRes = await query('SELECT * FROM teams WHERE id = $1', [winnerTeamId]);
    const winnerTeam = winnerTeamRes.rows[0];

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Mark item as SOLD
      await client.query("UPDATE auction_items SET status = 'SOLD' WHERE id = $1", [item.id]);

      // 2. Record Winner
      await client.query(
        'INSERT INTO auction_winners (item_id, team_id, winning_bid, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (item_id) DO NOTHING',
        [item.id, winnerTeamId, winningBid]
      );

      // 3. Finalize Winner Wallet
      await client.query(
        'UPDATE wallets SET balance = balance - $1, held_balance = GREATEST(0, held_balance - $1), updated_at = $2 WHERE team_id = $3',
        [winningBid, now, winnerTeamId]
      );

      // 4. Record ITEM_PURCHASE transaction
      await walletRepository.recordTransaction({
        teamId: winnerTeamId,
        amount: -winningBid,
        type: 'ITEM_PURCHASE',
        description: `Purchased auction item ${item.item_code}: ${item.name}`,
        referenceId: item.id.toString(),
        client,
      });

      // 5. IF ITEM IS AI ASSIST (FS-05 or CY-06 or item_type === 'AI_ASSIST'), create AVAILABLE entitlement!
      if (item.item_type === 'AI_ASSIST' || item.item_code === 'FS-05' || item.item_code === 'CY-06') {
        const duration = config.aiDurationSeconds || 900;
        await aiRepository.createEntitlement({
          teamId: winnerTeamId,
          teamCode: winnerTeam?.code || 'TEAM',
          track: item.track,
          auctionItemId: item.id,
          durationSeconds: duration,
        }, client);
        console.log(`[AUCTION ENGINE] Created AVAILABLE AI entitlement for team ${winnerTeam?.code} (Track: ${item.track}).`);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[AUCTION ENGINE] Finalize winner failed:', err);
    } finally {
      client.release();
    }
  } else {
    // Unsold item
    await auctionRepository.updateItem(item.id, { status: 'UNSOLD' });
  }

  // Update room state
  const nextItem = await auctionRepository.getNextPendingItem(item.track);
  if (!nextItem) {
    await auctionRepository.updateRoomStatus(item.track, 'COMPLETED', null);
  } else {
    await auctionRepository.updateRoomStatus(item.track, 'WAITING', nextItem.id);
  }

  return await getAuctionRoomState(item.track);
}

export async function manualWalletAdjustment({ teamId, amount, description }) {
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount === 0) {
    throw new Error('Adjustment amount must be a non-zero integer.');
  }

  const wallet = await walletRepository.findByTeamId(teamId);
  if (!wallet) {
    throw new Error('Team wallet not found.');
  }

  if (wallet.balance + numericAmount < 0) {
    throw new Error(`Adjustment would result in negative balance. Current: ${wallet.balance} credits.`);
  }

  await walletRepository.adjustBalance({ teamId, amount: numericAmount, description });
  return await getTeamWallet(teamId);
}
