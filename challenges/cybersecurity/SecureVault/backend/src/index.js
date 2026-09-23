import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = 5001;

// Auth Middleware (Helper)
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.headers['x-session-token'];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const db = await getDb();
  const session = await db.get('SELECT * FROM sessions WHERE token = ?', [token]);

  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }

  const user = await db.get('SELECT * FROM users WHERE id = ?', [session.user_id]);
  if (!user) {
    return res.status(401).json({ success: false, error: 'User not found' });
  }

  req.user = user;
  req.token = token;
  next();
}

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'SecureVault Security Lab Backend' });
});

// CASE-01 — WEAK AUTH & PLAINTEXT CREDENTIAL EXPOSURE
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = `sess_token_${user.id}_${Date.now()}`;
    await db.run('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, user.id]);

    // CASE-01: Exposes plaintext password in auth response payload
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        plaintext_password_debug: user.password, // CASE-01 Violation
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CASE-05 — INSECURE LOGOUT (Missing Token Invalidation on Server)
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    // CASE-05: Server returns success but DOES NOT DELETE token from sessions table!
    res.json({
      success: true,
      message: 'Logged out successfully on client. (Server session retained)',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// USER PROFILE
app.get('/api/user/profile', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      department: req.user.department,
      plaintext_password_debug: req.user.password, // CASE-01 Violation
    },
  });
});

// USER DOCUMENTS LIST (Filtered)
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const documents = await db.all('SELECT id, title, classification, created_at FROM documents WHERE owner_id = ?', [req.user.id]);
    res.json({ success: true, documents });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CASE-02 — BROKEN OBJECT LEVEL AUTHORIZATION (BOPA / IDOR)
app.get('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    // CASE-02: Missing check WHERE owner_id = req.user.id ! Any user can read document ID 2!
    const document = await db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({ success: true, document });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CASE-03 — REFLECTED XSS IN SEARCH ENDPOINT
app.get('/api/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    const queryStr = q || '';

    const db = await getDb();
    const results = await db.all(
      'SELECT id, title, classification FROM documents WHERE title LIKE ?',
      [`%${queryStr}%`]
    );

    // CASE-03: Returns raw query without output encoding
    res.json({
      success: true,
      query: queryStr, // CASE-03 Reflected XSS vulnerability parameter
      results,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CASE-04 — SENSITIVE INFORMATION EXPOSURE & INTERNAL CONFIG
app.get('/api/config', (req, res) => {
  // CASE-04: Exposes internal database path, secrets, and internal staging IPs
  res.json({
    success: true,
    environment: 'development-internal-lab',
    internal_ip: '192.168.1.100',
    db_file: './secure_vault.sqlite',
    master_jwt_secret: 'SECURE_VAULT_SUPER_SECRET_KEY_2026',
    admin_contact: 'sysadmin@securevault.local',
  });
});

// CASE-06 — EXPOSED UNPROTECTED ADMIN DIAGNOSTICS ENDPOINT
app.get('/api/admin/system-diagnostics', async (req, res) => {
  try {
    // CASE-06: No authentication or role check required!
    const db = await getDb();
    const users = await db.all('SELECT id, email, password, role FROM users');
    const documentCount = await db.get('SELECT COUNT(*) as count FROM documents');
    const activeSessions = await db.all('SELECT * FROM sessions');

    res.json({
      success: true,
      diagnostics: {
        server_time: new Date().toISOString(),
        total_documents: documentCount.count,
        registered_users: users, // Exposes user database!
        active_sessions: activeSessions,
        system_status: 'DIAGNOSTIC_MODE_ACTIVE',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CASE-07 — LOG FILES INSPECTION ROUTE
app.get('/api/logs/:filename', (req, res) => {
  const filename = req.params.filename;
  const allowed = ['auth.log', 'access.log', 'application.log'];

  if (!allowed.includes(filename)) {
    return res.status(404).json({ success: false, error: 'Log file not found' });
  }

  const logPath = path.resolve(__dirname, '../../logs', filename);
  if (!fs.existsSync(logPath)) {
    return res.status(404).json({ success: false, error: 'Log file missing' });
  }

  const content = fs.readFileSync(logPath, 'utf-8');
  res.setHeader('Content-Type', 'text/plain');
  res.send(content);
});

app.listen(PORT, () => {
  console.log(`[SecureVault Backend] Security Laboratory running on http://localhost:${PORT}`);
});
