import React, { useState, useEffect } from 'react';
import { Rocket, Tag, FileText, Trophy, Code } from 'lucide-react';
import TeamCard from '../components/TeamCard';
import Timer from '../components/Timer';
import EventMonitor from '../components/EventMonitor';
import ConnectionStatus from '../components/ConnectionStatus';
import EventStateOverlay from '../components/EventStateOverlay';
import ChallengeSelection from './ChallengeSelection';
import Auction from './Auction';
import Submission from './Submission';
import Leaderboard from './Leaderboard';
import DebugWorkspace from './DebugWorkspace';
import { api } from '../services/api';

export default function Dashboard({ team, onSelectChallenge, error }) {
  const [activeTab, setActiveTab] = useState('auction');
  const [eventSettings, setEventSettings] = useState({});
  const [submissionStatus, setSubmissionStatus] = useState('NOT SUBMITTED');

  async function loadDashboardMeta() {
    try {
      const settings = await api.getEventSettings();
      setEventSettings(settings || {});

      const subRes = await api.getSubmission();
      if (subRes?.submission?.status) {
        setSubmissionStatus(subRes.submission.status);
      }
    } catch (e) {
      // silent fallback
    }
  }

  useEffect(() => {
    loadDashboardMeta();
    const interval = setInterval(loadDashboardMeta, 10000);
    return () => clearInterval(interval);
  }, []);

  const eventStatus = eventSettings.event_status || 'LIVE';
  const trackName = team?.challenge === 'full-stack' ? 'FULL-STACK DEVELOPMENT' : team?.challenge === 'cybersecurity' ? 'CYBERSECURITY' : 'PENDING';
  const challengeTitle = team?.challenge === 'full-stack' ? 'CampusConnect' : team?.challenge === 'cybersecurity' ? 'SecureVault' : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 relative">
      <EventMonitor isLive={true} />
      <ConnectionStatus />
      <EventStateOverlay
        eventStatus={eventStatus}
        onNavigateLeaderboard={() => setActiveTab('leaderboard')}
      />

      {/* Overview Status Summary Badges */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-lg font-mono text-xs">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">EVENT:</span>
            <span className={`font-bold px-2 py-0.5 rounded ${
              eventStatus === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
              eventStatus === 'PAUSED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
              'bg-red-500/20 text-red-400 border border-red-500/40'
            }`}>
              {eventStatus}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">TRACK:</span>
            <span className="text-amber-400 font-bold">{trackName}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">CREDITS:</span>
            <span className="text-white font-bold">{team.wallet?.toLocaleString() || 0}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500">SUBMISSION:</span>
            <span className={`font-bold px-2 py-0.5 rounded ${
              submissionStatus === 'FINAL' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
              submissionStatus === 'DRAFT' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
              'bg-zinc-800 text-zinc-400'
            }`}>
              {submissionStatus}
            </span>
          </div>
        </div>

        {/* Direct Access to Challenge Workspace */}
        {challengeTitle && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-sans text-xs">CHALLENGE PACKAGE:</span>
            <button
              onClick={() => setActiveTab('workspace')}
              className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 rounded transition shadow font-sans uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <Code className="w-3.5 h-3.5" />
              <span>DEBUG {challengeTitle.toUpperCase()}</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <TeamCard team={team} />
        </div>
        <div>
          <Timer />
        </div>
      </div>

      {!team.challenge ? (
        <ChallengeSelection
          team={team}
          onSelectChallenge={onSelectChallenge}
          error={error}
        />
      ) : (
        <div className="space-y-6">
          {/* Navigation Bar for Student Challenge Dashboard */}
          <div className="flex gap-4 border-b border-zinc-800 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('auction')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
                activeTab === 'auction'
                  ? 'bg-amber-500 text-black shadow-lg'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>AUCTION ROOM & AI ASSIST</span>
            </button>

            <button
              onClick={() => setActiveTab('workspace')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
                activeTab === 'workspace'
                  ? 'bg-amber-500 text-black shadow-lg'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>DEBUG WORKSPACE</span>
            </button>

            <button
              onClick={() => setActiveTab('submission')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
                activeTab === 'submission'
                  ? 'bg-amber-500 text-black shadow-lg'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>CHALLENGE SUBMISSION</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-500 text-black shadow-lg'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>LIVE LEADERBOARD</span>
            </button>
          </div>

          {activeTab === 'auction' ? (
            <Auction challenge={team.challenge} team={team} />
          ) : activeTab === 'workspace' ? (
            <DebugWorkspace team={team} onNavigateSubmission={() => setActiveTab('submission')} />
          ) : activeTab === 'submission' ? (
            <Submission team={team} />
          ) : (
            <Leaderboard />
          )}
        </div>
      )}
    </div>
  );
}
