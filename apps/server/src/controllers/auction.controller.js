import {
  getAuctionRoomState,
  getAuctionCatalog,
  getTeamWallet,
  getWalletTransactions,
  placeAtomicBid,
} from '../services/auctionEngine.service.js';
import { broadcastAuctionEvent } from '../socket/auction.socket.js';

export async function getAuctionState(req, res, next) {
  try {
    const track = req.params.challenge || req.team?.challenge;
    const roomState = await getAuctionRoomState(track);

    if (!roomState) {
      return res.status(404).json({
        success: false,
        error: { code: 'ROOM_NOT_FOUND', message: 'Auction room not found.' },
      });
    }

    res.json({
      success: true,
      data: roomState,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCatalog(req, res, next) {
  try {
    const track = req.params.challenge || req.team?.challenge;
    const items = await getAuctionCatalog(track);

    res.json({
      success: true,
      data: { items },
    });
  } catch (err) {
    next(err);
  }
}

export async function getWallet(req, res, next) {
  try {
    const team = req.team;
    const wallet = await getTeamWallet(team.id);
    const transactions = await getWalletTransactions(team.id);

    res.json({
      success: true,
      data: {
        wallet,
        transactions,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function placeBid(req, res, next) {
  try {
    const { amount } = req.body;
    const team = req.team;

    const result = await placeAtomicBid({ team, amount });

    // Broadcast realtime Socket.IO updates to track room ONLY
    broadcastAuctionEvent(result.track, 'auction:bid-placed', result.roomState);
    broadcastAuctionEvent(result.track, 'auction:wallet-updated', { teamId: team.id, wallet: result.wallet });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    // Broadcast rejected bid event to client
    if (req.team?.challenge) {
      broadcastAuctionEvent(req.team.challenge, 'auction:bid-rejected', {
        teamCode: req.team.code,
        error: err.message,
      });
    }
    next(err);
  }
}
