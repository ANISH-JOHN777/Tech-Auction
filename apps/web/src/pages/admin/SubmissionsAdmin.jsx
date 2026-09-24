import React, { useState, useEffect } from 'react';
import { RefreshCw, Unlock, Trophy, X } from 'lucide-react';
import { api } from '../../services/api';

export default function SubmissionsAdmin() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Submission Modal state
  const [selectedSub, setSelectedSub] = useState(null);
  const [bugPoints, setBugPoints] = useState(0);
  const [functionalPoints, setFunctionalPoints] = useState(0);
  const [technicalPoints, setTechnicalPoints] = useState(0);
  const [fixPoints, setFixPoints] = useState(0);
  const [reportPoints, setReportPoints] = useState(0);
  const [presentationPoints, setPresentationPoints] = useState(0);
  const [judgeNotes, setJudgeNotes] = useState('');
  const [savingScore, setSavingScore] = useState(false);
  const [reopenNotes, setReopenNotes] = useState('');
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  async function loadSubmissions() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminSubmissions(search, trackFilter, statusFilter);
      setSubmissions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubmissions();
  }, [search, trackFilter, statusFilter]);

  async function openSubmissionDetail(id) {
    try {
      const detail = await api.getAdminSubmissionById(id);
      setSelectedSub(detail);
      setShowReopenForm(false);
      setReopenNotes('');
      setConfirmFinalize(false);
      if (detail.score) {
        setBugPoints(detail.score.bug_points || 0);
        setFunctionalPoints(detail.score.functional_points || 0);
        setTechnicalPoints(detail.score.technical_points || 0);
        setFixPoints(detail.score.fix_points || 0);
        setReportPoints(detail.score.report_points || 0);
        setPresentationPoints(detail.score.presentation_points || 0);
        setJudgeNotes(detail.score.judge_notes || '');
      } else {
        setBugPoints(0);
        setFunctionalPoints(0);
        setTechnicalPoints(0);
        setFixPoints(0);
        setReportPoints(0);
        setPresentationPoints(0);
        setJudgeNotes('');
      }
    } catch (err) {
      alert('Failed to load submission detail: ' + err.message);
    }
  }

  async function executeEvaluate(targetStatus = 'EVALUATED') {
    if (!selectedSub) return;
    setSavingScore(true);
    setConfirmFinalize(false);
    try {
      const updated = await api.evaluateAdminSubmission(selectedSub.id, {
        status: targetStatus,
        bugPoints: Number(bugPoints),
        functionalPoints: Number(functionalPoints),
        technicalPoints: Number(technicalPoints),
        fixPoints: Number(fixPoints),
        reportPoints: Number(reportPoints),
        presentationPoints: Number(presentationPoints),
        judgeNotes,
      });
      setSelectedSub(updated);
      alert(targetStatus === 'FINAL' ? 'Score finalized!' : 'Score draft saved.');
      loadSubmissions();
    } catch (err) {
      alert('Evaluation failed: ' + err.message);
    } finally {
      setSavingScore(false);
    }
  }

  function handleEvaluate(targetStatus = 'EVALUATED') {
    if (targetStatus === 'FINAL') {
      setConfirmFinalize(true);
    } else {
      executeEvaluate('EVALUATED');
    }
  }

  async function handleReopen() {
    if (!selectedSub) return;
    try {
      const updated = await api.reopenAdminSubmission(selectedSub.id, reopenNotes);
      setSelectedSub(updated);
      setShowReopenForm(false);
      alert('Submission reopened for team revision.');
      loadSubmissions();
    } catch (err) {
      alert('Failed to reopen submission: ' + err.message);
    }
  }

  const calculatedTotal = Number(bugPoints) + Number(functionalPoints) + Number(technicalPoints) + Number(fixPoints) + Number(reportPoints) + Number(presentationPoints);
  const isFullStack = selectedSub?.track === 'full-stack';

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">
              ORGANIZER EVALUATION PANEL
            </span>
            <h2 className="text-xl font-black text-white">CHALLENGE SUBMISSIONS & SCORING</h2>
          </div>

          <button
            onClick={loadSubmissions}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold px-3 py-1.5 rounded border border-zinc-700 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REFRESH LIST</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by team name or code..."
            className="bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white px-3 py-2 rounded text-xs outline-none"
          />

          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded text-xs outline-none"
          >
            <option value="">All Tracks</option>
            <option value="full-stack">Full-Stack Track</option>
            <option value="cybersecurity">Cybersecurity Track</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded text-xs outline-none"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="EVALUATED">EVALUATED</option>
            <option value="FINAL">FINAL</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg font-mono">
          {error}
        </div>
      )}

      {/* Submissions Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto shadow-xl">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 uppercase">
              <th className="p-3.5">Team</th>
              <th className="p-3.5">Track</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Submitted At</th>
              <th className="p-3.5 text-center">Score</th>
              <th className="p-3.5">Evaluator</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-300">
            {loading && submissions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">
                  Loading submissions...
                </td>
              </tr>
            ) : submissions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-500">
                  No submissions found matching criteria.
                </td>
              </tr>
            ) : (
              submissions.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-950/50">
                  <td className="p-3.5">
                    <div className="font-bold text-white font-sans">{s.team_name}</div>
                    <div className="text-[10px] text-zinc-500">{s.team_code}</div>
                  </td>
                  <td className="p-3.5 uppercase">{s.track}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.status === 'FINAL'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : s.status === 'EVALUATED'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : s.status === 'UNDER_REVIEW'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}>
                      {s.status} (v{s.submission_version})
                    </span>
                  </td>
                  <td className="p-3.5 text-[11px]">
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td className="p-3.5 text-center font-bold text-amber-400 text-sm">
                    {s.total_score !== null && s.total_score !== undefined ? `${s.total_score}/100` : '—'}
                  </td>
                  <td className="p-3.5 text-zinc-400">
                    {s.evaluated_by || '—'}
                  </td>
                  <td className="p-3.5 text-right font-sans">
                    <button
                      onClick={() => openSubmissionDetail(s.id)}
                      className="bg-zinc-800 hover:bg-amber-500 hover:text-black text-amber-400 text-xs font-bold px-3 py-1 rounded border border-zinc-700 transition"
                    >
                      EVALUATE
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* EVALUATION MODAL */}
      {selectedSub && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/40 w-full max-w-3xl p-6 rounded-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-zinc-800 pb-4">
              <div>
                <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">
                  EVALUATE TEAM SUBMISSION
                </span>
                <h2 className="text-2xl font-black text-white">{selectedSub.team_name} ({selectedSub.team_code})</h2>
                <div className="text-xs text-zinc-400 font-mono mt-0.5">
                  TRACK: <span className="text-amber-400 uppercase font-bold">{selectedSub.track}</span> | STATUS: <span className="text-white font-bold">{selectedSub.status}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="text-zinc-400 hover:text-white text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Submission Package Reference */}
            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 space-y-1">
              <span className="text-[10px] text-zinc-500 font-mono uppercase">SUBMISSION REFERENCE</span>
              <div className="text-xs font-mono text-amber-300 font-bold">{selectedSub.submission_reference}</div>
              <div className="text-[10px] text-zinc-500">
                Submitted At: {new Date(selectedSub.submitted_at).toLocaleString()}
              </div>
            </div>

            {/* Rubric Evaluation Form */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">
                EVALUATION RUBRIC ({isFullStack ? 'FULL-STACK DEVELOPMENT' : 'CYBERSECURITY'})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                {isFullStack ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">BUG FIXES (0 - 60)</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={bugPoints}
                        onChange={(e) => setBugPoints(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-amber-400 font-mono font-bold px-3 py-2 rounded outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">E2E TESTING (0 - 15)</label>
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={functionalPoints}
                        onChange={(e) => setFunctionalPoints(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-amber-400 font-mono font-bold px-3 py-2 rounded outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">CODE QUALITY (0 - 10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={technicalPoints}
                        onChange={(e) => setTechnicalPoints(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-amber-400 font-mono font-bold px-3 py-2 rounded outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">TECHNICAL EXPLANATION (0 - 10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={reportPoints}
                        onChange={(e) => setReportPoints(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-amber-400 font-mono font-bold px-3 py-2 rounded outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">PRESENTATION (0 - 5)</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={presentationPoints}
                        onChange={(e) => setPresentationPoints(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-amber-400 font-mono font-bold px-3 py-2 rounded outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">VULNERABILITY ID (0 - 30)</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={bugPoints}
                        onChange={(e) => setBugPoints(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-amber-400 font-mono font-bold px-3 py-2 rounded outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">ANALYSIS & EVIDENCE (0 - 20)</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={functionalPoints}
                        onChange={(e) => setFunctionalPoints(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-amber-400 font-mono font-bold px-3 py-2 rounded outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">RISK EXPLANATION (0 - 15)</label>
                      <input
                        type="number"
                        min="0"
                        max="15"
                        value={technicalPoints}
                        onChange={(e) => setTechnicalPoints(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-amber-400 font-mono font-bold px-3 py-2 rounded outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">MITIGATION & FIX (0 - 20)</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={fixPoints}
                        onChange={(e) => setFixPoints(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-amber-400 font-mono font-bold px-3 py-2 rounded outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">REPORT QUALITY (0 - 10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={reportPoints}
                        onChange={(e) => setReportPoints(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-amber-400 font-mono font-bold px-3 py-2 rounded outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">PRESENTATION (0 - 5)</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={presentationPoints}
                        onChange={(e) => setPresentationPoints(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 text-amber-400 font-mono font-bold px-3 py-2 rounded outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Live Calculated Total */}
                <div className="bg-zinc-900 p-4 rounded-lg border border-amber-500/30 flex flex-col justify-center items-center text-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">CALCULATED TOTAL SCORE</span>
                  <div className="text-3xl font-mono font-black text-amber-400 my-1">
                    {calculatedTotal} <span className="text-sm font-normal text-zinc-500">/ 100</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">Server Authoritative Calculation</span>
                </div>
              </div>

              {/* Judge Notes */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1 uppercase">
                  CONFIDENTIAL JUDGE NOTES
                </label>
                <textarea
                  value={judgeNotes}
                  onChange={(e) => setJudgeNotes(e.target.value)}
                  placeholder="Enter confidential feedback or notes for organizers..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white p-3 rounded-lg text-xs font-sans outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-between items-center pt-4 border-t border-zinc-800 gap-3">
                <button
                  type="button"
                  onClick={() => setShowReopenForm(!showReopenForm)}
                  className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 px-3 py-2 rounded font-bold transition flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{showReopenForm ? 'CANCEL REOPEN' : 'REOPEN SUBMISSION'}</span>
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleEvaluate('EVALUATED')}
                    disabled={savingScore}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-4 py-2 rounded text-xs font-bold uppercase"
                  >
                    {savingScore ? 'SAVING…' : 'SAVE DRAFT SCORE'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEvaluate('FINAL')}
                    disabled={savingScore}
                    className="gold-button px-6 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>FINALIZE SCORE</span>
                  </button>
                </div>
              </div>

              {/* Reopen Form Drawer */}
              {showReopenForm && (
                <div className="bg-purple-950/40 border border-purple-500/40 p-4 rounded-lg space-y-3 mt-4">
                  <div className="text-xs text-purple-300 font-bold uppercase">
                    REOPEN SUBMISSION FOR REVISION
                  </div>
                  <input
                    type="text"
                    value={reopenNotes}
                    onChange={(e) => setReopenNotes(e.target.value)}
                    placeholder="Reason for reopening (e.g. Student uploaded wrong file)..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-white p-2 rounded text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleReopen}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded text-xs font-bold uppercase"
                  >
                    EXECUTE REOPEN
                  </button>
                </div>
              )}

              {/* Evaluation History Audit Trail */}
              {selectedSub.events && selectedSub.events.length > 0 && (
                <div className="pt-4 border-t border-zinc-800 space-y-2">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    EVALUATION AUDIT TRAIL LOG
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-xs">
                    {selectedSub.events.map((ev) => (
                      <div key={ev.id} className="bg-zinc-950 p-2.5 rounded border border-zinc-800 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-amber-400">{ev.action}</span>
                          <span className="text-zinc-400 ml-2">by {ev.actor}</span>
                          {ev.notes && <div className="text-zinc-500 text-[10px] mt-0.5">{ev.notes}</div>}
                        </div>
                        <span className="text-[10px] text-zinc-600">{new Date(ev.created_at).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Finalizing Score */}
      {confirmFinalize && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/40 max-w-md w-full p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white uppercase">FINALIZE SUBMISSION SCORE?</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to finalize the score of <strong className="text-amber-400">{calculatedTotal} / 100</strong> for team <strong className="text-white">{selectedSub?.team_name}</strong>? Finalized scores will publish to official rankings.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmFinalize(false)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-bold rounded"
              >
                CANCEL
              </button>
              <button
                onClick={() => executeEvaluate('FINAL')}
                disabled={savingScore}
                className="gold-button px-5 py-2 rounded text-xs font-bold uppercase"
              >
                CONFIRM & FINALIZE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
