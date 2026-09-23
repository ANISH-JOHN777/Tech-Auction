import React from 'react';

export default function BidHistory({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-center text-xs text-zinc-500">
        No bids placed in this session yet.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
      <h4 className="text-xs font-bold text-zinc-400 uppercase mb-3 tracking-wider">
        LIVE SESSION BID LOG
      </h4>
      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center bg-zinc-950 px-3 py-2 rounded text-xs border border-zinc-800/50"
          >
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-mono">{item.time}</span>
              <span className="text-white font-semibold">{item.teamName}</span>
            </div>
            <span className="text-amber-400 font-mono font-bold">{item.amount.toLocaleString()} Credits</span>
          </div>
        ))}
      </div>
    </div>
  );
}
