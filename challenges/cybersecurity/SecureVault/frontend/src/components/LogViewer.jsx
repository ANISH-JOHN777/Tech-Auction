import React, { useState, useEffect } from 'react';
import { fetchLogFile } from '../services/api';

export default function LogViewer() {
  const [selectedFile, setSelectedFile] = useState('auth.log');
  const [logContent, setLogContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadLog() {
      setLoading(true);
      try {
        const text = await fetchLogFile(selectedFile);
        setLogContent(text);
      } catch (err) {
        setLogContent('Failed to load log file.');
      } finally {
        setLoading(false);
      }
    }
    loadLog();
  }, [selectedFile]);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#38bdf8' }}>Synthetic System Log Audit (CASE-07)</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8b949e' }}>
            Inspect system log streams to detect unauthorized access patterns & anomalies.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['auth.log', 'access.log', 'application.log'].map((file) => (
            <button
              key={file}
              onClick={() => setSelectedFile(file)}
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                backgroundColor: selectedFile === file ? '#238636' : '#21262d',
              }}
            >
              {file}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#8b949e', padding: '20px', textAlign: 'center' }}>Loading log buffer…</div>
      ) : (
        <pre
          style={{
            backgroundColor: '#0d1117',
            border: '1px solid #30363d',
            borderRadius: '6px',
            padding: '16px',
            fontSize: '12px',
            color: '#7ee787',
            fontFamily: 'monospace',
            maxHeight: '350px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {logContent}
        </pre>
      )}
    </div>
  );
}
