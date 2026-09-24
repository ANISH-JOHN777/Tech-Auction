import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function EventControls() {
  const [settings, setSettings] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, targetState: '', title: '', message: '' });
  const [resetModal, setResetModal] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const sData = await api.getEventSettings();
      setSettings(sData || {});
      if (sData?.challenge_deadline) {
        setDeadlineInput(new Date(sData.challenge_deadline).toISOString().slice(0, 16));
      }

      const sumData = await api.getEventSummary();
      setSummary(sumData);
    } catch (err) {
      console.error('Failed to load event controls:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  function requestStateChange(nextState) {
    if (nextState === 'ENDED') {
      setConfirmModal({
        open: true,
        targetState: 'ENDED',
        title: 'END EVENT CONTEST?',
        message: 'This will lock all competition actions (bidding, AI, submissions) for all participant teams.',
      });
    } else if (nextState === 'PAUSED') {
      setConfirmModal({
        open: true,
        targetState: 'PAUSED',
        title: 'PAUSE EVENT?',
        message: 'This will temporarily pause student bidding and submission actions until resumed.',
      });
    } else {
      executeStateChange(nextState);
    }
  }

  async function executeStateChange(nextState) {
    setSaving(true);
    setConfirmModal({ open: false, targetState: '', title: '', message: '' });
    try {
      await api.updateAdminEventState(nextState);
      await loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDemoData() {
    setSaving(true);
    setResetModal(false);
    try {
      await api.resetDemoData();
      await loadData();
      alert('Demo data reset successfully!');
    } catch (err) {
      alert('Reset failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleLeaderboard() {
    const nextValue = settings.leaderboard_visible === 'true' ? 'false' : 'true';
    setSaving(true);
    try {
      const updated = await api.updateAdminEventSetting('leaderboard_visible', nextValue);
      setSettings(updated);
    } catch (err) {
      alert('Failed to update leaderboard visibility: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDeadline(e) {
    e.preventDefault();
    if (!deadlineInput) return;
    setSaving(true);
    try {
      const isoString = new Date(deadlineInput).toISOString();
      const updated = await api.updateAdminEventSetting('challenge_deadline', isoString);
      setSettings(updated);
      alert('Challenge deadline updated successfully!');
    } catch (err) {
      alert('Failed to update deadline: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const currentStatus = summary?.event_status || 'SETUP';

  const statusColors = {
    SETUP: 'bg-zinc-700 text-zinc-200 border-zinc-500',
    READY: 'bg-blue-900/60 text-blue-300 border-blue-500',
    LIVE: 'bg-emerald-900/60 text-emerald-300 border-emerald-500 animate-pulse',
    PAUSED: 'bg-amber-900/60 text-amber-300 border-amber-500',
    ENDED: 'bg-red-900/60 text-red-300 border-red-500',
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">
              ORGANIZER EVENT CONTROL
            </span>
            <h2 className="text-xl font-black text-white">EVENT STATE MACHINE & CONTROLS</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Supervise live event states, trigger phase transitions, manage deadline, and monitor active teams.
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-400 font-bold uppercase block">CURRENT STATUS</span>
            <span className={`px-3 py-1 rounded text-xs font-mono font-bold border mt-1 inline-block ${statusColors[currentStatus]}`}>
              ● {currentStatus}
            </span>
          </div>
        </div>

        {/* STATE TRANSITION ACTION BUTTONS */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-zinc-800">
          {currentStatus === 'SETUP' && (
            <button
              onClick={() => requestStateChange('READY')}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs uppercase"
            >
              [ MARK EVENT READY ]
            </button>
          )}

          {(currentStatus === 'READY' || currentStatus === 'PAUSED') && (
            <button
              onClick={() => requestStateChange('LIVE')}
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs uppercase"
            >
              {currentStatus === 'PAUSED' ? '[ RESUME EVENT ]' : '[ START EVENT LIVE ]'}
            </button>
          )}

          {currentStatus === 'LIVE' && (
            <button
              onClick={() => requestStateChange('PAUSED')}
              disabled={saving}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-xs uppercase"
            >
              [ PAUSE EVENT ]
            </button>
          )}

          {currentStatus !== 'ENDED' && (
            <button
              onClick={() => requestStateChange('ENDED')}
              disabled={saving}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-xs uppercase"
            >
              [ END EVENT ]
            </button>
          )}

          <button
            onClick={() => setResetModal(true)}
            disabled={saving}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/40 rounded font-bold text-xs uppercase ml-auto"
          >
            ⚠️ RESET DEMO DATA
          </button>
        </div>
      </div>

      {/* EVENT STATS METRICS BOARD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-center">
          <span className="text-[10px] text-zinc-400 font-bold uppercase block">REGISTERED TEAMS</span>
          <div className="text-2xl font-mono font-black text-white mt-1">{summary?.registered_teams ?? 0}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-center">
          <span className="text-[10px] text-zinc-400 font-bold uppercase block">ELIGIBLE TEAMS</span>
          <div className="text-2xl font-mono font-black text-emerald-400 mt-1">{summary?.eligible_teams ?? 0}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-center">
          <span className="text-[10px] text-zinc-400 font-bold uppercase block">ACTIVE TEAMS</span>
          <div className="text-2xl font-mono font-black text-blue-400 mt-1">{summary?.active_teams ?? 0}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-center">
          <span className="text-[10px] text-zinc-400 font-bold uppercase block">SUBMITTED TEAMS</span>
          <div className="text-2xl font-mono font-black text-amber-400 mt-1">{summary?.submitted_teams ?? 0}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-center">
          <span className="text-[10px] text-zinc-400 font-bold uppercase block">FLAGGED TEAMS</span>
          <div className="text-2xl font-mono font-black text-red-400 mt-1">{summary?.flagged_teams ?? 0}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-center">
          <span className="text-[10px] text-zinc-400 font-bold uppercase block">SUSPENDED</span>
          <div className="text-2xl font-mono font-black text-purple-400 mt-1">{summary?.suspended_teams ?? 0}</div>
        </div>
      </div>

      {/* TIMINGS & LEADERBOARD CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leaderboard Visibility Control */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-white uppercase">LIVE LEADERBOARD VISIBILITY</h3>
              <p className="text-xs text-zinc-400">Controls whether students can view official rank standings.</p>
            </div>

            <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
              settings.leaderboard_visible === 'true'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-red-500/20 text-red-400 border border-red-500/40'
            }`}>
              {settings.leaderboard_visible === 'true' ? 'VISIBLE' : 'HIDDEN'}
            </span>
          </div>

          <button
            onClick={handleToggleLeaderboard}
            disabled={saving}
            className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition ${
              settings.leaderboard_visible === 'true'
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                : 'gold-button shadow-lg'
            }`}
          >
            {settings.leaderboard_visible === 'true' ? '🔒 HIDE LEADERBOARD FROM STUDENTS' : '🏆 SHOW LEADERBOARD TO STUDENTS'}
          </button>
        </div>

        {/* Deadline Configuration */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
          <div className="pb-3 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-white uppercase">CHALLENGE SUBMISSION DEADLINE</h3>
            <p className="text-xs text-zinc-400">Server rejects any submission attempts after this timestamp.</p>
          </div>

          <form onSubmit={handleSaveDeadline} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                DEADLINE DATE & TIME
              </label>
              <input
                type="datetime-local"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white font-mono px-3 py-2 rounded text-xs outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="gold-button w-full py-2.5 rounded text-xs font-bold uppercase"
            >
              {saving ? 'SAVING…' : 'UPDATE DEADLINE'}
            </button>
          </form>
        </div>
      </div>

      {/* CONFIRMATION MODAL FOR PAUSE / END */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/40 max-w-md w-full p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white uppercase">{confirmModal.title}</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ open: false, targetState: '', title: '', message: '' })}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-bold rounded"
              >
                CANCEL
              </button>
              <button
                onClick={() => executeStateChange(confirmModal.targetState)}
                disabled={saving}
                className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded text-xs font-bold uppercase"
              >
                CONFIRM {confirmModal.targetState}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR RESET DEMO DATA */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/40 max-w-md w-full p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white uppercase">RESET DEMO DATA?</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              This will restore all demo teams, reset auction rooms, clears submitted scores, and restore seed catalog items.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setResetModal(false)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-bold rounded"
              >
                CANCEL
              </button>
              <button
                onClick={handleResetDemoData}
                disabled={saving}
                className="gold-button px-5 py-2 rounded text-xs font-bold uppercase"
              >
                CONFIRM RESET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
