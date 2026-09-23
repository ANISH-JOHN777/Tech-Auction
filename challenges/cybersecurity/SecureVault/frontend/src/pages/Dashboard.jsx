import React, { useState, useEffect } from 'react';
import { fetchDocuments } from '../services/api';
import DocumentViewer from '../components/DocumentViewer';

export default function Dashboard({ user }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDocs() {
      setLoading(true);
      try {
        const res = await fetchDocuments();
        if (res.success) setDocuments(res.documents);
      } catch (err) {
        console.error('Failed to load documents:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDocs();
  }, []);

  return (
    <div className="container">
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#38bdf8' }}>Welcome, {user.name}</h2>
          <div style={{ fontSize: '12px', color: '#8b949e', fontFamily: 'monospace' }}>
            User ID: <b>#{user.id}</b> | Role: <b>{user.role}</b> | Dept: <b>{user.department}</b>
          </div>
        </div>

        {/* CASE-01 Debug Exposure Indicator */}
        {user.plaintext_password_debug && (
          <div style={{ backgroundColor: 'rgba(218, 54, 51, 0.1)', border: '1px solid rgba(218, 54, 51, 0.3)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', color: '#f87171' }}>
            DEBUG PASS: {user.plaintext_password_debug}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, color: '#f0f6fc' }}>My Authorized Vault Documents</h3>

        {loading ? (
          <div style={{ color: '#8b949e', padding: '20px', textAlign: 'center' }}>Loading vault records…</div>
        ) : documents.length === 0 ? (
          <div style={{ color: '#8b949e', padding: '20px', textAlign: 'center' }}>No documents found for your account.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{ backgroundColor: '#0d1117', border: '1px solid #30363d', padding: '12px 16px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', color: '#f0f6fc' }}>{doc.title}</div>
                  <div style={{ fontSize: '11px', color: '#8b949e', fontFamily: 'monospace', marginTop: '2px' }}>
                    Document ID: #{doc.id} | Classification: {doc.classification}
                  </div>
                </div>

                <button onClick={() => setSelectedDoc(doc)} className="btn" style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Inspect Document
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedDoc && (
        <DocumentViewer document={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}
