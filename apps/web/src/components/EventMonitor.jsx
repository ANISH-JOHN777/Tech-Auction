import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize } from 'lucide-react';

const API_BASE = '/api';

export default function EventMonitor({ isLive = true }) {
  const [warnings, setWarnings] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [sessionStatus, setSessionStatus] = useState('ACTIVE');
  const [eventStatus, setEventStatus] = useState('LIVE');
  const lastEventRef = useRef({});

  const token = localStorage.getItem('token');
  const sessionIdRef = useRef(
    sessionStorage.getItem('event_session_id') || `sess_${Math.random().toString(36).substring(2, 10)}`
  );

  useEffect(() => {
    sessionStorage.setItem('event_session_id', sessionIdRef.current);
  }, []);

  // Show temporary warning toast
  const addWarning = (msg) => {
    const id = Date.now();
    setWarnings((prev) => [...prev.slice(-3), { id, msg }]);
    setTimeout(() => {
      setWarnings((prev) => prev.filter((w) => w.id !== id));
    }, 6000);
  };

  // Helper to send violation to backend with client-side rate limit
  const reportViolation = async (type, severity, description, cooldownSec = 30) => {
    if (!token) return;

    const now = Date.now();
    const lastTime = lastEventRef.current[type] || 0;
    if (now - lastTime < cooldownSec * 1000) {
      return; // Client-side rate limit
    }
    lastEventRef.current[type] = now;

    try {
      await fetch(`${API_BASE}/event/violation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          severity,
          description,
          client_timestamp: new Date().toISOString(),
          // CRITICAL: NEVER include clipboard text or sensitive content in metadata!
          metadata: { windowWidth: window.innerWidth, windowHeight: window.innerHeight },
        }),
      });
    } catch (err) {
      console.warn('Failed to record event signal:', err);
    }
  };

  // Heartbeat loop
  useEffect(() => {
    if (!token) return;

    const sendHeartbeat = async () => {
      try {
        const res = await fetch(`${API_BASE}/event/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Event-Session-Id': sessionIdRef.current,
          },
          body: JSON.stringify({
            visibilityState: document.visibilityState,
            fullscreenEnabled: !!document.fullscreenElement,
            clientMetadata: { userAgent: navigator.userAgent.substring(0, 100) },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setEventStatus(data.data.event_status);
            setSessionStatus(data.data.team_status);
            if (data.data.team_status === 'SUSPENDED') {
              addWarning('Warning: Your team session has been suspended by the organizer.');
            }
          }
        }
      } catch (e) {
        // silent fallback
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000); // 15s interval
    return () => clearInterval(interval);
  }, [token]);

  // Browser Event Listeners
  useEffect(() => {
    if (!token) return;

    // 1. Visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        addWarning('Warning: Your browser tab became inactive. This event has been recorded.');
        reportViolation('TAB_HIDDEN', 'WARNING', 'Tab became hidden/inactive', 30);
      }
    };

    // 2. Blur / Focus
    const handleBlur = () => {
      addWarning('Warning: Event window lost focus. This event has been recorded.');
      reportViolation('WINDOW_BLUR', 'WARNING', 'Window lost focus', 30);
    };

    // 3. Fullscreen change
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) {
        addWarning('Warning: Fullscreen mode was exited. This event has been recorded.');
        reportViolation('FULLSCREEN_EXIT', 'WARNING', 'Fullscreen exited', 30);
      }
    };

    // 4. Clipboard Copy / Paste / Cut (Metadata ONLY, ZERO text/content)
    const handleCopy = () => {
      reportViolation('COPY_ATTEMPT', 'INFO', 'Copy attempt detected within challenge page', 5);
    };
    const handlePaste = () => {
      reportViolation('PASTE_ATTEMPT', 'INFO', 'Paste attempt detected within challenge page', 5);
    };

    // 5. Context Menu (Right Click)
    const handleContextMenu = (e) => {
      if (isLive) {
        reportViolation('CONTEXT_MENU', 'INFO', 'Context menu opened during challenge activity', 10);
      }
    };

    // 6. DevTools Heuristic Check
    const checkDevTools = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        reportViolation('DEVTOOLS_SUSPECTED', 'HIGH', 'DevTools window size anomaly detected', 60);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    const devInterval = setInterval(checkDevTools, 15000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      clearInterval(devInterval);
    };
  }, [token, isLive]);

  const requestFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div style={{ position: 'fixed', top: '12px', right: '12px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '380px' }}>
      {/* Warning Banners */}
      {warnings.map((w) => (
        <div
          key={w.id}
          style={{
            background: 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span>{w.msg}</span>
          <button
            onClick={() => setWarnings((prev) => prev.filter((item) => item.id !== w.id))}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {/* Fullscreen Prompt Trigger (if live & not fullscreen) */}
      {isLive && !isFullscreen && (
        <button
          onClick={requestFullscreen}
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            alignSelf: 'flex-end',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Maximize size={14} />
          <span>Enter Fullscreen</span>
        </button>
      )}
    </div>
  );
}
