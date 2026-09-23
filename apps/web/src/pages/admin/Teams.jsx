import React, { useState, useEffect } from 'react';
import TeamTable from '../../components/admin/TeamTable';
import TeamDetails from '../../components/admin/TeamDetails';
import { api } from '../../services/api';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState('');
  const [challengeFilter, setChallengeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [error, setError] = useState('');

  async function loadTeams() {
    setLoading(true);
    try {
      const data = await api.getAdminTeams(search, challengeFilter);
      setTeams(data.teams);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeams();
  }, [search, challengeFilter]);

  async function handleToggleEligibility(id, newStatus) {
    try {
      await api.updateAdminTeam(id, { auction_eligible: newStatus });
      loadTeams();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  }

  async function handleToggleLogin(id, newStatus) {
    try {
      await api.updateAdminTeam(id, { login_enabled: newStatus });
      loadTeams();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  }

  async function handleUpdateTeam(id, updates) {
    await api.updateAdminTeam(id, updates);
    loadTeams();
  }

  async function handleResetDemo() {
    if (!window.confirm('Reset all registrations and return to Demo Data?')) return;
    try {
      await api.resetDemoData();
      loadTeams();
    } catch (err) {
      alert('Failed to reset demo data: ' + err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div>
          <h2 className="text-xl font-black text-white">TEAM REGISTRATION MANAGEMENT</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Manage student team credentials, virtual wallets, auction eligibility & track locks.
          </p>
        </div>
        <button
          onClick={handleResetDemo}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-4 py-2 rounded transition"
        >
          RESET DEMO DATA
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, team name, college…"
            className="bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white px-4 py-2.5 rounded-lg text-xs outline-none flex-1 max-w-sm"
          />

          <select
            value={challengeFilter}
            onChange={(e) => setChallengeFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-white px-3 py-2.5 rounded-lg text-xs outline-none"
          >
            <option value="">All Challenges</option>
            <option value="full-stack">Full-Stack</option>
            <option value="cybersecurity">Cybersecurity</option>
          </select>
        </div>

        <div className="text-xs text-zinc-400 font-mono">
          TOTAL TEAMS: <span className="text-amber-400 font-bold">{teams.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center text-xs text-zinc-400 font-mono">
          LOADING TEAMS…
        </div>
      ) : (
        <TeamTable
          teams={teams}
          onSelectTeam={(t) => setSelectedTeam(t)}
          onToggleEligibility={handleToggleEligibility}
          onToggleLogin={handleToggleLogin}
        />
      )}

      {selectedTeam && (
        <TeamDetails
          team={selectedTeam}
          onUpdate={handleUpdateTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
}
