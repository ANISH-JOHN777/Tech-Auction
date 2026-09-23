import React from 'react';

export default function WalletTransactions({ wallet, transactions }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-center text-xs text-zinc-500">
        No wallet transactions recorded yet.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3">
      <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          WALLET TRANSACTION AUDIT LOG
        </h4>
        {wallet && (
          <div className="text-xs text-amber-400 font-mono font-bold">
            AVAILABLE: {(wallet.balance - wallet.held_balance).toLocaleString()} Credits | HELD: {wallet.held_balance.toLocaleString()} Credits
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex justify-between items-center bg-zinc-950 px-3 py-2 rounded text-xs border border-zinc-800/60"
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    tx.type === 'INITIAL_BALANCE'
                      ? 'bg-blue-500/20 text-blue-400'
                      : tx.type === 'BID_HOLD'
                      ? 'bg-amber-500/20 text-amber-400'
                      : tx.type === 'BID_RELEASE'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : tx.type === 'ITEM_PURCHASE'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {tx.type}
                </span>
                <span className="text-zinc-300 font-medium">{tx.description}</span>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{tx.created_at}</div>
            </div>

            <div className={`font-mono font-bold text-sm ${tx.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {tx.amount > 0 ? `+${tx.amount.toLocaleString()} Credits` : `${tx.amount.toLocaleString()} Credits`}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
