import React from 'react';

export default function Wallet({ amount }) {
  return (
    <div className="flex items-center gap-2 bg-zinc-900 border border-amber-500/30 px-4 py-2 rounded-lg shadow-inner">
      <span className="text-amber-500 font-bold text-sm">VIRTUAL WALLET:</span>
      <span className="text-amber-400 font-black text-lg tracking-wider">
        {amount?.toLocaleString() || 0} Credits
      </span>
    </div>
  );
}
