import React from 'react';

export default function PurchasedAdvantages({ wallet, team }) {
  // Extract won catalog items from wallet or transactions if available
  const wonItems = wallet?.itemsWon || wallet?.items_won || [];

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-lg space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-lg">🎖️</span>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            YOUR AUCTION ADVANTAGES
          </h3>
        </div>
        <span className="text-xs font-mono text-zinc-400">
          Total Won: <strong className="text-amber-400">{wonItems.length}</strong>
        </span>
      </div>

      {wonItems.length === 0 ? (
        <div className="bg-zinc-950 p-6 rounded-lg border border-zinc-800/80 text-center text-xs text-zinc-500 font-mono">
          No auction advantages purchased yet. Place winning bids in the Auction Room to acquire AI Assist, extra time, or hints.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {wonItems.map((item, idx) => {
            const isAI = item.item_type === 'AI_ASSIST' || item.name?.includes('AI ASSIST');
            const isTime = item.item_type === 'TIME_EXTENSION' || item.name?.includes('Time');
            const isHint = item.item_type === 'HINT' || item.name?.includes('Hint');

            return (
              <div
                key={item.item_id || idx}
                className="bg-zinc-950 p-3.5 rounded-lg border border-amber-500/30 flex flex-col justify-between space-y-2"
              >
                <div className="flex justify-between items-start">
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-amber-500/30">
                    {item.item_code || `ITEM #${idx + 1}`}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                      isAI
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : isTime
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {item.status || 'PURCHASED'}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white leading-snug">{item.name || item.item_name}</h4>
                  {item.description && (
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{item.description}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex justify-between items-center text-[11px] font-mono text-zinc-400">
                  <span>Winning Bid:</span>
                  <span className="text-amber-400 font-bold">
                    {(item.winning_bid || item.amount || 0).toLocaleString()} Credits
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
