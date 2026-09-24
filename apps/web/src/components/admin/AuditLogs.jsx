import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadLogs() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminAuditLogs();
      setLogs(Array.isArray(data) ? data : data?.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-lg space-y-4">
        <div className="flex flex-wrap justify-between items-center pb-4 border-b border-zinc-800 gap-2">
          <div>
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              SECURITY & GOVERNANCE AUDIT LOGS
            </span>
            <h2 className="text-xl font-black text-white">ORGANIZER ADMIN AUDIT TRAIL</h2>
          </div>

          <button
            onClick={loadLogs}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold px-3 py-1.5 rounded transition border border-zinc-700 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REFRESH LOGS</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg font-mono">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-xs text-zinc-500 font-mono">
            Loading administrative audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-lg text-center text-xs text-zinc-500 font-mono">
            No administrative audit log entries recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider">
                  <th className="p-3">TIMESTAMP</th>
                  <th className="p-3">ACTOR</th>
                  <th className="p-3">ACTION</th>
                  <th className="p-3">TARGET TEAM</th>
                  <th className="p-3">REASON / METADATA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/40 transition">
                    <td className="p-3 text-zinc-400 whitespace-nowrap">
                      {new Date(log.created_at || log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-amber-400 font-sans">
                      {log.admin_user || log.actor || 'admin'}
                    </td>
                    <td className="p-3">
                      <span className="bg-zinc-950 text-zinc-200 border border-zinc-700 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-sans">
                      {log.team_code ? (
                        <span className="text-white font-bold">
                          {log.team_name || log.team_code} ({log.team_code})
                        </span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="p-3 text-zinc-400 font-sans leading-snug max-w-xs truncate">
                      {log.reason || log.description || 'System Audit Record'}
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
