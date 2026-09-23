import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function AIMonitor() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadSessions() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminAISessions();
      setSessions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleRevoke(id, teamName) {
    if (!window.confirm(`Are you sure you want to REVOKE the AI Assist session for ${teamName}?`)) return;
    try {
      await api.revokeAdminAISession(id);
      loadSessions();
    } catch (err) {
      alert(`Failed to revoke session: ${err.message}`);
    }
  }

  return (
    <div className="bg-zinc-900 border border-amber-500/30 p-6 rounded-xl shadow-lg space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">
            ORGANIZER MONITORING
          </span>
          <h2 className="text-xl font-black text-white">AI ASSIST MONITOR</h2>
        </div>
        <button
          onClick={loadSessions}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold px-3 py-1.5 rounded border border-zinc-700"
        >
          🔄 REFRESH
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg font-mono">
          {error}
        </div>
      )}

      {loading && sessions.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 font-mono text-xs">
          Loading AI sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 font-mono text-xs border border-dashed border-zinc-800 rounded-lg">
          No AI Assist entitlements have been granted yet. When teams win FS-05 or CY-06, their sessions will appear here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-950 text-zinc-400 uppercase border-b border-zinc-800">
              <tr>
                <th className="p-3">Team</th>
                <th className="p-3">Track</th>
                <th className="p-3">Item</th>
                <th className="p-3">Status</th>
                <th className="p-3">Started At</th>
                <th className="p-3">Expires At</th>
                <th className="p-3 text-center">Requests Used</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-300">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-950/50">
                  <td className="p-3">
                    <div className="font-bold text-white">{s.team_name}</div>
                    <div className="text-[10px] text-zinc-500">{s.team_code}</div>
                  </td>
                  <td className="p-3 uppercase">{s.team_track || s.track}</td>
                  <td className="p-3 text-amber-400 font-bold">{s.auction_item_id || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : s.status === 'AVAILABLE'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : s.status === 'REVOKED'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 text-[11px]">
                    {s.started_at ? new Date(s.started_at).toLocaleTimeString() : 'Not Started'}
                  </td>
                  <td className="p-3 text-[11px]">
                    {s.expires_at ? new Date(s.expires_at).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td className="p-3 text-center font-bold">
                    {s.request_count || 0} / 30
                  </td>
                  <td className="p-3 text-right">
                    {s.status === 'ACTIVE' || s.status === 'AVAILABLE' ? (
                      <button
                        onClick={() => handleRevoke(s.id, s.team_name)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 px-2.5 py-1 rounded text-[10px] font-bold transition"
                      >
                        REVOKE
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
