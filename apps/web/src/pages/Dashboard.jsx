import React, { useState } from 'react';
import TeamCard from '../components/TeamCard';
import Timer from '../components/Timer';
import EventMonitor from '../components/EventMonitor';
import ChallengeSelection from './ChallengeSelection';
import Auction from './Auction';
import Submission from './Submission';
import Leaderboard from './Leaderboard';

export default function Dashboard({ team, onSelectChallenge, error }) {
  const [activeTab, setActiveTab] = useState('auction');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 relative">
      <EventMonitor isLive={true} />
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
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
                activeTab === 'auction'
                  ? 'bg-amber-500 text-black shadow-lg'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              🏷️ AUCTION ROOM & AI ASSIST
            </button>

            <button
              onClick={() => setActiveTab('submission')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
                activeTab === 'submission'
                  ? 'bg-amber-500 text-black shadow-lg'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              📝 CHALLENGE SUBMISSION
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-500 text-black shadow-lg'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              🏆 LIVE LEADERBOARD
            </button>
          </div>

          {activeTab === 'auction' ? (
            <Auction challenge={team.challenge} team={team} />
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
