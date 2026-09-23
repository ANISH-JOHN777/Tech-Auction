import React from 'react';

export default function TeamCard({ team }) {
  if (!team) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-lg space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <div className="text-xs text-amber-500 font-bold uppercase tracking-wider">
            REGISTERED HACKATHON TEAM
          </div>
          <h2 className="text-2xl font-black text-white">{team.name}</h2>
          <div className="text-xs text-zinc-400 mt-1 font-mono">
            CODE: <span className="text-amber-400 font-bold">{team.code}</span> | COLLEGE:{' '}
            <span className="text-zinc-300">{team.college || 'SNS College of Technology'}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`text-xs font-bold px-3 py-1 rounded border ${
              team.auction_eligible
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}
          >
            {team.auction_eligible ? 'AUCTION ELIGIBLE' : 'NOT ELIGIBLE'}
          </span>
          <span
            className={`text-xs font-bold px-3 py-1 rounded border ${
              team.challenge
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {team.challenge ? team.challenge.toUpperCase() + ' (LOCKED)' : 'CHALLENGE PENDING'}
          </span>
        </div>
      </div>

      {team.members && team.members.length > 0 && (
        <div className="pt-3 border-t border-zinc-800">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            TEAM MEMBERS ({team.members.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {team.members.map((m) => (
              <div key={m.id || m.name} className="bg-zinc-950 p-2.5 rounded border border-zinc-800 text-xs">
                <div className="font-bold text-white">{m.name}</div>
                <div className="text-zinc-500 font-mono text-[11px] truncate">{m.email || 'No email provided'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
