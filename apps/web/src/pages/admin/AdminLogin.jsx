import React, { useState } from 'react';

export default function AdminLogin({ onAdminLogin, error }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    try {
      await onAdminLogin(username.trim(), password.trim());
    } catch (err) {
      // Handled in parent
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-amber-500/30 p-8 rounded-2xl shadow-2xl gold-glow-border">
        <div className="text-center mb-8">
          <div className="text-xs font-bold tracking-widest text-amber-500 uppercase mb-1">
            TECH AUCTION 2026
          </div>
          <h1 className="text-3xl font-black text-white">ORGANIZER ADMIN LOGIN</h1>
          <p className="text-xs text-zinc-400 mt-1">Authorized Staff Portal</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
              ADMIN USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white px-4 py-3 rounded-lg outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
              ADMIN PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white px-4 py-3 rounded-lg outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="gold-button w-full py-3.5 rounded-lg font-bold text-sm tracking-wider uppercase"
          >
            {submitting ? 'AUTHENTICATING…' : 'ACCESS ADMIN PANEL'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">
          Default dev credentials: <span className="font-mono text-zinc-400">admin / admin123</span>
        </div>
      </div>
    </div>
  );
}
