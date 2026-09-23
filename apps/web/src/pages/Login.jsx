import React, { useState } from 'react';

export default function Login({ onLogin, error }) {
  const [teamCode, setTeamCode] = useState('');
  const [pin, setPin] = useState('1234');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!teamCode.trim()) return;
    setSubmitting(true);
    try {
      await onLogin(teamCode.trim().toUpperCase(), pin.trim());
    } catch (err) {
      // Error in hook state
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl gold-glow-border">
        <div className="text-center mb-8">
          <div className="text-xs font-bold tracking-widest text-amber-500 uppercase mb-1">
            SNS COLLEGE OF TECHNOLOGY — DEPT OF IT
          </div>
          <div className="text-xs text-zinc-400 font-mono tracking-widest mb-4">
            BID · THINK · SOLVE · WIN
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            TECH <span className="gold-gradient-text">AUCTION</span>
          </h1>
          <p className="text-xs text-zinc-400">Team Login Portal</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 tracking-wider">
              TEAM CODE
            </label>
            <input
              type="text"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
              placeholder="e.g. FS01 or CY01"
              required
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white font-mono text-center tracking-widest text-lg py-3 rounded-lg outline-none uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 tracking-wider">
              TEAM PIN / PASSWORD
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN (Default: 1234)"
              required
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white font-mono text-center tracking-widest text-lg py-3 rounded-lg outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !teamCode.trim()}
            className="gold-button w-full py-3.5 rounded-lg font-bold text-sm tracking-wider uppercase"
          >
            {submitting ? 'VERIFYING CREDENTIALS…' : 'ENTER HACKATHON'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
          <span className="text-xs text-zinc-500">DEMO TEAMS (PIN: 1234):</span>
          <div className="flex justify-center gap-3 mt-2">
            {['FS01', 'CY01', 'FS02'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setTeamCode(code);
                  setPin('1234');
                }}
                className="text-xs font-mono bg-zinc-950 hover:bg-zinc-800 text-amber-400 border border-zinc-800 px-3 py-1 rounded transition"
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
