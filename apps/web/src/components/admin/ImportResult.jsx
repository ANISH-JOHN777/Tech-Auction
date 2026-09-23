import React from 'react';

export default function ImportResult({ result }) {
  if (!result) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <span>CSV IMPORT RESULTS</span>
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-center">
          <div className="text-xs text-zinc-400 font-bold uppercase">TEAMS IMPORTED</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{result.importedTeamsCount}</div>
        </div>
        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-center">
          <div className="text-xs text-zinc-400 font-bold uppercase">MEMBERS ADDED</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{result.importedMembersCount}</div>
        </div>
        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-center">
          <div className="text-xs text-zinc-400 font-bold uppercase">SKIPPED DUPLICATES</div>
          <div className="text-2xl font-black text-zinc-400 mt-1">{result.skippedDuplicateTeamsCount}</div>
        </div>
        <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-center">
          <div className="text-xs text-zinc-400 font-bold uppercase">INVALID ROWS</div>
          <div className="text-2xl font-black text-red-400 mt-1">{result.invalidRowsCount}</div>
        </div>
      </div>

      {result.invalidRows && result.invalidRows.length > 0 && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-xs space-y-1">
          <div className="font-bold text-red-400 mb-1">INVALID ROW DETAILS:</div>
          {result.invalidRows.map((err, idx) => (
            <div key={idx} className="font-mono text-red-300">
              Line {err.row}: {err.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
