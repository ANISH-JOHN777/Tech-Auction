import { auctionRepository } from '../db/repositories/auction.repository.js';
import { finalizeExpiredItem, getAuctionRoomState } from './auctionEngine.service.js';
import { broadcastAuctionEvent } from '../socket/auction.socket.js';

let activeTimers = new Map();

export async function initializeTimerScheduler() {
  // Check for any items marked ACTIVE with expired timers on boot
  const activeItems = await auctionRepository.getActiveItems();
  const now = new Date();

  for (const item of activeItems) {
    if (item.timer_ends_at && new Date(item.timer_ends_at) <= now) {
      console.log(`[TIMER SCHEDULER] Finalizing item ${item.item_code} expired during downtime.`);
      const roomState = await finalizeExpiredItem(item.id);
      if (roomState) {
        broadcastAuctionEvent(item.track, 'auction:item-ended', roomState);
      }
    } else if (item.timer_ends_at) {
      const remainingMs = new Date(item.timer_ends_at).getTime() - now.getTime();
      scheduleItemExpiry(item.id, item.track, remainingMs);
    }
  }
}

export function scheduleItemExpiry(itemId, track, durationMs) {
  if (activeTimers.has(itemId)) {
    clearTimeout(activeTimers.get(itemId));
  }

  const timer = setTimeout(async () => {
    activeTimers.delete(itemId);
    console.log(`[TIMER SCHEDULER] Timer expired for item ID ${itemId}. Finalizing winner...`);
    const roomState = await finalizeExpiredItem(itemId);
    if (roomState) {
      broadcastAuctionEvent(track, 'auction:item-ended', roomState);
      if (roomState.currentItem?.status === 'SOLD') {
        broadcastAuctionEvent(track, 'auction:item-sold', {
          item: roomState.currentItem,
          winner: roomState.currentItem.highest_team_name,
        });
      }
    }
  }, Math.max(0, durationMs));

  activeTimers.set(itemId, timer);
}

export async function startItemAuction(track, itemId, durationSeconds) {
  const room = await auctionRepository.getRoomByTrack(track);
  if (!room) throw new Error('Auction room not found');

  const item = await auctionRepository.getItemById(itemId);
  if (!item || item.track !== track) throw new Error('Auction item not found or track mismatch');

  const duration = durationSeconds || item.duration_seconds || 60;
  const now = new Date();
  const endsAt = new Date(now.getTime() + duration * 1000).toISOString();

  // Set item status to ACTIVE and set timer bounds
  await auctionRepository.updateItem(item.id, {
    status: 'ACTIVE',
    timer_started_at: now.toISOString(),
    timer_ends_at: endsAt,
  });

  // Set room status to ACTIVE and set current_item_id
  await auctionRepository.updateRoomStatus(track, 'ACTIVE', item.id);

  scheduleItemExpiry(item.id, track, duration * 1000);

  const roomState = await getAuctionRoomState(track);
  broadcastAuctionEvent(track, 'auction:item-started', roomState);

  return roomState;
}

export async function pauseItemAuction(track) {
  const room = await auctionRepository.getRoomByTrack(track);
  if (!room || !room.current_item_id) throw new Error('No active auction to pause');

  await auctionRepository.updateRoomStatus(track, 'PAUSED', room.current_item_id);
  await auctionRepository.updateItem(room.current_item_id, { status: 'PENDING' });

  if (activeTimers.has(room.current_item_id)) {
    clearTimeout(activeTimers.get(room.current_item_id));
    activeTimers.delete(room.current_item_id);
  }

  const roomState = await getAuctionRoomState(track);
  broadcastAuctionEvent(track, 'auction:room-state', roomState);

  return roomState;
}
