import React, { useState, useEffect } from 'react';
import { fetchConfig, fetchSystemDiagnostics } from '../services/api';

export default function ConfigViewer() {
  const [config, setConfig] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingDiag, setLoadingDiag] = useState(false);

  async function loadConfig() {
    setLoadingConfig(true);
    try {
      const data = await fetchConfig();
      setConfig(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConfig(false);
    }
  }

  async function loadDiagnostics() {
    setLoadingDiag(true);
    try {
      const data = await fetchSystemDiagnostics();
      setDiagnostics(data.diagnostics);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDiag(false);
    }
  }

  useEffect(() => {
    loadConfig();
    loadDiagnostics();
  }, []);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card">
        <h3 style={{ marginTop: 0, color: '#f87171' }}>CASE-04: Public Config & Sensitive Information Exposure</h3>
        <p style={{ fontSize: '12px', color: '#8b949e' }}>
          Inspect endpoint `/api/config` for unencrypted database paths, master keys, and internal staging IPs.
        </p>

        {loadingConfig ? (
          <div style={{ color: '#8b949e' }}>Loading config…</div>
        ) : config ? (
          <pre style={{ backgroundColor: '#0d1117', border: '1px solid #da3633', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#f87171', overflowX: 'auto' }}>
            {JSON.stringify(config, null, 2)}
          </pre>
        ) : null}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, color: '#f87171' }}>CASE-06: Unprotected Admin System Diagnostics</h3>
        <p style={{ fontSize: '12px', color: '#8b949e' }}>
          Inspect unauthenticated endpoint `/api/admin/system-diagnostics` for database dumps & active user session leaks.
        </p>

        {loadingDiag ? (
          <div style={{ color: '#8b949e' }}>Loading diagnostics…</div>
        ) : diagnostics ? (
          <pre style={{ backgroundColor: '#0d1117', border: '1px solid #da3633', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#f87171', overflowX: 'auto', maxHeight: '300px' }}>
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
