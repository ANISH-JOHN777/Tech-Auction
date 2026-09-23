import React, { useState } from 'react';
import Teams from './Teams';
import RegistrationImport from './RegistrationImport';
import AuctionControl from './AuctionControl';
import AIMonitor from './AIMonitor';
import SubmissionsAdmin from './SubmissionsAdmin';
import EventControls from './EventControls';
import AntiMalpracticeAdmin from './AntiMalpracticeAdmin';

export default function AdminDashboard({ admin, onLogout }) {
  const [activeTab, setActiveTab] = useState('teams');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
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

      <div className="flex gap-4 border-b border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
            activeTab === 'teams'
              ? 'bg-amber-500 text-black'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          TEAMS MANAGEMENT
        </button>
        <button
          onClick={() => setActiveTab('auction')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
            activeTab === 'auction'
              ? 'bg-amber-500 text-black'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          AUCTION ENGINE CONTROL
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
            activeTab === 'submissions'
              ? 'bg-amber-500 text-black'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          📝 SUBMISSIONS & EVALUATION
        </button>
        <button
          onClick={() => setActiveTab('event')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
            activeTab === 'event'
              ? 'bg-amber-500 text-black'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          ⚙️ EVENT CONTROLS
        </button>
        <button
          onClick={() => setActiveTab('antimalpractice')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
            activeTab === 'antimalpractice'
              ? 'bg-amber-500 text-black'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          🛡️ ANTI-MALPRACTICE
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
            activeTab === 'ai'
              ? 'bg-amber-500 text-black'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          ⚡ AI ASSIST MONITOR
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition whitespace-nowrap ${
            activeTab === 'import'
              ? 'bg-amber-500 text-black'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          CSV REGISTRATION IMPORT
        </button>
      </div>

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
      ) : (
        <RegistrationImport />
      )}
    </div>
  );
}


