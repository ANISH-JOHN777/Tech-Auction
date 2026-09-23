import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminView from './pages/AdminView';

export default function App() {
  const [student, setStudent] = useState(null);
  const [viewMode, setViewMode] = useState('student'); // 'student' or 'admin'

  return (
    <div>
      <Navbar
        student={student}
        onLogout={() => setStudent(null)}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {viewMode === 'admin' ? (
        <AdminView />
      ) : !student ? (
        <Login onLoginSuccess={(s) => setStudent(s)} />
      ) : (
        <Dashboard student={student} />
      )}
    </div>
  );
}
