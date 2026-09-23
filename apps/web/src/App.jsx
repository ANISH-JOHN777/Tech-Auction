import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import { useAuth } from './hooks/useAuth';
import { useAdminAuth } from './hooks/useAdminAuth';

export default function App() {
  const { team, loading: studentLoading, error: studentError, login, logout, selectChallenge } = useAuth();
  const { admin, loading: adminLoading, error: adminError, adminLogin, adminLogout } = useAdminAuth();

  const [isAdminView, setIsAdminView] = useState(
    window.location.pathname.startsWith('/admin')
  );

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminView(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function toggleAdminView() {
    const newView = !isAdminView;
    setIsAdminView(newView);
    if (newView) {
      window.history.pushState(null, '', '/admin');
    } else {
      window.history.pushState(null, '', '/');
    }
  }

  if (studentLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xs font-mono text-zinc-400">INITIALIZING TECH AUCTION PLATFORM…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Navbar
        team={team}
        onLogout={logout}
        isAdminView={isAdminView}
        onToggleAdminView={toggleAdminView}
      />

      <main className="flex-1">
        {isAdminView ? (
          !admin ? (
            <AdminLogin onAdminLogin={adminLogin} error={adminError} />
          ) : (
            <AdminDashboard admin={admin} onLogout={adminLogout} />
          )
        ) : !team ? (
          <Login onLogin={login} error={studentError} />
        ) : (
          <Dashboard
            team={team}
            onSelectChallenge={selectChallenge}
            error={studentError}
          />
        )}
      </main>

      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
        TECH AUCTION 2026 — SNS COLLEGE OF TECHNOLOGY (DEPT OF IT)
      </footer>
    </div>
  );
}
