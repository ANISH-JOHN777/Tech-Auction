import React, { useState, useEffect } from 'react';
import { Rocket, RefreshCw, AlertTriangle, Send, Code, Lock } from 'lucide-react';
import FileTree from '../components/FileTree';
import CodeEditor from '../components/CodeEditor';
import TestResultsPanel from '../components/TestResultsPanel';
import { api } from '../services/api';

export default function DebugWorkspace({ team, onNavigateSubmission }) {
  const [files, setFiles] = useState([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [unsavedContent, setUnsavedContent] = useState({});
  const [testData, setTestData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [errorAlert, setErrorAlert] = useState(null);
  const [successAlert, setSuccessAlert] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const track = team?.challenge || 'full-stack';
  const trackTitle =
    track === 'full-stack'
      ? 'CampusConnect — Full Stack Debugging Challenge'
      : 'SecureVault — Cybersecurity Debugging Challenge';

  // Load workspace files and submission status on component mount
  async function loadWorkspace() {
    setIsLoading(true);
    setErrorAlert(null);
    try {
      const data = await api.getWorkspaceFiles();
      const loadedFiles = data.files || [];
      setFiles(loadedFiles);

      // Check if team has already finalized submission
      try {
        const subRes = await api.getSubmission();
        if (subRes?.submission?.status === 'FINAL') {
          setIsLocked(true);
        }
      } catch (e) {
        // silent check fallback
      }

      // Auto-select first file if none selected
      if (!selectedPath && loadedFiles.length > 0) {
        setSelectedPath(loadedFiles[0].path);
      }
    } catch (err) {
      setErrorAlert(err.message || 'Debug workspace is available during the active challenge.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspace();
  }, [team?.challenge]);

  // Find currently open file
  const currentFile = files.find((f) => f.path === selectedPath);
  const isDirty = Object.prototype.hasOwnProperty.call(unsavedContent, selectedPath);
  const activeContent = isDirty ? unsavedContent[selectedPath] : currentFile?.content || '';

  const unsavedPaths = new Set(Object.keys(unsavedContent));

  // Handle local text editing
  const handleEditorChange = (newContent) => {
    if (!selectedPath || isLocked) return;

    if (currentFile && newContent === currentFile.content) {
      // Reverted to saved content
      const updated = { ...unsavedContent };
      delete updated[selectedPath];
      setUnsavedContent(updated);
    } else {
      setUnsavedContent((prev) => ({
        ...prev,
        [selectedPath]: newContent,
      }));
    }
  };

  // Save current active file draft
  const handleSaveDraft = async () => {
    if (!selectedPath || !isDirty || isLocked) return;

    setIsSaving(true);
    setErrorAlert(null);
    setSuccessAlert(null);

    try {
      const contentToSave = unsavedContent[selectedPath];
      await api.saveWorkspaceFile(selectedPath, contentToSave);

      // Update local files array to mark content saved
      setFiles((prev) =>
        prev.map((f) => (f.path === selectedPath ? { ...f, content: contentToSave } : f))
      );

      // Remove from unsaved map
      const updatedUnsaved = { ...unsavedContent };
      delete updatedUnsaved[selectedPath];
      setUnsavedContent(updatedUnsaved);

      setSuccessAlert(`Saved '${selectedPath}' successfully ✓`);
      setTimeout(() => setSuccessAlert(null), 3000);
    } catch (err) {
      setErrorAlert(err.message || 'Save failed. Please check network connectivity.');
    } finally {
      setIsSaving(false);
    }
  };

  // Run controlled backend challenge tests
  const handleRunTests = async () => {
    if (isLocked) return;

    setIsRunning(true);
    setErrorAlert(null);

    // Save pending draft if active file is dirty before running
    if (selectedPath && isDirty) {
      try {
        const contentToSave = unsavedContent[selectedPath];
        await api.saveWorkspaceFile(selectedPath, contentToSave);
        setFiles((prev) =>
          prev.map((f) => (f.path === selectedPath ? { ...f, content: contentToSave } : f))
        );
        const updatedUnsaved = { ...unsavedContent };
        delete updatedUnsaved[selectedPath];
        setUnsavedContent(updatedUnsaved);
      } catch (err) {
        console.warn('Auto-save before test run failed:', err.message);
      }
    }

    try {
      const resultData = await api.runWorkspaceTests();
      setTestData(resultData);
    } catch (err) {
      setErrorAlert(err.message || 'Test runner failed.');
    } finally {
      setIsRunning(false);
    }
  };

  // Reset workspace to original challenge template files
  const handleConfirmReset = async () => {
    if (isLocked) return;

    setShowResetModal(false);
    setIsLoading(true);
    setErrorAlert(null);

    try {
      const data = await api.resetWorkspace();
      setFiles(data.files || []);
      setUnsavedContent({});
      setTestData(null);
      setSuccessAlert('Workspace reset to default challenge code ✓');
      setTimeout(() => setSuccessAlert(null), 3000);
    } catch (err) {
      setErrorAlert(err.message || 'Failed to reset workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit final workspace solution
  const handleConfirmSubmit = async () => {
    setShowSubmitModal(false);
    setIsSubmitting(true);
    setErrorAlert(null);

    // Auto-save draft before final submission if dirty
    if (selectedPath && isDirty) {
      try {
        const contentToSave = unsavedContent[selectedPath];
        await api.saveWorkspaceFile(selectedPath, contentToSave);
        setFiles((prev) =>
          prev.map((f) => (f.path === selectedPath ? { ...f, content: contentToSave } : f))
        );
        const updatedUnsaved = { ...unsavedContent };
        delete updatedUnsaved[selectedPath];
        setUnsavedContent(updatedUnsaved);
      } catch (err) {
        // silent auto-save fallback
      }
    }

    try {
      await api.submitChallenge({
        submissionType: 'WORKSPACE',
        submissionReference: 'In-Portal Debug Workspace Solution',
        isFinal: true,
      });

      setIsLocked(true);
      setSuccessAlert('FINAL SOLUTION SUBMITTED AND WORKSPACE LOCKED SUCCESSFULLY ✓');
    } catch (err) {
      setErrorAlert(err.message || 'Failed to record final submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && files.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-12 text-center text-zinc-400 font-mono">
        <RefreshCw className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4 text-amber-500" />
        <div>LOADING IN-PORTAL DEBUG WORKSPACE…</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Workspace Header Bar */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Code className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide">{trackTitle}</h1>
              {isLocked && (
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 font-mono uppercase">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>SUBMITTED & LOCKED</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              IN-PORTAL DEBUG WORKSPACE — TEAM: <span className="text-amber-400 font-bold">{team?.name}</span>
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          {!isLocked ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow flex items-center gap-1.5 cursor-pointer uppercase tracking-wider font-mono disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'SUBMITTING...' : 'SUBMIT SOLUTION'}</span>
            </button>
          ) : (
            <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold px-4 py-2 rounded-lg font-mono flex items-center gap-1.5 uppercase">
              <Lock className="w-3.5 h-3.5" />
              <span>SUBMITTED ✓</span>
            </div>
          )}
        </div>
      </div>

      {/* Notifications & Lock Notice */}
      {isLocked && (
        <div className="bg-emerald-950/30 border border-emerald-800/60 p-3 rounded-lg flex items-center gap-2 text-emerald-300 text-xs font-mono">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1">
            Your final solution has been submitted and locked. File editing and test executions are disabled.
          </span>
        </div>
      )}

      {errorAlert && (
        <div className="bg-rose-950/40 border border-rose-800/80 p-3 rounded-lg flex items-center gap-2 text-rose-300 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="flex-1">{errorAlert}</span>
        </div>
      )}

      {successAlert && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 p-3 rounded-lg flex items-center gap-2 text-emerald-300 text-xs font-mono">
          <Rocket className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1">{successAlert}</span>
        </div>
      )}

      {/* Main Workspace Layout (2-Column Grid on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[580px]">
        {/* Left Sidebar: File Explorer */}
        <div className="lg:col-span-1 h-[580px]">
          <FileTree
            files={files}
            selectedPath={selectedPath}
            onSelectFile={(path) => setSelectedPath(path)}
            unsavedPaths={unsavedPaths}
          />
        </div>

        {/* Main Workspace Panel (Editor + Test Results) */}
        <div className="lg:col-span-3 flex flex-col gap-4 h-[580px]">
          {/* Top Half: Code Editor */}
          <div className="flex-1 min-h-[320px]">
            <CodeEditor
              filePath={selectedPath}
              content={activeContent}
              isSaved={!isDirty}
              isSaving={isSaving}
              onChange={handleEditorChange}
              onSave={isLocked ? undefined : handleSaveDraft}
              readOnly={isLocked}
            />
          </div>

          {/* Bottom Half: Test Results Panel */}
          <div className="h-[240px] shrink-0">
            <TestResultsPanel
              testData={testData}
              isRunning={isRunning}
              onRunTests={isLocked ? undefined : handleRunTests}
              onResetWorkspace={isLocked ? undefined : () => setShowResetModal(true)}
            />
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && !isLocked && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono text-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>RESET WORKSPACE CODE?</span>
            </div>

            <p className="text-zinc-300 leading-relaxed font-sans">
              Reset your workspace to the original challenge code? All your current edits and draft modifications will be permanently removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow cursor-pointer"
              >
                YES, RESET WORKSPACE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Submission Confirmation Modal */}
      {showSubmitModal && !isLocked && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono text-xs">
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Send className="w-5 h-5 text-emerald-400" />
              <span>SUBMIT FINAL SOLUTION?</span>
            </div>

            <p className="text-zinc-300 leading-relaxed font-sans">
              Submit your final debugging workspace solution? After submission, your workspace will be locked and cannot be edited.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow cursor-pointer uppercase tracking-wider"
              >
                {isSubmitting ? 'SUBMITTING...' : 'CONFIRM SUBMIT SOLUTION'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
