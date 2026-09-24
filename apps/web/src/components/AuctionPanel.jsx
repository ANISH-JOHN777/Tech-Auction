import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function AuctionPanel({ challenge, roomState, wallet, onBid, bidding, error }) {
  const currentItem = roomState?.currentItem;
  const roomStatus = roomState?.room?.status || 'WAITING';

  const currentBid = currentItem?.current_bid || 0;
  const startingPrice = currentItem?.starting_price || 100;
  const increment = currentItem?.minimum_increment || 25;

  const minNextBid = currentBid === 0 ? startingPrice : currentBid + increment;
  const [bidInput, setBidInput] = useState(minNextBid);

  useEffect(() => {
    setBidInput(minNextBid);
  }, [minNextBid]);

  // Timer Countdown calculation
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!currentItem?.timer_ends_at) {
      setSecondsLeft(0);
      return;
    }
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((new Date(currentItem.timer_ends_at).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentItem?.timer_ends_at]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!bidInput || isNaN(bidInput) || Number(bidInput) < minNextBid) return;
    onBid(Number(bidInput));
  }

  const trackLabel = challenge === 'full-stack' ? 'Full-Stack Development' : 'Cybersecurity';
  const highestTeamName = currentItem?.highest_team_name || 'No bids placed yet';

  const totalBalance = wallet?.balance ?? wallet?.total ?? 0;
  const heldBalance = wallet?.held_balance ?? wallet?.held ?? 0;
  const availableBalance = wallet?.available_balance ?? (totalBalance - heldBalance);

  return (
    <div className="bg-zinc-900 border border-amber-500/30 p-6 rounded-xl shadow-xl gold-glow-border space-y-6">
      {/* Header & Track Isolation */}
      <div className="flex flex-wrap justify-between items-center pb-4 border-b border-zinc-800 gap-2">
        <div>
          <span className="text-xs font-bold text-amber-500 tracking-wider uppercase">
            TECH AUCTION 2026
          </span>
          <h2 className="text-xl font-black text-white">Track: {trackLabel}</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs bg-zinc-950 px-3 py-1.5 rounded border border-zinc-800">
            <span className="text-zinc-400">Available Credits:</span>
            <span className="text-emerald-400 font-bold">{availableBalance.toLocaleString()}</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">Held:</span>
            <span className="text-amber-400 font-bold">{heldBalance.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                roomStatus === 'ACTIVE'
                  ? 'bg-emerald-500 animate-pulse'
                  : roomStatus === 'PAUSED'
                  ? 'bg-amber-500'
                  : 'bg-zinc-600'
              }`}
            ></span>
            <span className="text-xs text-zinc-300 font-mono font-bold uppercase">
              ROOM STATUS: {roomStatus}
            </span>
          </div>
        </div>
      </div>

      {currentItem ? (
        <div className="space-y-6">
          <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/20 text-amber-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded border border-amber-500/30">
                  ITEM {currentItem.item_code}
                </span>
                <span className="text-xs text-zinc-400 font-semibold">{currentItem.item_type}</span>
              </div>
              <h3 className="text-2xl font-black text-white">{currentItem.name}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{currentItem.description}</p>
            </div>

            <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex flex-col justify-between items-center text-center">
              <span className="text-xs text-zinc-400 font-bold uppercase">TIME REMAINING</span>
              <div className="text-3xl font-mono font-black text-amber-400 tracking-widest my-1">
                {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
                {String(secondsLeft % 60).padStart(2, '0')}
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">Server Authoritative Timer</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
              <span className="text-xs text-zinc-400 font-semibold uppercase">STARTING PRICE</span>
              <div className="text-xl font-mono font-bold text-zinc-300 mt-1">{startingPrice.toLocaleString()} Credits</div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
              <span className="text-xs text-zinc-400 font-semibold uppercase">CURRENT HIGHEST BID</span>
              <div className="text-xl font-mono font-black text-amber-400 mt-1">{currentBid.toLocaleString()} Credits</div>
              <div className="text-xs text-zinc-400 mt-0.5 truncate">Leader: {highestTeamName}</div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
              <span className="text-xs text-zinc-400 font-semibold uppercase">MINIMUM NEXT BID</span>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-1">{minNextBid.toLocaleString()} Credits</div>
              <div className="text-xs text-zinc-500 mt-0.5">Increment: +{increment} Credits</div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="number"
              value={bidInput}
              min={minNextBid}
              onChange={(e) => setBidInput(e.target.value)}
              disabled={roomStatus !== 'ACTIVE' || secondsLeft <= 0}
              className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white font-mono text-lg px-4 py-3 rounded-lg outline-none"
            />
            <button
              type="submit"
              disabled={bidding || roomStatus !== 'ACTIVE' || secondsLeft <= 0}
              className="gold-button px-8 py-3 rounded-lg font-bold text-sm tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bidding ? 'SUBMITTING…' : `PLACE BID (${Number(bidInput || minNextBid).toLocaleString()} CREDITS)`}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-zinc-950 p-8 rounded-xl border border-zinc-800 text-center space-y-2">
          <div className="text-amber-500 text-lg font-bold">AUCTION WAITING FOR ORGANIZER</div>
          <p className="text-xs text-zinc-400">
            The organizer will start the item bidding cycle shortly. Stand by for live item announcements.
          </p>
        </div>
      )}
    </div>
  );
}
