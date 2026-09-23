import React from 'react';

export default function TeamTable({ teams, onSelectTeam, onToggleEligibility, onToggleLogin }) {
  if (!teams || teams.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center text-zinc-400">
        No teams found matching search criteria.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto shadow-xl">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold">
            <th className="py-3.5 px-4">CODE</th>
            <th className="py-3.5 px-4">TEAM NAME</th>
            <th className="py-3.5 px-4">CHALLENGE</th>
            <th className="py-3.5 px-4">WALLET</th>
            <th className="py-3.5 px-4">AUCTION ELIGIBLE</th>
            <th className="py-3.5 px-4">LOGIN</th>
            <th className="py-3.5 px-4 text-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60 font-mono">
          {teams.map((t) => (
            <tr key={t.id} className="hover:bg-zinc-800/40 transition">
              <td className="py-3 px-4 font-bold text-amber-400">{t.code}</td>
              <td className="py-3 px-4 font-sans font-bold text-white">
                <div>{t.name}</div>
                <div className="text-[11px] text-zinc-500 font-mono font-normal">{t.college}</div>
              </td>
              <td className="py-3 px-4 font-sans">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    t.challenge === 'full-stack'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      : t.challenge === 'cybersecurity'
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {t.challenge ? t.challenge.toUpperCase() : 'NONE'}
                </span>
              </td>
              <td className="py-3 px-4 text-amber-300 font-bold">{t.wallet?.toLocaleString() || 0} Credits</td>
              <td className="py-3 px-4 font-sans">
                <button
                  onClick={() => onToggleEligibility(t.id, !t.auction_eligible)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                    t.auction_eligible
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40'
                  }`}
                >
                  {t.auction_eligible ? 'ELIGIBLE' : 'BLOCKED'}
                </button>
              </td>
              <td className="py-3 px-4 font-sans">
                <button
                  onClick={() => onToggleLogin(t.id, !t.login_enabled)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                    t.login_enabled
                      ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                  }`}
                >
                  {t.login_enabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </td>
              <td className="py-3 px-4 text-right font-sans">
                <button
                  onClick={() => onSelectTeam(t)}
                  className="bg-zinc-800 hover:bg-amber-500 hover:text-black text-amber-400 font-bold text-xs px-3 py-1.5 rounded border border-zinc-700 hover:border-amber-500 transition"
                >
                  MANAGE
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
