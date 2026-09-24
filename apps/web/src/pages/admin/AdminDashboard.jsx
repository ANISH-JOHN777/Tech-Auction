import React, { useState, useEffect } from 'react';
import Teams from './Teams';
import RegistrationImport from './RegistrationImport';
import AuctionControl from './AuctionControl';
import AIMonitor from './AIMonitor';
import SubmissionsAdmin from './SubmissionsAdmin';
import EventControls from './EventControls';
import AntiMalpracticeAdmin from './AntiMalpracticeAdmin';
import AuditLogs from '../../components/admin/AuditLogs';
import { api } from '../../services/api';

export default function AdminDashboard({ admin, onLogout }) {
  const [activeTab, setActiveTab] = useState('teams');
  const [summary, setSummary] = useState(null);

  async function loadSummary() {
    try {
      const data = await api.getEventSummary();
      setSummary(data);
    } catch (e) {
      console.warn('Failed to load admin summary:', e);
    }
  }

  useEffect(() => {
    loadSummary();
    const interval = setInterval(loadSummary, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap justify-between items-center bg-zinc-900 border border-amber-500/30 p-6 rounded-xl shadow-xl gold-glow-border">
        <div>
          <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">
            ORGANIZER ADMIN PANEL
          </span>
          <h1 className="text-2xl font-black text-white">TECH AUCTION 2026</h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-400 font-mono">
            LOGGED IN AS: <span className="text-amber-400 font-bold">{admin.username}</span>
          </span>
          <button
            onClick={onLogout}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-3 py-1.5 rounded transition border border-zinc-700"
          >
            ADMIN LOGOUT
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 font-mono">
            <span className="text-[10px] text-zinc-500 uppercase block">EVENT STATUS</span>
            <span className="text-sm font-black text-amber-400">{summary.event_status || 'LIVE'}</span>
          </div>
          <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 font-mono">
            <span className="text-[10px] text-zinc-500 uppercase block">TOTAL TEAMS</span>
            <span className="text-sm font-black text-white">{summary.total_teams || 0}</span>
          </div>
          <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 font-mono">
            <span className="text-[10px] text-zinc-500 uppercase block">ACTIVE / SUSP</span>
            <span className="text-sm font-black text-emerald-400">
              {summary.active_teams || 0} <span className="text-zinc-600">/</span> <span className="text-red-400">{summary.suspended_teams || 0}</span>
            </span>
          </div>
          <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 font-mono">
            <span className="text-[10px] text-zinc-500 uppercase block">FS / CY TEAMS</span>
            <span className="text-sm font-black text-zinc-300">
              {summary.full_stack_teams || 0} / {summary.cybersecurity_teams || 0}
            </span>
          </div>
          <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 font-mono">
            <span className="text-[10px] text-zinc-500 uppercase block">SUBMISSIONS</span>
            <span className="text-sm font-black text-blue-400">{summary.submissions_count || 0}</span>
          </div>
          <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 font-mono">
            <span className="text-[10px] text-zinc-500 uppercase block">VIOLATIONS</span>
            <span className="text-sm font-black text-red-400">{summary.violations_count || 0}</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
        {[
          { id: 'teams', label: '👥 TEAMS MANAGEMENT' },
          { id: 'auction', label: '🏷️ AUCTION CONTROL' },
          { id: 'submissions', label: '📝 SUBMISSIONS & EVALUATION' },
          { id: 'event', label: '⚙️ EVENT CONTROLS' },
          { id: 'antimalpractice', label: '🛡️ ANTI-MALPRACTICE' },
          { id: 'ai', label: '⚡ AI ASSIST MONITOR' },
          { id: 'audit', label: '📜 AUDIT LOGS' },
          { id: 'import', label: '📥 CSV IMPORT' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-amber-500 text-black shadow'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'teams' ? (
        <Teams />
      ) : activeTab === 'auction' ? (
        <AuctionControl />
      ) : activeTab === 'submissions' ? (
        <SubmissionsAdmin />
      ) : activeTab === 'event' ? (
        <EventControls />
      ) : activeTab === 'antimalpractice' ? (
        <AntiMalpracticeAdmin />
      ) : activeTab === 'ai' ? (
        <AIMonitor />
      ) : activeTab === 'audit' ? (
        <AuditLogs />
      ) : (
        <RegistrationImport />
      )}
    </div>
  );
}
