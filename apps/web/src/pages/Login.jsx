import React, { useState, useEffect } from 'react';
import { AlertTriangle, UserCheck, Users, Shield, Code2 } from 'lucide-react';
import { api } from '../services/api';

export default function Login({ onStudentLogin, onJoinOrCreateTeam, onLogin, student, error }) {
  const [loginMode, setLoginMode] = useState('student'); // 'student' | 'legacy'
  const [studentCode, setStudentCode] = useState('STU001');
  const [pin, setPin] = useState('1234');

  // Legacy team code state
  const [teamCode, setTeamCode] = useState('');
  const [legacyPin, setLegacyPin] = useState('1234');

  // Team Formation state (Step 2)
  const [teamName, setTeamName] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('full-stack');
  const [matchedTeam, setMatchedTeam] = useState(null);
  const [checkingTeam, setCheckingTeam] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [serverStatus, setServerStatus] = useState('CHECKING');
  const [friendlyError, setFriendlyError] = useState('');

  useEffect(() => {
    async function checkServer() {
      try {
        await api.getEventSettings();
        setServerStatus('ONLINE');
      } catch (err) {
        setServerStatus('OFFLINE');
      }
    }
    checkServer();
  }, []);

  useEffect(() => {
    if (!error) {
      setFriendlyError('');
      return;
    }
    const lower = error.toLowerCase();
    if (lower.includes('invalid') || lower.includes('credentials') || lower.includes('pin')) {
      setFriendlyError('Invalid credentials. Please verify your Student ID/PIN.');
    } else if (lower.includes('full') || lower.includes('team_full')) {
      setFriendlyError('Team already has maximum 4 members.');
    } else if (lower.includes('disabled') || lower.includes('suspended')) {
      setFriendlyError('Login is currently disabled by event organizers.');
    } else {
      setFriendlyError(error);
    }
  }, [error]);

  // Dynamic team name match check to auto-detect existing track & member count
  useEffect(() => {
    const trimmed = teamName.trim();
    if (!trimmed) {
      setMatchedTeam(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingTeam(true);
      try {
        const teams = await api.getPublicLeaderboard().catch(() => []);
        const found = (Array.isArray(teams) ? teams : []).find(
          (t) => t.name && t.name.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (found) {
          setMatchedTeam(found);
          if (found.challenge) {
            setSelectedTrack(found.challenge);
          }
        } else {
          setMatchedTeam(null);
        }
      } catch (err) {
        setMatchedTeam(null);
      } finally {
        setCheckingTeam(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [teamName]);

  async function handleStudentAuthSubmit(e) {
    e.preventDefault();
    if (!studentCode.trim() || !pin.trim()) return;
    setSubmitting(true);
    setFriendlyError('');
    try {
      await onStudentLogin(studentCode.trim().toUpperCase(), pin.trim());
    } catch (err) {
      // Caught in hook
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTeamFormationSubmit(e) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setSubmitting(true);
    setFriendlyError('');
    try {
      await onJoinOrCreateTeam(teamName.trim(), selectedTrack);
    } catch (err) {
      // Caught in hook
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLegacySubmit(e) {
    e.preventDefault();
    if (!teamCode.trim()) return;
    setSubmitting(true);
    setFriendlyError('');
    try {
      await onLogin(teamCode.trim().toUpperCase(), legacyPin.trim());
    } catch (err) {
      // Caught in hook
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl gold-glow-border relative">
        {/* Server Status Indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              serverStatus === 'ONLINE'
                ? 'bg-emerald-400 animate-pulse'
                : serverStatus === 'OFFLINE'
                ? 'bg-red-500'
                : 'bg-amber-400'
            }`}
          ></span>
          <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase">
            SERVER {serverStatus}
          </span>
        </div>

        <div className="text-center mb-6">
          <div className="text-[11px] font-bold tracking-widest text-amber-500 uppercase mb-1">
            SNS COLLEGE OF TECHNOLOGY — DEPT OF IT
          </div>
          <div className="text-[10px] text-zinc-400 font-mono tracking-widest mb-3">
            BID · THINK · SOLVE · WIN
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-1">
            TECH <span className="gold-gradient-text">AUCTION</span>
          </h1>
          <p className="text-xs text-zinc-400">Student Portal & Self-Formation</p>
        </div>

        {/* Mode Selector Tabs (only when not logged into student step 1) */}
        {!student && (
          <div className="flex gap-2 mb-6 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setLoginMode('student')}
              className={`flex-1 py-1.5 rounded-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'student' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>STUDENT ID</span>
            </button>

            <button
              type="button"
              onClick={() => setLoginMode('legacy')}
              className={`flex-1 py-1.5 rounded-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMode === 'legacy' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>TEAM CODE</span>
            </button>
          </div>
        )}

        {friendlyError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg text-center font-mono flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{friendlyError}</span>
          </div>
        )}

        {/* STEP 1: Student Login Form */}
        {!student && loginMode === 'student' && (
          <form onSubmit={handleStudentAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 tracking-wider">
                STUDENT ID
              </label>
              <input
                type="text"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                placeholder="e.g. STU001 to STU040"
                required
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white font-mono text-center tracking-widest text-lg py-3 rounded-lg outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 tracking-wider">
                PIN / PASSWORD
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN (Default: 1234)"
                required
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white font-mono text-center tracking-widest text-lg py-3 rounded-lg outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !studentCode.trim() || serverStatus === 'OFFLINE'}
              className="gold-button w-full py-3.5 rounded-lg font-bold text-sm tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'VERIFYING STUDENT ID…' : 'VERIFY STUDENT CREDENTIALS'}
            </button>
          </form>
        )}

        {/* STEP 2: Team Self-Formation Form (Logged in as student, but no team assigned yet) */}
        {student && !student.team_id && (
          <form onSubmit={handleTeamFormationSubmit} className="space-y-5">
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs font-mono text-amber-300 flex items-center justify-between">
              <div>
                STUDENT LOGGED IN: <strong className="text-white">{student.student_code}</strong>
              </div>
              <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 text-amber-400 font-bold">
                NO TEAM YET
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 tracking-wider">
                TEAM NAME
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter Team Name (e.g. Binary Bosses)"
                required
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white font-mono text-center tracking-wide text-base py-3 rounded-lg outline-none"
              />
            </div>

            {/* Dynamic Status Display for Existing vs New Team */}
            {teamName.trim() && (
              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg font-mono text-xs space-y-1">
                {checkingTeam ? (
                  <div className="text-zinc-500 animate-pulse">CHECKING TEAM NAME AVAILABILITY…</div>
                ) : matchedTeam ? (
                  <div>
                    <div className="text-emerald-400 font-bold flex items-center justify-between">
                      <span>TEAM FOUND: {matchedTeam.name}</span>
                      <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                        EXISTING TEAM
                      </span>
                    </div>
                    <div className="text-zinc-400 text-[11px] mt-1">
                      Track: <strong className="text-amber-400 font-bold uppercase">{matchedTeam.challenge || 'Inherited'}</strong>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 italic">
                      Joining this team will use its existing track.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-amber-400 font-bold">NEW TEAM CREATION</div>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                      Your team's first member selects the track. Other members joining this team will automatically use the same track.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Track Selection Selector */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 tracking-wider">
                CHALLENGE TRACK {matchedTeam && <span className="text-zinc-500 font-normal">(Inherited from team)</span>}
              </label>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <button
                  type="button"
                  disabled={!!matchedTeam}
                  onClick={() => setSelectedTrack('full-stack')}
                  className={`p-3 rounded-lg border font-bold text-center transition flex flex-col items-center gap-1 cursor-pointer disabled:opacity-60 ${
                    selectedTrack === 'full-stack'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white'
                  }`}
                >
                  <Code2 className="w-5 h-5 text-amber-400" />
                  <span>FULL STACK</span>
                  <span className="text-[9px] font-normal text-zinc-400">CampusConnect</span>
                </button>

                <button
                  type="button"
                  disabled={!!matchedTeam}
                  onClick={() => setSelectedTrack('cybersecurity')}
                  className={`p-3 rounded-lg border font-bold text-center transition flex flex-col items-center gap-1 cursor-pointer disabled:opacity-60 ${
                    selectedTrack === 'cybersecurity'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white'
                  }`}
                >
                  <Shield className="w-5 h-5 text-amber-400" />
                  <span>CYBERSECURITY</span>
                  <span className="text-[9px] font-normal text-zinc-400">SecureVault</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !teamName.trim() || serverStatus === 'OFFLINE'}
              className="gold-button w-full py-3.5 rounded-lg font-bold text-sm tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'PROCESSING TEAM FORMATION…' : matchedTeam ? 'JOIN EXISTING TEAM' : 'CREATE NEW TEAM'}
            </button>
          </form>
        )}

        {/* Legacy Team Code Form (Fallback mode) */}
        {!student && loginMode === 'legacy' && (
          <form onSubmit={handleLegacySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 tracking-wider">
                TEAM CODE
              </label>
              <input
                type="text"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                placeholder="e.g. FS01 or CY01"
                required
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white font-mono text-center tracking-widest text-lg py-3 rounded-lg outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 tracking-wider">
                TEAM PIN / PASSWORD
              </label>
              <input
                type="password"
                value={legacyPin}
                onChange={(e) => setLegacyPin(e.target.value)}
                placeholder="Enter PIN (Default: 1234)"
                required
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white font-mono text-center tracking-widest text-lg py-3 rounded-lg outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !teamCode.trim() || serverStatus === 'OFFLINE'}
              className="gold-button w-full py-3.5 rounded-lg font-bold text-sm tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'VERIFYING TEAM CREDENTIALS…' : 'ENTER HACKATHON'}
            </button>
          </form>
        )}

        {/* Preset Student Demo Quick Buttons */}
        {!student && loginMode === 'student' && (
          <div className="mt-6 pt-5 border-t border-zinc-800 text-center">
            <span className="text-xs text-zinc-500 font-mono">DEMO STUDENT LOGINS (PIN: 1234):</span>
            <div className="flex justify-center gap-2 mt-2 flex-wrap">
              {['STU001', 'STU002', 'STU003', 'STU004'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setStudentCode(code);
                    setPin('1234');
                  }}
                  className="text-xs font-mono bg-zinc-950 hover:bg-zinc-800 text-amber-400 border border-zinc-800 px-2.5 py-1 rounded transition cursor-pointer"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
