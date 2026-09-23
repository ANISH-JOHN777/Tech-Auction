const API_URL = 'http://localhost:5001/api';

function getHeaders() {
  const token = localStorage.getItem('secure_vault_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function loginUser(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function logoutUser() {
  const res = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return res.json();
}

export async function fetchProfile() {
  const res = await fetch(`${API_URL}/user/profile`, { headers: getHeaders() });
  return res.json();
}

export async function fetchDocuments() {
  const res = await fetch(`${API_URL}/documents`, { headers: getHeaders() });
  return res.json();
}

export async function fetchDocumentById(id) {
  const res = await fetch(`${API_URL}/documents/${id}`, { headers: getHeaders() });
  return res.json();
}

export async function searchVault(query) {
  const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`, { headers: getHeaders() });
  return res.json();
}

export async function fetchConfig() {
  const res = await fetch(`${API_URL}/config`);
  return res.json();
}

export async function fetchSystemDiagnostics() {
  const res = await fetch(`${API_URL}/admin/system-diagnostics`);
  return res.json();
}

export async function fetchLogFile(filename) {
  const res = await fetch(`${API_URL}/logs/${filename}`);
  return res.text();
}
