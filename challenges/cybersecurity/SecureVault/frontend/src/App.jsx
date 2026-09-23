import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import LogViewer from './components/LogViewer';
import ConfigViewer from './pages/ConfigViewer';
import { logoutUser } from './services/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('documents'); // 'documents', 'search', 'logs', 'diagnostics'

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (err) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('secure_vault_token');
    setUser(null);
  }

  return (
    <div>
      <Navbar
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {!user ? (
        <Login onLoginSuccess={(u) => setUser(u)} />
      ) : activeTab === 'documents' ? (
        <Dashboard user={user} />
      ) : activeTab === 'search' ? (
        <Search />
      ) : activeTab === 'logs' ? (
        <div className="container">
          <LogViewer />
        </div>
      ) : (
        <ConfigViewer />
      )}
    </div>
  );
}
