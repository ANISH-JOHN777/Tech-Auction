import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function useAdminAuth() {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('tech_auction_admin_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkAdminAuth() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.getAdminMe();
        setAdmin({ username: data.username });
      } catch (err) {
        console.warn('Admin session invalid:', err.message);
        localStorage.removeItem('tech_auction_admin_token');
        setToken(null);
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    }
    checkAdminAuth();
  }, [token]);

  async function adminLogin(username, password) {
    setError('');
    try {
      const data = await api.adminLogin(username, password);
      localStorage.setItem('tech_auction_admin_token', data.token);
      setToken(data.token);
      setAdmin({ username: data.username });
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  function adminLogout() {
    localStorage.removeItem('tech_auction_admin_token');
    setToken(null);
    setAdmin(null);
  }

  return {
    admin,
    token,
    loading,
    error,
    adminLogin,
    adminLogout,
  };
}
