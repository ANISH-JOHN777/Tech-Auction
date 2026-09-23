import React, { useState } from 'react';
import { loginStudent } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('alex@campus.edu');
  const [password, setPassword] = useState('student123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await loginStudent(email, password);

      // BUG-01 Note: Backend returns key 'user', but frontend looks for 'student'
      if (res.success && res.student) {
        onLoginSuccess(res.student);
      } else if (res.success && !res.student) {
        // BUG-01 symptom: Backend returns success: true, but res.student is undefined!
        setError('Login succeeded but student profile data is missing from server response.');
      } else {
        setError(res.error || 'Invalid email or password.');
      }
    } catch (err) {
      setError('Connection to backend failed. Please verify server is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 8px 0', color: '#60a5fa' }}>Student Portal Login</h2>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>
          CampusConnect Placement & Event System
        </p>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1' }}>STUDENT EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1' }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn" style={{ width: '100%', padding: '12px' }}>
            {loading ? 'Authenticating…' : 'Login to CampusConnect'}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #334155', fontSize: '12px', color: '#64748b' }}>
          Demo credentials: <b style={{ color: '#94a3b8' }}>alex@campus.edu / student123</b>
        </div>
      </div>
    </div>
  );
}
