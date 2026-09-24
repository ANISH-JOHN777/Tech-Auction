import React, { useRef } from 'react';
import { Save, CheckCircle2, AlertCircle, FileCode } from 'lucide-react';

export default function CodeEditor({
  filePath,
  content = '',
  isSaved = true,
  isSaving = false,
  onChange,
  onSave,
  readOnly = false,
}) {
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const lines = content.split('\n');
  const lineCount = lines.length;

  const handleScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl+S or Cmd+S shortcut to save
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (!isSaved && onSave) {
        onSave();
      }
      return;
    }

    // Tab key inserts 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      onChange(newContent);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg font-mono">
      {/* Editor Header Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <FileCode className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-zinc-200">{filePath || 'No file selected'}</span>
          
          {filePath && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                isSaved
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Saved ✓</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" />
                  <span>Unsaved changes</span>
                </>
              )}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaved || isSaving || !filePath}
              className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                isSaved || !filePath
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : isSaving
                  ? 'bg-amber-500/50 text-black cursor-wait'
                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-md cursor-pointer'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'SAVE DRAFT'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Canvas */}
      {!filePath ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-600 text-xs">
          <FileCode className="w-12 h-12 stroke-[1] mb-2 text-zinc-700" />
          <p>Select a file from the explorer sidebar to begin debugging.</p>
        </div>
      ) : (
        <div className="flex-1 relative flex overflow-hidden bg-zinc-950">
          {/* Line Numbers Column */}
          <div
            ref={lineNumbersRef}
            className="w-12 py-3 bg-zinc-900/60 border-r border-zinc-800/80 text-right pr-3 select-none text-zinc-600 text-xs leading-6 overflow-hidden font-mono shrink-0"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1}>{i + 1}</div>
            ))}
          </div>

          {/* Text Area Code Editor */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange && onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="flex-1 p-3 bg-transparent text-zinc-100 font-mono text-xs leading-6 resize-none focus:outline-none whitespace-pre overflow-auto font-normal tab-size-2"
          />
        </div>
      )}

      {/* Footer info bar */}
      <div className="bg-zinc-900/80 border-t border-zinc-800 px-4 py-1 flex items-center justify-between text-[10px] text-zinc-500 select-none">
        <div>{filePath ? `${lineCount} Lines` : 'No file'}</div>
        <div className="flex items-center gap-3">
          <span>UTF-8</span>
          <span>JavaScript / JSX</span>
          <span className="text-zinc-600">Ctrl+S to save</span>
        </div>
      </div>
    </div>
  );
}
