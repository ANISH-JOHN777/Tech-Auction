import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function AuctionControl() {
  const [track, setTrack] = useState('full-stack');
  const [auctionData, setAuctionData] = useState(null);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustingTeamId, setAdjustingTeamId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState(100);
  const [adjustDesc, setAdjustDesc] = useState('Bonus credits award');
  const [actionMsg, setActionMsg] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const data = await api.getAdminAuctionState();
      setAuctionData(data);

      const wData = await api.getAdminWinners();
      setWinners(wData.winners);
    } catch (err) {
      console.error('Failed to load admin auction state:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentTrackData = auctionData ? auctionData[track] : null;
  const roomState = currentTrackData?.roomState;
  const catalog = currentTrackData?.catalog || [];

  async function handleStartItem(itemId, durationSeconds = 60) {
    setActionMsg('');
    try {
      await api.startAdminAuction(track, itemId, durationSeconds);
      setActionMsg(`Started auction item ID ${itemId} for ${durationSeconds}s`);
      loadData();
    } catch (err) {
      alert('Failed to start auction: ' + err.message);
    }
  }

  async function handlePauseRoom() {
    setActionMsg('');
    try {
      await api.pauseAdminAuction(track);
      setActionMsg(`Paused room ${track}`);
      loadData();
    } catch (err) {
      alert('Failed to pause auction: ' + err.message);
    }
  }

  async function handleEndEarly(itemId) {
    if (!window.confirm('Finalize and end item early?')) return;
    setActionMsg('');
    try {
      await api.endAdminItemEarly(itemId);
      setActionMsg(`Finalized item ID ${itemId}`);
      loadData();
    } catch (err) {
      alert('Failed to end item: ' + err.message);
    }
  }

  async function handleAdjustWallet(e) {
    e.preventDefault();
    if (!adjustingTeamId || !adjustAmount) return;
    try {
      await api.adjustAdminWallet(Number(adjustingTeamId), Number(adjustAmount), adjustDesc);
      alert('Wallet adjustment successful');
      setAdjustingTeamId('');
      loadData();
    } catch (err) {
      alert('Wallet adjustment failed: ' + err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center bg-zinc-900 border border-zinc-800 p-6 rounded-xl gap-4">
        <div>
          <h2 className="text-xl font-black text-white">ORGANIZER AUCTION ENGINE CONTROL</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Control persistent auction rooms, start/pause countdown timers, and manage wallet credits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 text-amber-400 font-bold px-4 py-2 rounded text-xs outline-none"
          >
            <option value="full-stack">Full-Stack Track</option>
            <option value="cybersecurity">Cybersecurity Track</option>
          </select>
          
          <button
            onClick={handlePauseRoom}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold px-4 py-2 rounded transition"
          >
            PAUSE ROOM
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-lg font-mono">
          {actionMsg}
        </div>
      )}

      {/* ROOM STATUS BADGE */}
      {roomState && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-wrap justify-between items-center gap-4">
          <div>
            <span className="text-xs text-zinc-400 font-bold uppercase">ROOM STATUS</span>
            <div className="text-2xl font-black text-amber-400 mt-0.5">{roomState.room?.status}</div>
          </div>

          <div>
            <span className="text-xs text-zinc-400 font-bold uppercase">CURRENT ACTIVE ITEM</span>
            <div className="text-lg font-bold text-white mt-0.5">
              {roomState.currentItem ? `${roomState.currentItem.item_code} — ${roomState.currentItem.name}` : 'None'}
            </div>
          </div>

          <div>
            <span className="text-xs text-zinc-400 font-bold uppercase">HIGHEST BID</span>
            <div className="text-xl font-mono font-black text-emerald-400 mt-0.5">
              {roomState.currentItem?.current_bid || 0} Credits ({roomState.currentItem?.highest_team_name || '—'})
            </div>
          </div>


          {roomState.currentItem?.status === 'ACTIVE' && (
            <button
              onClick={() => handleEndEarly(roomState.currentItem.id)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold px-4 py-2 rounded"
            >
              FINALIZE & END EARLY
            </button>
          )}
        </div>
      )}

      {/* CATALOG MANAGEMENT TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">
          {track.toUpperCase()} AUCTION CATALOG
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <th className="py-3 px-3">CODE</th>
                <th className="py-3 px-3">ITEM NAME</th>
                <th className="py-3 px-3">TYPE</th>
                <th className="py-3 px-3">STARTING</th>
                <th className="py-3 px-3">INCREMENT</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {catalog.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-800/40">
                  <td className="py-3 px-3 font-bold text-amber-400">{item.item_code}</td>
                  <td className="py-3 px-3 font-sans font-bold text-white">{item.name}</td>
                  <td className="py-3 px-3 font-sans text-zinc-400">{item.item_type}</td>
                  <td className="py-3 px-3">{item.starting_price} Credits</td>
                  <td className="py-3 px-3">+{item.minimum_increment} Credits</td>
                  <td className="py-3 px-3 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        item.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                          : item.status === 'SOLD'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-sans">
                    <button
                      onClick={() => handleStartItem(item.id, item.duration_seconds)}
                      disabled={item.status === 'SOLD'}
                      className="bg-zinc-800 hover:bg-amber-500 hover:text-black text-amber-400 text-xs font-bold px-3 py-1.5 rounded border border-zinc-700 disabled:opacity-40"
                    >
                      {item.status === 'ACTIVE' ? 'RESTART TIMER' : 'START AUCTION'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* WALLET MANUAL ADJUSTMENT FORM */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">
          MANUAL WALLET CREDIT ADJUSTMENT
        </h3>

        <form onSubmit={handleAdjustWallet} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">TEAM ID</label>
            <input
              type="number"
              value={adjustingTeamId}
              onChange={(e) => setAdjustingTeamId(e.target.value)}
              placeholder="e.g. 1"
              required
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white px-3 py-2 rounded text-xs font-mono outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">AMOUNT (+/- Credits)</label>
            <input
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder="e.g. 200 or -100"
              required
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white px-3 py-2 rounded text-xs font-mono outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">REASON / DESCRIPTION</label>
            <input
              type="text"
              value={adjustDesc}
              onChange={(e) => setAdjustDesc(e.target.value)}
              placeholder="e.g. Bonus points award"
              required
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white px-3 py-2 rounded text-xs outline-none"
            />
          </div>

          <button
            type="submit"
            className="gold-button py-2.5 rounded text-xs font-bold uppercase"
          >
            EXECUTE ADJUSTMENT
          </button>
        </form>
      </div>

      {/* AUCTION WINNERS BOARD */}
      {winners.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
            AUCTION WINNERS LOG ({winners.length})
          </h3>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {winners.map((w) => (
              <div key={w.id} className="flex justify-between items-center bg-zinc-950 px-4 py-2.5 rounded text-xs border border-zinc-800">
                <div>
                  <span className="font-bold text-white">{w.team_name} ({w.team_code})</span>
                  <span className="text-zinc-400 text-xs ml-2">won {w.item_code} — {w.item_name}</span>
                </div>
                <div className="font-mono text-amber-400 font-bold">{w.winning_bid.toLocaleString()} Credits</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
