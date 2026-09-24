import React from 'react';
import { Play, CheckCircle2, XCircle, RefreshCw, Terminal } from 'lucide-react';

export default function TestResultsPanel({
  testData = null,
  isRunning = false,
  onRunTests,
  onResetWorkspace,
}) {
  const summary = testData?.summary || null;
  const results = testData?.results || [];

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg font-mono text-xs">
      {/* Panel Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2.5 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-zinc-200 uppercase">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>TEST SUITE RUNNER</span>
          </div>

          {summary && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PASSED: {summary.passed}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                FAILED: {summary.failed}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                TOTAL: {summary.total}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onResetWorkspace && (
            <button
              onClick={onResetWorkspace}
              disabled={isRunning}
              className="px-3 py-1 rounded bg-zinc-900 hover:bg-rose-950 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-800 font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Reset workspace to default challenge template"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>RESET CODE</span>
            </button>
          )}

          {onRunTests && (
            <button
              onClick={onRunTests}
              disabled={isRunning}
              className={`px-4 py-1 rounded font-bold transition flex items-center gap-1.5 ${
                isRunning
                  ? 'bg-amber-500/50 text-black cursor-wait'
                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-md cursor-pointer'
              }`}
            >
              {isRunning ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isRunning ? 'RUNNING TESTS...' : 'RUN TESTS'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Results Container */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-950">
        {isRunning ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-400">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mb-2" />
            <p className="font-bold">Evaluating workspace assertions...</p>
            <p className="text-[10px] text-zinc-500 mt-1">Inspecting code behavior against challenge requirements.</p>
          </div>
        ) : !testData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-600">
            <Terminal className="w-8 h-8 stroke-[1] mb-2 text-zinc-700" />
            <p>Click <span className="text-amber-400 font-bold">RUN TESTS</span> above to execute controlled challenge assertions.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-6 text-zinc-500 italic">No test results returned</div>
        ) : (
          results.map((item) => {
            const isPass = item.status === 'PASS';
            return (
              <div
                key={item.id}
                className={`p-3 rounded-lg border transition ${
                  isPass
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    {isPass ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{item.name}</span>
                    <span className="text-[10px] text-zinc-500 font-normal">({item.id})</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isPass
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 ml-6">{item.message}</p>

                {!isPass && (item.expected !== undefined || item.actual !== undefined) && (
                  <div className="mt-2 ml-6 p-2 rounded bg-zinc-900/80 border border-rose-950/60 font-mono text-[11px] space-y-1">
                    {item.expected !== undefined && (
                      <div>
                        <span className="text-zinc-500 font-semibold">Expected: </span>
                        <span className="text-emerald-400">{String(item.expected)}</span>
                      </div>
                    )}
                    {item.actual !== undefined && (
                      <div>
                        <span className="text-zinc-500 font-semibold">Actual: </span>
                        <span className="text-rose-400">{String(item.actual)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
