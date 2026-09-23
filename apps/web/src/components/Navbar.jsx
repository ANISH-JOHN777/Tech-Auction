import React from 'react';
import Wallet from './Wallet';

export default function Navbar({ team, onLogout, isAdminView, onToggleAdminView }) {
  return (
    <header className="w-full bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex flex-wrap justify-between items-center shadow-lg">
      <div className="flex flex-col">
        <div className="text-xs font-bold tracking-widest text-amber-500 uppercase">
          SNS COLLEGE OF TECHNOLOGY
        </div>
        <div className="text-sm text-zinc-400 font-medium">
          DEPARTMENT OF INFORMATION TECHNOLOGY
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-2 sm:mt-0">
        {!isAdminView && team && <Wallet amount={team.wallet} />}
        
        <button
          onClick={onToggleAdminView}
          className={`text-xs font-bold px-3 py-1.5 rounded transition border ${
            isAdminView
              ? 'bg-amber-500 text-black border-amber-500'
              : 'text-zinc-400 hover:text-amber-400 border-zinc-800 hover:border-amber-500/40'
          }`}
        >
          {isAdminView ? '← STUDENT PORTAL' : 'ORGANIZER ADMIN'}
        </button>

        {!isAdminView && team && (
          <button
            onClick={onLogout}
            className="text-xs text-zinc-400 hover:text-amber-400 border border-zinc-800 hover:border-amber-500/50 px-3 py-1.5 rounded transition"
          >
            LOGOUT
          </button>
        )}
      </div>
    </header>
  );
}
