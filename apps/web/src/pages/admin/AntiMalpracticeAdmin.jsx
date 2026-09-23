import React, { useState, useEffect } from 'react';

export default function AntiMalpracticeAdmin() {
  const [violations, setViolations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterTrack, setFilterTrack] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Team Action Modal
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [actionStatus, setActionStatus] = useState('SUSPENDED');
  const [submittingAction, setSubmittingAction] = useState(false);

  const token = localStorage.getItem('adminToken');

  async function loadData() {
    setLoading(true);
    try {
      // 1. Load summary ticker
      const sumRes = await fetch('/api/event/summary');
      if (sumRes.ok) {
        const s = await sumRes.json();
        setSummary(s.data);
      }

      // 2. Load violations with filters
      const query = new URLSearchParams();
      if (filterTrack) query.append('track', filterTrack);
      if (filterSeverity) query.append('severity', filterSeverity);
      if (filterType) query.append('type', filterType);
      if (filterStatus) query.append('status', filterStatus);

      const vRes = await fetch(`/api/admin/violations?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (vRes.ok) {
        const vData = await vRes.json();
        setViolations(vData.data || []);
      }

      // 3. Load admin audit logs
      const aRes = await fetch('/api/admin/event/audit', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (aRes.ok) {
        const aData = await aRes.json();
        setAuditLogs(aData.data || []);
      }
    } catch (err) {
      console.error('Failed to load anti-malpractice data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [filterTrack, filterSeverity, filterType, filterStatus]);

  async function handleUpdateViolation(id, status) {
    try {
      const res = await fetch(`/api/admin/violations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, reason: `Status changed to ${status}` }),
      });
      if (res.ok) {
        await loadData();
      } else {
        alert('Failed to update violation status');
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  async function handleTeamStatusSubmit(e) {
    e.preventDefault();
    if (!selectedTeam || !actionReason.trim()) {
      alert('A valid reason is required for administrative team status changes.');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/admin/teams/${selectedTeam.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: actionStatus, reason: actionReason.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to update team status');
      }

      alert(`Team ${selectedTeam.code} status updated to ${actionStatus}`);
      setSelectedTeam(null);
      setActionReason('');
      await loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmittingAction(false);
    }
  }

  const severityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-900/60 text-red-300 border-red-500';
      case 'HIGH':
        return 'bg-amber-900/60 text-amber-300 border-amber-500';
      case 'WARNING':
        return 'bg-yellow-900/60 text-yellow-300 border-yellow-500';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* COMPACT EVENT MONITOR TICKER */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div>
            <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">
              SUPERVISED EVENT MONITORING
            </span>
            <h2 className="text-xl font-black text-white">ANTI-MALPRACTICE CONTROL & AUDIT</h2>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 font-bold block">EVENT STATE</span>
            <span className="text-xs font-mono font-bold text-emerald-400">● {summary?.event_status || 'SETUP'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold block">ACTIVE TEAMS</span>
            <span className="text-xl font-mono font-bold text-emerald-400">{summary?.active_teams ?? 0}</span>
          </div>
          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold block">SUBMITTED</span>
            <span className="text-xl font-mono font-bold text-blue-400">{summary?.submitted_teams ?? 0}</span>
          </div>
          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold block">FLAGGED TEAMS</span>
            <span className="text-xl font-mono font-bold text-amber-400">{summary?.flagged_teams ?? 0}</span>
          </div>
          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold block">SUSPENDED</span>
            <span className="text-xl font-mono font-bold text-purple-400">{summary?.suspended_teams ?? 0}</span>
          </div>
          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold block">DISQUALIFIED</span>
            <span className="text-xl font-mono font-bold text-red-400">{summary?.disqualified_teams ?? 0}</span>
          </div>
          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-400 uppercase font-bold block">OPEN VIOLATIONS</span>
            <span className="text-xl font-mono font-bold text-yellow-400">{summary?.open_violations ?? 0}</span>
          </div>
        </div>
      </div>

      {/* VIOLATIONS MONITOR & FILTERS */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">RECORDED BROWSER VIOLATIONS</h3>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 text-xs">
            <select
              value={filterTrack}
              onChange={(e) => setFilterTrack(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded outline-none"
            >
              <option value="">All Tracks</option>
              <option value="full-stack">Full-Stack</option>
              <option value="cybersecurity">Cybersecurity</option>
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded outline-none"
            >
              <option value="">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded outline-none"
            >
              <option value="">All Types</option>
              <option value="TAB_HIDDEN">TAB_HIDDEN</option>
              <option value="WINDOW_BLUR">WINDOW_BLUR</option>
              <option value="FULLSCREEN_EXIT">FULLSCREEN_EXIT</option>
              <option value="COPY_ATTEMPT">COPY_ATTEMPT</option>
              <option value="PASTE_ATTEMPT">PASTE_ATTEMPT</option>
              <option value="MULTIPLE_SESSION">MULTIPLE_SESSION</option>
              <option value="DEVTOOLS_SUSPECTED">DEVTOOLS_SUSPECTED</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded outline-none"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="REVIEWED">REVIEWED</option>
              <option value="DISMISS">DISMISSED</option>
            </select>
          </div>
        </div>

        {/* Violations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">TEAM</th>
                <th className="py-2.5 px-3">TRACK</th>
                <th className="py-2.5 px-3">VIOLATION TYPE</th>
                <th className="py-2.5 px-3">SEVERITY</th>
                <th className="py-2.5 px-3">DESCRIPTION</th>
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs font-mono">
              {violations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-zinc-500 font-sans">
                    No violations found matching current filters.
                  </td>
                </tr>
              ) : (
                violations.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-white">{v.team_code}</span>
                      <span className="text-[10px] text-zinc-400 block font-sans">{v.team_name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300 capitalize">{v.track || 'Unassigned'}</td>
                    <td className="py-2.5 px-3 font-bold text-amber-400">{v.type}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${severityBadge(v.severity)}`}>
                        {v.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300 font-sans max-w-xs truncate">{v.description}</td>
                    <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                      {new Date(v.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          v.status === 'OPEN'
                            ? 'bg-amber-500/20 text-amber-400'
                            : v.status === 'DISMISSED'
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      {v.status === 'OPEN' && (
                        <>
                          <button
                            onClick={() => handleUpdateViolation(v.id, 'REVIEWED')}
                            className="px-2 py-1 bg-blue-900/40 text-blue-300 hover:bg-blue-900/60 rounded text-[10px] font-bold"
                          >
                            REVIEW
                          </button>
                          <button
                            onClick={() => handleUpdateViolation(v.id, 'DISMISSED')}
                            className="px-2 py-1 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded text-[10px]"
                          >
                            DISMISS
                          </button>
                        </>
                      )}
                      <button
                        onClick={() =>
                          setSelectedTeam({ id: v.team_id, code: v.team_code, name: v.team_name, status: v.team_status })
                        }
                        className="px-2 py-1 bg-red-900/40 text-red-300 hover:bg-red-900/60 rounded text-[10px] font-bold"
                      >
                        ACTION
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMINISTRATIVE ACTIONS AUDIT TRAIL */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-3 border-b border-zinc-800">
          ADMINISTRATIVE ACTION AUDIT LOG
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                <th className="py-2 px-3">ADMIN</th>
                <th className="py-2 px-3">TARGET TEAM</th>
                <th className="py-2 px-3">ACTION</th>
                <th className="py-2 px-3">REASON</th>
                <th className="py-2 px-3 text-right">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs font-mono">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-zinc-500 font-sans">
                    No admin actions recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-800/30">
                    <td className="py-2 px-3 text-amber-400 font-bold">{a.admin_user}</td>
                    <td className="py-2 px-3 text-white">{a.team_code || 'SYSTEM'}</td>
                    <td className="py-2 px-3 font-bold text-blue-400">{a.action}</td>
                    <td className="py-2 px-3 text-zinc-300 font-sans max-w-sm truncate">{a.reason}</td>
                    <td className="py-2 px-3 text-right text-zinc-400 text-[11px]">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TEAM ACTION MODAL */}
      {selectedTeam && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">TEAM ACTION: {selectedTeam.code}</h3>
                <p className="text-xs text-zinc-400">{selectedTeam.name}</p>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="text-zinc-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleTeamStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">SET TEAM STATUS</label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white font-bold px-3 py-2 rounded text-xs outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Reinstate)</option>
                  <option value="SUSPENDED">SUSPENDED (Block Activity)</option>
                  <option value="DISQUALIFIED">DISQUALIFIED (Block All)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  MANDATORY REASON / NOTES
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  required
                  rows="3"
                  placeholder="State clear reason for this action for the audit log..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-white p-2.5 rounded text-xs outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTeam(null)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded text-xs font-bold"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold uppercase"
                >
                  {submittingAction ? 'SAVING...' : 'CONFIRM ACTION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
