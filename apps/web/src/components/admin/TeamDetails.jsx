import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function TeamDetails({ team, onUpdate, onClose }) {
  const [wallet, setWallet] = useState(team.wallet || 10000);
  const [challenge, setChallenge] = useState(team.challenge || '');
  const [pin, setPin] = useState(team.pin || '1234');
  const [auctionEligible, setAuctionEligible] = useState(Boolean(team.auction_eligible));
  const [loginEnabled, setLoginEnabled] = useState(Boolean(team.login_enabled));
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate(team.id, {
        wallet: Number(wallet),
        challenge: challenge || null,
        pin: pin.trim(),
        auction_eligible: auctionEligible,
        login_enabled: loginEnabled,
      });
      onClose();
    } catch (err) {
      alert('Failed to update team: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/30 w-full max-w-xl p-6 rounded-2xl shadow-2xl space-y-6">
        <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
          <div>
            <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">
              MANAGE TEAM DETAILS
            </span>
            <h2 className="text-2xl font-black text-white">{team.name}</h2>
            <div className="text-xs text-zinc-400 font-mono mt-0.5">CODE: {team.code}</div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                VIRTUAL WALLET (CREDITS)
              </label>
              <input
                type="number"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-amber-400 font-mono font-bold px-3 py-2 rounded outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                TEAM PIN
              </label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white font-mono px-3 py-2 rounded outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
              ASSIGNED TRACK / CHALLENGE
            </label>
            <select
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white px-3 py-2 rounded outline-none"
            >
              <option value="">None (Allow student selection)</option>
              <option value="full-stack">Full-Stack Development</option>
              <option value="cybersecurity">Cybersecurity</option>
            </select>
          </div>

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={auctionEligible}
                onChange={(e) => setAuctionEligible(e.target.checked)}
                className="accent-amber-500 w-4 h-4"
              />
              AUCTION ELIGIBLE
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={loginEnabled}
                onChange={(e) => setLoginEnabled(e.target.checked)}
                className="accent-amber-500 w-4 h-4"
              />
              ENABLE LOGIN
            </label>
          </div>

          {team.members && team.members.length > 0 && (
            <div className="pt-4 border-t border-zinc-800">
              <div className="text-xs font-bold text-zinc-400 uppercase mb-2">TEAM MEMBERS</div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {team.members.map((m) => (
                  <div key={m.id || m.name} className="bg-zinc-950 p-2 rounded text-xs flex justify-between">
                    <span className="font-bold text-white">{m.name}</span>
                    <span className="text-zinc-500 font-mono">{m.email || 'No email'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={saving}
              className="gold-button px-6 py-2 rounded text-xs font-bold uppercase"
            >
              {saving ? 'SAVING…' : 'SAVE CHANGES'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
