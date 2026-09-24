import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Login({ onLogin, error }) {
  const [teamCode, setTeamCode] = useState('');
  const [pin, setPin] = useState('1234');
  const [submitting, setSubmitting] = useState(false);
  const [serverStatus, setServerStatus] = useState('CHECKING');
  const [friendlyError, setFriendlyError] = useState('');

  useEffect(() => {
    async function checkServer() {
      try {
        await api.getEventSettings();
        setServerStatus('ONLINE');
      } catch (err) {
        setServerStatus('OFFLINE');
      }
    }
    checkServer();
  }, []);

  useEffect(() => {
    if (!error) {
      setFriendlyError('');
      return;
    }
    const lower = error.toLowerCase();
    if (lower.includes('invalid') || lower.includes('credentials') || lower.includes('pin')) {
      setFriendlyError('Invalid team code or PIN. Please verify your team credentials.');
    } else if (lower.includes('disabled') || lower.includes('suspended')) {
      setFriendlyError('Team login is currently disabled by event organizers.');
    } else if (lower.includes('fetch') || lower.includes('network') || lower.includes('connect')) {
      setFriendlyError('Event server unavailable. Please check your network connection.');
    } else {
      setFriendlyError(error);
    }
  }, [error]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!teamCode.trim()) return;
    setSubmitting(true);
    try {
      await onLogin(teamCode.trim().toUpperCase(), pin.trim());
    } catch (err) {
      // Error is caught in hook state
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl gold-glow-border relative">
        {/* Server Status Indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              serverStatus === 'ONLINE'
                ? 'bg-emerald-400 animate-pulse'
                : serverStatus === 'OFFLINE'
                ? 'bg-red-500'
                : 'bg-amber-400'
            }`}
          ></span>
          <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">
            SERVER {serverStatus}
          </span>
        </div>

        <div className="text-center mb-8">
          <div className="text-[11px] font-bold tracking-widest text-amber-500 uppercase mb-1">
            SNS COLLEGE OF TECHNOLOGY — DEPT OF IT
          </div>
          <div className="text-[10px] text-zinc-400 font-mono tracking-widest mb-4">
            BID · THINK · SOLVE · WIN
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            TECH <span className="gold-gradient-text">AUCTION</span>
          </h1>
          <p className="text-xs text-zinc-400">Team Login Portal</p>
        </div>

        {friendlyError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg text-center font-mono">
            ⚠️ {friendlyError}
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
            disabled={submitting || !teamCode.trim() || serverStatus === 'OFFLINE'}
            className="gold-button w-full py-3.5 rounded-lg font-bold text-sm tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'VERIFYING CREDENTIALS…' : 'ENTER HACKATHON'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
          <span className="text-xs text-zinc-500 font-mono">DEMO TEAMS (PIN: 1234):</span>
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
