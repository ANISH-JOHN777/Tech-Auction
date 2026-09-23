import React, { useState } from 'react';
import { loginUser } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('user1@securevault.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await loginUser(email, password);
      if (res.success) {
        localStorage.setItem('secure_vault_token', res.token);
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Authentication failed.');
      }
    } catch (err) {
      setError('Connection to SecureVault server failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 4px 0', color: '#38bdf8' }}>🛡️ SecureVault</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#8b949e' }}>
            Confidential Records & Document Management Gateway
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(218, 54, 51, 0.2)', border: '1px solid #da3633', color: '#f87171', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#c9d1d9' }}>ACCOUNT EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#c9d1d9' }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn" style={{ width: '100%', padding: '12px' }}>
            {loading ? 'Authenticating…' : 'Authenticate Gateway'}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #30363d', fontSize: '12px', color: '#8b949e' }}>
          <div><b>Demo Accounts:</b></div>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', marginTop: '4px' }}>
            User 1: user1@securevault.local / password123<br />
            User 2: user2@securevault.local / welcome2026<br />
            Admin: admin@securevault.local / adminpass
          </div>
        </div>
      </div>
    </div>
  );
}
