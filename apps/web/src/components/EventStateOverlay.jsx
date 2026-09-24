import React from 'react';
import { Pause, Flag, Trophy } from 'lucide-react';

export default function EventStateOverlay({ eventStatus, onNavigateLeaderboard }) {
  if (!eventStatus || eventStatus === 'LIVE' || eventStatus === 'READY' || eventStatus === 'SETUP') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-40 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/40 max-w-lg w-full p-8 rounded-2xl shadow-2xl text-center space-y-6 gold-glow-border">
        {eventStatus === 'PAUSED' ? (
          <>
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Pause className="w-8 h-8 text-amber-400" />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-500 tracking-widest uppercase">
                EVENT STATUS CONTROL
              </span>
              <h2 className="text-3xl font-black text-white">EVENT PAUSED</h2>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
                Competition actions (bidding, submission, and AI assist) are temporarily disabled by event organizers.
              </p>
            </div>
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-400">
              Please await instructions from the department coordinators.
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
              <Flag className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-500 tracking-widest uppercase">
                TECH AUCTION 2026
              </span>
              <h2 className="text-3xl font-black text-white">EVENT ENDED</h2>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
                The hackathon competition has concluded. All bidding, AI, and submission portals are closed.
              </p>
            </div>
            {onNavigateLeaderboard ? (
              <button
                onClick={onNavigateLeaderboard}
                className="gold-button w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                <span>VIEW OFFICIAL LEADERBOARD</span>
              </button>
            ) : (
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-400">
                Leaderboard will be published by the organizers.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
