import { getDb } from '../db/database.js';

const auctionStore = {
  'full-stack': { item: 'AI ASSIST — 15 MIN', currentBid: 0, highestTeam: null, open: true },
  'cybersecurity': { item: 'SECURITY AI — 15 MIN', currentBid: 0, highestTeam: null, open: true },
};

export function getAuctionState(challenge) {
  if (!auctionStore[challenge]) {
    return null;
  }
  return auctionStore[challenge];
}

export async function processBid({ team, amount }) {
  if (!team || !team.auction_eligible) {
    const error = new Error('Team is not eligible for auction');
    error.statusCode = 403;
    error.code = 'NOT_ELIGIBLE';
    throw error;
  }

  const challenge = team.challenge;
  if (!challenge || !['full-stack', 'cybersecurity'].includes(challenge)) {
    const error = new Error('Please select a valid challenge before placing a bid');
    error.statusCode = 400;
    error.code = 'CHALLENGE_NOT_SELECTED';
    throw error;
  }

  const auction = auctionStore[challenge];
  if (!auction || !auction.open) {
    const error = new Error('Auction is closed for this room');
    error.statusCode = 409;
    error.code = 'AUCTION_CLOSED';
    throw error;
  }

  const numericAmount = Number(amount);
  if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
    const error = new Error('Bid amount must be a positive integer');
    error.statusCode = 400;
    error.code = 'INVALID_AMOUNT';
    throw error;
  }

  if (numericAmount <= auction.currentBid) {
    const error = new Error(`Bid must exceed current bid of ₹${auction.currentBid}`);
    error.statusCode = 400;
    error.code = 'BID_TOO_LOW';
    throw error;
  }

  if (numericAmount > team.wallet) {
    const error = new Error(`Bid of ₹${numericAmount} exceeds your available wallet balance of ₹${team.wallet}`);
    error.statusCode = 400;
    error.code = 'INSUFFICIENT_FUNDS';
    throw error;
  }

  // Update in-memory state
  auction.currentBid = numericAmount;
  auction.highestTeam = team.name;

  // Persist bid record to SQLite database
  const db = getDb();
  await db.run(
    `INSERT INTO bids (team_code, challenge, amount, created_at) VALUES (?, ?, ?, datetime('now'))`,
    [team.code, challenge, numericAmount]
  );

  return {
    challenge,
    auction,
  };
}
