import React from 'react';

export default function Navbar({ student, onLogout, viewMode, setViewMode }) {
  return (
    <header className="header">
      <div className="brand">CampusConnect</div>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button
          onClick={() => setViewMode(viewMode === 'student' ? 'admin' : 'student')}
          style={{ background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
        >
          {viewMode === 'student' ? 'Switch to Admin View' : 'Switch to Student View'}
        </button>

        {student && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>
              Logged in: <b style={{ color: '#white' }}>{student.name}</b>
            </span>
            <button onClick={onLogout} className="btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#dc2626' }}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
