import { getDb } from '../db/database.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.headers['x-session-token'];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in.',
        },
      });
    }

    const db = getDb();
    const session = await db.get(
      `SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')`,
      [token]
    );

    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SESSION',
          message: 'Session invalid or expired. Please log in again.',
        },
      });
    }

    if (session.user_type !== 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Student session required for this action.',
        },
      });
    }

    const team = await db.get(`SELECT * FROM teams WHERE code = ?`, [session.team_code]);
    if (!team) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TEAM_NOT_FOUND',
          message: 'Associated team no longer exists.',
        },
      });
    }

    if (!team.login_enabled) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'LOGIN_DISABLED',
          message: 'Login for your team has been disabled by the organizer.',
        },
      });
    }

    // Load team members
    const members = await db.all(`SELECT id, name, email, phone, role FROM team_members WHERE team_id = ?`, [team.id]);
    team.members = members;

    req.team = team;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.headers['x-session-token'];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin authentication required.',
        },
      });
    }

    const db = getDb();
    const session = await db.get(
      `SELECT * FROM sessions WHERE token = ? AND user_type = 'admin' AND expires_at > datetime('now')`,
      [token]
    );

    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_ADMIN_SESSION',
          message: 'Admin session invalid or expired.',
        },
      });
    }

    req.adminToken = token;
    next();
  } catch (err) {
    next(err);
  }
}
