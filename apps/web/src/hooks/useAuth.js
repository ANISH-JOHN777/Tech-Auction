import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function useAuth() {
  const [team, setTeam] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('tech_auction_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.getMe();
        setTeam(data.team);
      } catch (err) {
        console.warn('Student session invalid:', err.message);
        localStorage.removeItem('tech_auction_token');
        setToken(null);
        setTeam(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [token]);

  async function login(teamCode, pin) {
    setError('');
    try {
      const data = await api.login(teamCode, pin);
      localStorage.setItem('tech_auction_token', data.token);
      setToken(data.token);
      setTeam(data.team);
      return data.team;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function logout() {
    try {
      await api.logout();
    } catch (err) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('tech_auction_token');
    setToken(null);
    setTeam(null);
  }

  async function selectChallenge(challengeName) {
    setError('');
    try {
      const data = await api.selectChallenge(challengeName);
      setTeam(data.team);
      return data.team;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  return {
    team,
    token,
    loading,
    error,
    login,
    logout,
    selectChallenge,
    setTeam,
  };
}
