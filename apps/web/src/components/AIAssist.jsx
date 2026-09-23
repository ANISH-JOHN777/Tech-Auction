import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function AIAssist() {
  const [statusInfo, setStatusInfo] = useState({
    hasEntitlement: false,
    status: 'LOCKED',
    remainingSeconds: 0,
    expiresAt: null,
    requestCount: 0,
    maxRequests: 30,
  });
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [remainingSecs, setRemainingSecs] = useState(0);

  async function fetchStatus() {
    try {
      const res = await api.getAIStatus();
      setStatusInfo(res);
      if (res.status === 'ACTIVE' && res.expiresAt) {
        calculateRemaining(res.expiresAt);
      } else {
        setRemainingSecs(res.remainingSeconds || 0);
      }
    } catch (err) {
      console.error('[AI ASSIST] Failed to fetch status:', err.message);
    }
  }

  function calculateRemaining(expiresAt) {
    if (!expiresAt) return;
    const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    setRemainingSecs(diff);
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (statusInfo.status === 'ACTIVE' && statusInfo.expiresAt) {
        const diff = Math.max(0, Math.floor((new Date(statusInfo.expiresAt).getTime() - Date.now()) / 1000));
        setRemainingSecs(diff);
        if (diff === 0) {
          fetchStatus();
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [statusInfo.status, statusInfo.expiresAt]);

  async function handleStart() {
    setStarting(true);
    setError('');
    try {
      const res = await api.startAIAssist();
      setStatusInfo(res);
      if (res.expiresAt) {
        calculateRemaining(res.expiresAt);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  async function handleStop() {
    if (!window.confirm('Are you sure you want to stop your AI Assist session? Time remaining will be forfeited.')) return;
    try {
      const res = await api.stopAIAssist();
      setStatusInfo(res);
      setRemainingSecs(0);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!inputMessage.trim() || loading || remainingSecs <= 0) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setError('');
    setLoading(true);

    // Append user message locally
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);

    try {
      const res = await api.chatAI(userText);
      setMessages((prev) => [...prev, { sender: 'ai', text: res.text }]);
      setStatusInfo((prev) => ({
        ...prev,
        remainingSeconds: res.remainingSeconds,
        requestCount: res.requestCount,
        maxRequests: res.maxRequests,
      }));
    } catch (err) {
      setError(err.message);
      if (err.message.includes('expired') || err.message.includes('limit')) {
        fetchStatus();
      }
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Render state 1: LOCKED
  if (!statusInfo.hasEntitlement || statusInfo.status === 'LOCKED') {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-lg mt-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 text-zinc-500 mb-3 text-2xl">
          🔒
        </div>
        <h3 className="text-lg font-black text-zinc-300 uppercase tracking-wide">AI ASSIST — LOCKED</h3>
        <p className="text-xs text-zinc-400 mt-2 max-w-md mx-auto">
          Win the AI ASSIST auction item (<span className="text-amber-400 font-mono">FS-05</span> or <span className="text-amber-400 font-mono">CY-06</span>) in the Auction Room to unlock 15 minutes of Gemini AI guidance.
        </p>
      </div>
    );
  }

  // Render state 2: UNLOCKED / AVAILABLE (Timer not started yet)
  if (statusInfo.status === 'AVAILABLE') {
    return (
      <div className="bg-zinc-900 border border-amber-500/50 p-6 rounded-xl shadow-lg mt-6">
        <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h3 className="text-lg font-black text-white">AI ASSIST — UNLOCKED</h3>
              <span className="text-xs text-amber-400 font-semibold">ENTITLEMENT READY</span>
            </div>
          </div>
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs px-3 py-1 rounded font-bold">
            15:00 TIMER
          </span>
        </div>

        <div className="mt-4 bg-zinc-950/80 border border-zinc-800 p-4 rounded-lg">
          <p className="text-sm text-zinc-300">
            Congratulations! Your team won the AI ASSIST auction item. Click below when you are ready to start your <strong className="text-amber-400">15-minute timer</strong>.
          </p>
          {error && <div className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/30 p-2 rounded">{error}</div>}
          <button
            onClick={handleStart}
            disabled={starting}
            className="gold-button w-full mt-4 py-3 rounded-lg font-bold text-sm uppercase tracking-wider shadow-lg"
          >
            {starting ? 'STARTING TIMER…' : '🚀 START AI ASSIST (15:00)'}
          </button>
        </div>
      </div>
    );
  }

  // Render state 3 & 4: ACTIVE, EXPIRED, or REVOKED
  const isExpired = statusInfo.status === 'EXPIRED' || statusInfo.status === 'REVOKED' || remainingSecs <= 0;

  return (
    <div className="bg-zinc-900 border border-amber-500/30 p-6 rounded-xl shadow-lg mt-6">
      {/* Header Bar */}
      <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <div>
            <h3 className="text-lg font-black text-white">AI ASSISTANT</h3>
            <span className="text-xs text-amber-400 font-semibold uppercase">
              {isExpired ? `STATUS: ${statusInfo.status}` : 'STATUS: ACTIVE'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Requests Counter */}
          <div className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded font-mono">
            Requests: <strong className="text-amber-400">{statusInfo.requestCount}</strong> / {statusInfo.maxRequests}
          </div>

          {/* Live Countdown */}
          <div className={`px-3 py-1.5 rounded font-mono text-xs font-bold border ${
            isExpired
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : remainingSecs < 120
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 animate-pulse'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            ⏱️ {isExpired ? '00:00 EXPIRED' : formatTime(remainingSecs)}
          </div>

          {!isExpired && (
            <button
              onClick={handleStop}
              className="text-xs text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/40 px-2.5 py-1.5 rounded transition-colors"
              title="Stop session early"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Messages History */}
      <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-lg p-4 h-64 overflow-y-auto space-y-3 font-sans text-sm">
        {messages.length === 0 ? (
          <div className="text-center text-zinc-500 py-16 text-xs font-mono">
            No questions asked yet. Ask Gemini for debugging tips or conceptual explanations.
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] text-zinc-500 font-mono mb-1 uppercase">
                {msg.sender === 'user' ? 'You' : 'Gemini AI'}
              </span>
              <div
                className={`max-w-[85%] p-3 rounded-lg text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-200 rounded-br-none font-mono'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none font-mono whitespace-pre-wrap'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg font-mono">
          🚨 {error}
        </div>
      )}

      {/* Message Input Form */}
      <form onSubmit={handleSend} className="mt-4 space-y-3">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          disabled={isExpired || loading}
          maxLength={4000}
          placeholder={
            isExpired
              ? 'Your AI Assist session has ended.'
              : 'Type your technical question... (Max 4000 characters)'
          }
          rows={3}
          className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white p-3 rounded-lg outline-none text-xs font-mono disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <div className="flex justify-between items-center">
          <span className="text-[10px] text-zinc-500 font-mono">
            {inputMessage.length} / 4000 characters
          </span>

          <button
            type="submit"
            disabled={isExpired || loading || !inputMessage.trim()}
            className="gold-button px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'GEMINI IS THINKING…' : 'SEND QUESTION'}
          </button>
        </div>
      </form>
    </div>
  );
}
