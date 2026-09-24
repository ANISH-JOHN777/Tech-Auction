import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';

export default function ConnectionStatus() {
  const [status, setStatus] = useState(socket.connected ? 'CONNECTED' : 'DISCONNECTED');
  const [toast, setToast] = useState('');

  useEffect(() => {
    function handleConnect() {
      setStatus('CONNECTED');
      setToast('Connection restored.');
      setTimeout(() => setToast(''), 4000);
    }

    function handleDisconnect(reason) {
      setStatus('DISCONNECTED');
      setToast('Connection interrupted. Reconnecting…');
    }

    function handleConnectError() {
      setStatus('RECONNECTING');
      setToast('Connection interrupted. Reconnecting…');
    }

    function handleReconnectAttempt() {
      setStatus('RECONNECTING');
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, []);

  const badgeColor =
    status === 'CONNECTED'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : status === 'RECONNECTING'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
      : 'bg-red-500/10 text-red-400 border-red-500/30';

  const dotColor =
    status === 'CONNECTED'
      ? 'bg-emerald-400'
      : status === 'RECONNECTING'
      ? 'bg-amber-400 animate-ping'
      : 'bg-red-400';

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {toast && (
        <div className="pointer-events-auto bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-mono px-3 py-2 rounded-lg shadow-xl animate-fade-in flex items-center gap-2">
          <span>{status === 'CONNECTED' ? '🟢' : '⚠️'}</span>
          <span>{toast}</span>
        </div>
      )}

      <div className={`pointer-events-auto px-3 py-1.5 rounded-full border text-[11px] font-mono font-bold flex items-center gap-2 shadow-lg backdrop-blur-md bg-zinc-950/90 ${badgeColor}`}>
        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
        <span>{status}</span>
      </div>
    </div>
  );
}
