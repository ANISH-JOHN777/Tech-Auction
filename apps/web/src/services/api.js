const API_BASE_URL = 'http://localhost:4000';

function getStudentHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('tech_auction_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function getAdminHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('tech_auction_admin_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function request(endpoint, options = {}, isAdmin = false) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...(isAdmin ? getAdminHeaders() : getStudentHeaders()),
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, config);
    const result = await response.json();

    if (!response.ok || result.success === false) {
      const errorMsg = result.error?.message || result.error || 'API request failed';
      throw new Error(errorMsg);
    }

    return result.data !== undefined ? result.data : result;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Student API
  login: (teamCode, pin) => request('/api/login', { method: 'POST', body: JSON.stringify({ teamCode, pin }) }),
  logout: () => request('/api/logout', { method: 'POST' }),
  getMe: () => request('/api/me', { method: 'GET' }),
  selectChallenge: (challenge) => request('/api/team/challenge', { method: 'POST', body: JSON.stringify({ challenge }) }),
  getWallet: () => request('/api/auction/wallet', { method: 'GET' }),
  getAuctionCatalog: (challenge) => request(`/api/auction/catalog/${challenge || ''}`, { method: 'GET' }),
  getAuction: (challenge) => request(`/api/auction/${challenge || ''}`, { method: 'GET' }),
  placeBid: (amount) => request('/api/auction/bid', { method: 'POST', body: JSON.stringify({ amount }) }),
  askAI: (prompt) => request('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message: prompt }) }),
  getAIStatus: () => request('/api/ai/status', { method: 'GET' }),
  startAIAssist: () => request('/api/ai/start', { method: 'POST' }),
  stopAIAssist: () => request('/api/ai/stop', { method: 'POST' }),
  chatAI: (message) => request('/api/ai/chat', { method: 'POST', body: JSON.stringify({ message }) }),

  // Admin AI Monitoring API
  getAdminAISessions: () => request('/api/ai/admin/sessions', { method: 'GET' }, true),
  revokeAdminAISession: (id) => request(`/api/ai/admin/revoke/${id}`, { method: 'POST' }, true),

  // Student Submission & Leaderboard API
  getSubmission: () => request('/api/submission', { method: 'GET' }),
  submitChallenge: (data) => request('/api/submission', { method: 'POST', body: JSON.stringify(data) }),
  getPublicLeaderboard: () => request('/api/leaderboard', { method: 'GET' }),
  getEventSettings: () => request('/api/event/settings', { method: 'GET' }),

  // Admin Submissions, Evaluation & Event Control API
  getAdminSubmissions: (search = '', track = '', status = '') =>
    request(`/api/admin/submissions?search=${encodeURIComponent(search)}&track=${encodeURIComponent(track)}&status=${encodeURIComponent(status)}`, { method: 'GET' }, true),
  getAdminSubmissionById: (id) => request(`/api/admin/submissions/${id}`, { method: 'GET' }, true),
  evaluateAdminSubmission: (id, scoreData) => request(`/api/admin/submissions/${id}/evaluate`, { method: 'POST', body: JSON.stringify(scoreData) }, true),
  reopenAdminSubmission: (id, notes = '') => request(`/api/admin/submissions/${id}/reopen`, { method: 'POST', body: JSON.stringify({ notes }) }, true),
  getAdminLeaderboard: () => request('/api/admin/leaderboard', { method: 'GET' }, true),
  updateAdminEventSetting: (key, value) => request('/api/admin/event/settings', { method: 'POST', body: JSON.stringify({ key, value }) }, true),


  // Admin API
  adminLogin: (username, password) => request('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }, true),
  getAdminMe: () => request('/api/admin/me', { method: 'GET' }, true),
  getAdminTeams: (search = '', challenge = '') => request(`/api/admin/teams?search=${encodeURIComponent(search)}&challenge=${encodeURIComponent(challenge)}`, { method: 'GET' }, true),
  getAdminTeamById: (id) => request(`/api/admin/teams/${id}`, { method: 'GET' }, true),
  updateAdminTeam: (id, updates) => request(`/api/admin/teams/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }, true),
  importRegistrations: (csvText) => request('/api/admin/import/registrations', { method: 'POST', body: JSON.stringify({ csvText }) }, true),
  resetDemoData: () => request('/api/admin/reset-demo', { method: 'POST' }, true),

  // Admin Auction Engine Controls
  getAdminAuctionState: () => request('/api/admin/auction', { method: 'GET' }, true),
  createAdminAuctionItem: (itemData) => request('/api/admin/auction/items', { method: 'POST', body: JSON.stringify(itemData) }, true),
  updateAdminAuctionItem: (id, updates) => request(`/api/admin/auction/items/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }, true),
  startAdminAuction: (track, itemId, durationSeconds) => request('/api/admin/auction/start', { method: 'POST', body: JSON.stringify({ track, itemId, durationSeconds }) }, true),
  pauseAdminAuction: (track) => request('/api/admin/auction/pause', { method: 'POST', body: JSON.stringify({ track }) }, true),
  endAdminItemEarly: (itemId) => request('/api/admin/auction/end-item', { method: 'POST', body: JSON.stringify({ itemId }) }, true),
  adjustAdminWallet: (teamId, amount, description) => request('/api/admin/wallet/adjust', { method: 'POST', body: JSON.stringify({ teamId, amount, description }) }, true),
  getAdminWinners: () => request('/api/admin/auction/winners', { method: 'GET' }, true),
};
