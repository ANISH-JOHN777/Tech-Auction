import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Submission({ team }) {
  const [submission, setSubmission] = useState(null);
  const [settings, setSettings] = useState({});
  const [submissionType, setSubmissionType] = useState('FILE');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getSubmission();
      setSubmission(res.submission);
      setSettings(res.settings || {});
      if (res.submission?.submission_reference) {
        setReference(res.submission.submission_reference);
      }
      if (res.submission?.submission_type) {
        setSubmissionType(res.submission.submission_type);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!settings.challenge_deadline) return;
    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((new Date(settings.challenge_deadline).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [settings.challenge_deadline]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  async function handleSubmission(isFinal = false) {
    if (!reference.trim()) {
      setError('Please provide a submission reference (file name, path, or repository link).');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.submitChallenge({
        submissionType,
        submissionReference: reference.trim(),
        isFinal,
      });
      setSubmission(res);
      setShowConfirmModal(false);
      setSuccessMsg(isFinal ? '🎉 FINAL SUBMISSION RECORDED SUCCESSFULLY!' : 'Draft submission updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const trackName = team?.challenge === 'full-stack' ? 'Full-Stack Development' : 'Cybersecurity';
  const challengeName = team?.challenge === 'full-stack' ? 'CampusConnect' : 'SecureVault';
  const isFinalSubmitted = submission?.status === 'FINAL';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-zinc-900 border border-amber-500/30 p-6 rounded-xl shadow-xl gold-glow-border space-y-6">
        <div className="flex flex-wrap justify-between items-center pb-4 border-b border-zinc-800 gap-4">
          <div>
            <span className="text-xs font-bold text-amber-500 tracking-wider uppercase">
              CHALLENGE SUBMISSION PORTAL
            </span>
            <h2 className="text-2xl font-black text-white">Track: {trackName}</h2>
            <div className="text-xs text-zinc-400 font-mono mt-0.5">
              TEAM: <strong className="text-white">{team?.name} ({team?.code})</strong> | CHALLENGE: <strong className="text-amber-400">{challengeName}</strong>
            </div>
          </div>

          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-center">
            <span className="text-[10px] text-zinc-500 font-mono uppercase block">TIME REMAINING</span>
            <div className="text-xl font-mono font-black text-amber-400">
              ⏱️ {formatTime(secondsLeft)}
            </div>
          </div>
        </div>

        {/* Submission Status Banner */}
        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 flex justify-between items-center">
          <div>
            <span className="text-xs text-zinc-400 font-semibold uppercase block">SUBMISSION STATUS</span>
            <div className="text-lg font-mono font-black mt-0.5">
              {submission ? (
                <span className={`px-2.5 py-0.5 rounded text-xs uppercase font-bold ${
                  submission.status === 'FINAL'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : submission.status === 'EVALUATED'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}>
                  {submission.status} (v{submission.submission_version})
                </span>
              ) : (
                <span className="bg-zinc-800 text-zinc-400 text-xs px-2.5 py-0.5 rounded font-bold uppercase">
                  NOT SUBMITTED
                </span>
              )}
            </div>
          </div>

          {submission?.submitted_at && (
            <div className="text-right text-xs font-mono text-zinc-400">
              <div>Submitted At:</div>
              <div className="text-amber-400 font-bold">{new Date(submission.submitted_at).toLocaleString()}</div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg font-mono">
            🚨 {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-lg font-mono">
            {successMsg}
          </div>
        )}

        {/* Submission Form */}
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase mb-2">
              1. SELECT SUBMISSION TYPE
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-zinc-300 font-mono cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="FILE"
                  checked={submissionType === 'FILE'}
                  onChange={() => setSubmissionType('FILE')}
                  disabled={isFinalSubmitted}
                  className="accent-amber-500"
                />
                ZIP / Project Archive (.zip, .tar.gz)
              </label>

              <label className="flex items-center gap-2 text-xs text-zinc-300 font-mono cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="REFERENCE"
                  checked={submissionType === 'REFERENCE'}
                  onChange={() => setSubmissionType('REFERENCE')}
                  disabled={isFinalSubmitted}
                  className="accent-amber-500"
                />
                Local Path / Git Repository Reference
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase mb-2">
              2. SUBMISSION PACKAGE REFERENCE / FILE NAME
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isFinalSubmitted}
              placeholder={
                submissionType === 'FILE'
                  ? 'e.g. CampusConnect_TeamFS01_v1.zip'
                  : 'e.g. C:\\Challenges\\CampusConnect or https://github.com/.../CampusConnect'
              }
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white p-3 rounded-lg text-xs font-mono outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Buttons */}
          {!isFinalSubmitted ? (
            <div className="flex flex-wrap gap-4 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => handleSubmission(false)}
                disabled={submitting || secondsLeft <= 0}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-6 py-3 rounded-lg text-xs font-bold uppercase transition disabled:opacity-50"
              >
                {submitting ? 'SAVING…' : 'SAVE DRAFT SUBMISSION'}
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={submitting || secondsLeft <= 0 || !reference.trim()}
                className="gold-button px-8 py-3 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              >
                🚀 SUBMIT FINAL
              </button>
            </div>
          ) : (
            <div className="bg-zinc-950 border border-emerald-500/30 p-4 rounded-lg text-center space-y-1">
              <div className="text-emerald-400 font-bold text-xs uppercase">
                ✅ FINAL SUBMISSION LOCKED & RECORDED
              </div>
              <p className="text-[11px] text-zinc-400">
                Your submission is finalized and queued for judge evaluation. Editing is locked unless reopened by an event organizer.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/40 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white uppercase">CONFIRM FINAL SUBMISSION</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              "Once submitted, your final submission cannot be changed unless an organizer reopens it."
            </p>
            <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-xs font-mono text-amber-400">
              Package: <strong>{reference}</strong>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={() => handleSubmission(true)}
                disabled={submitting}
                className="gold-button px-6 py-2 rounded text-xs font-bold uppercase"
              >
                {submitting ? 'SUBMITTING…' : 'CONFIRM SUBMISSION'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
