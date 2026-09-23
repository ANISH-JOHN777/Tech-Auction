import React from 'react';

export default function ChallengeCard({ title, type, description, isSelected, isLocked, onSelect }) {
  return (
    <div
      className={`relative bg-zinc-900 border p-6 rounded-xl transition flex flex-col justify-between ${
        isSelected
          ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/30'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs font-bold text-amber-500 tracking-wider uppercase">
            CHALLENGE OPTION
          </span>
          {isLocked && isSelected && (
            <span className="bg-amber-500/20 text-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded border border-amber-500/30">
              LOCKED
            </span>
          )}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6">{description}</p>
      </div>

      <button
        onClick={() => onSelect(type)}
        disabled={isLocked && isSelected}
        className={`w-full py-3 rounded-lg font-bold text-sm tracking-wider uppercase transition ${
          isSelected
            ? 'bg-amber-500 text-black cursor-default'
            : isLocked
            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            : 'bg-zinc-800 hover:bg-amber-500 hover:text-black text-white'
        }`}
      >
        {isSelected ? 'CHALLENGE SELECTED' : 'SELECT CHALLENGE'}
      </button>
    </div>
  );
}
