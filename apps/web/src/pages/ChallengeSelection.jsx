import React from 'react';
import ChallengeCard from '../components/ChallengeCard';

export default function ChallengeSelection({ team, onSelectChallenge, error }) {
  const lockedChallenge = team?.challenge;

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
        <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">
          HACKATHON DASHBOARD
        </div>
        <h1 className="text-3xl font-black text-white">CHALLENGE SELECTION</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Choose your team's technical track. Once selected, your challenge selection will be locked on the server.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChallengeCard
          title="Full-Stack Development"
          type="full-stack"
          description="Debug CampusConnect — a campus event management application containing deliberate architectural & data bugs. E-commerce & REST API debugging."
          isSelected={lockedChallenge === 'full-stack'}
          isLocked={Boolean(lockedChallenge)}
          onSelect={onSelectChallenge}
        />

        <ChallengeCard
          title="Cybersecurity"
          type="cybersecurity"
          description="Investigate SecureVault — a controlled security lab environment. Analyze logs, identify access flaws, XSS vulnerabilities, and implement mitigations."
          isSelected={lockedChallenge === 'cybersecurity'}
          isLocked={Boolean(lockedChallenge)}
          onSelect={onSelectChallenge}
        />
      </div>
    </div>
  );
}
