import React from 'react';

export default function Navbar({ user, onLogout, activeTab, setActiveTab }) {
  return (
    <header className="header">
      <div className="brand">🛡️ SecureVault</div>

      {user && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTab('documents')}
            style={{ background: activeTab === 'documents' ? '#1f2937' : 'transparent', border: '1px solid #374151', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
          >
            My Documents
          </button>
          <button
            onClick={() => setActiveTab('search')}
            style={{ background: activeTab === 'search' ? '#1f2937' : 'transparent', border: '1px solid #374151', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Search Portal
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            style={{ background: activeTab === 'logs' ? '#1f2937' : 'transparent', border: '1px solid #374151', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Log Audit
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            style={{ background: activeTab === 'diagnostics' ? '#1f2937' : 'transparent', border: '1px solid #374151', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
          >
            System Config
          </button>

          <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '12px' }}>
            {user.name} ({user.role})
          </span>

          <button onClick={onLogout} className="btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#da3633' }}>
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
