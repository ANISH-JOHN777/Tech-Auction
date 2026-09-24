import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw, Medal } from 'lucide-react';
import { api } from '../services/api';

export default function Leaderboard() {
  const [data, setData] = useState({ visible: false, entries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadLeaderboard() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getPublicLeaderboard();
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-zinc-900 border border-amber-500/30 p-6 rounded-xl shadow-xl gold-glow-border space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
          <div>
            <span className="text-xs font-bold text-amber-500 tracking-wider uppercase">
              TECH AUCTION 2026
            </span>
            <h2 className="text-2xl font-black text-white">OFFICIAL EVENT LEADERBOARD</h2>
          </div>

          <button
            onClick={loadLeaderboard}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold px-3 py-1.5 rounded border border-zinc-700 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REFRESH</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg font-mono">
            {error}
          </div>
        )}

        {!data.visible ? (
          <div className="bg-zinc-950 border border-zinc-800 p-12 rounded-xl text-center space-y-3">
            <Trophy className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="text-lg font-black text-zinc-300 uppercase">LEADERBOARD HIDDEN BY ORGANIZERS</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              The official event leaderboard is currently set to private mode. Final rankings will be revealed by the event organizers after all evaluations are completed.
            </p>
          </div>
        ) : loading && data.entries.length === 0 ? (
          <div className="text-center py-12 text-xs text-zinc-500 font-mono">
            Loading live leaderboard entries...
          </div>
        ) : data.entries.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 p-12 rounded-xl text-center text-xs text-zinc-500 font-mono">
            No finalized evaluation scores recorded yet. Check back shortly.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider">
                  <th className="p-3.5 text-center">RANK</th>
                  <th className="p-3.5">TEAM</th>
                  <th className="p-3.5">TRACK</th>
                  <th className="p-3.5 text-right">TOTAL SCORE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-zinc-300">
                {data.entries.map((entry) => (
                  <tr
                    key={entry.teamCode}
                    className={`hover:bg-zinc-800/40 transition ${
                      entry.rank === 1
                        ? 'bg-amber-500/10 border-l-4 border-amber-500'
                        : entry.rank === 2
                        ? 'bg-zinc-800/20 border-l-4 border-zinc-400'
                        : entry.rank === 3
                        ? 'bg-amber-900/20 border-l-4 border-amber-700'
                        : ''
                    }`}
                  >
                    <td className="p-3.5 text-center font-bold text-sm">
                      <div className="flex items-center justify-center gap-1">
                        {entry.rank <= 3 && (
                          <Medal className={`w-4 h-4 ${
                            entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-zinc-400' : 'text-amber-700'
                          }`} />
                        )}
                        <span>{entry.rank}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-white text-sm font-sans">{entry.teamName}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{entry.teamCode}</div>
                    </td>
                    <td className="p-3.5 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        entry.track.includes('FULL')
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                      }`}>
                        {entry.track}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-black text-amber-400 text-base">
                      {entry.score} <span className="text-xs text-zinc-500 font-normal">/ 100</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
