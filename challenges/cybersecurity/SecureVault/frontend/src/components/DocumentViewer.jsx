import React, { useState } from 'react';
import { fetchDocumentById } from '../services/api';

export default function DocumentViewer({ document, onClose }) {
  const [docIdInput, setDocIdInput] = useState(document ? document.id : '1');
  const [activeDoc, setActiveDoc] = useState(document);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleFetchDoc(e) {
    e.preventDefault();
    if (!docIdInput) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetchDocumentById(docIdInput);
      if (res.success) {
        setActiveDoc(res.document);
      } else {
        setError(res.error || 'Failed to fetch document.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
      <div className="card" style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center', borderBottom: '1px solid #30363d', paddingBottom: '12px', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#38bdf8' }}>Secure Document Viewer</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>

        <form onSubmit={handleFetchDoc} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="number"
            value={docIdInput}
            onChange={(e) => setDocIdInput(e.target.value)}
            placeholder="Document ID parameter (e.g. 1, 2, 3)"
            className="input"
            style={{ marginTop: 0 }}
          />
          <button type="submit" className="btn" style={{ padding: '8px 14px', fontSize: '12px' }}>
            Fetch Document ID
          </button>
        </form>

        {error && (
          <div style={{ backgroundColor: 'rgba(218, 54, 51, 0.2)', border: '1px solid #da3633', color: '#f87171', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: '#9ca3af', padding: '20px', textAlign: 'center' }}>Loading document record…</div>
        ) : activeDoc ? (
          <div style={{ backgroundColor: '#0d1117', padding: '16px', borderRadius: '6px', border: '1px solid #30363d' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, color: '#f0f6fc' }}>{activeDoc.title}</h4>
              <span className="badge badge-secret">{activeDoc.classification}</span>
            </div>

            <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '12px', fontFamily: 'monospace' }}>
              Document ID: <b>#{activeDoc.id}</b> | Owner ID: <b>#{activeDoc.owner_id}</b> | Created: {activeDoc.created_at}
            </div>

            <div style={{ backgroundColor: '#161b22', padding: '12px', borderRadius: '4px', border: '1px solid #21262d', fontSize: '13px', color: '#e6edf3', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {activeDoc.content}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
