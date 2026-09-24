import { query } from '../postgres.js';

export const sessionRepository = {
  async findByToken(token) {
    if (!token) return null;
    const res = await query(
      'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    return res.rows[0] || null;
  },

  async findAdminByToken(token) {
    if (!token) return null;
    const res = await query(
      "SELECT * FROM sessions WHERE token = $1 AND user_type = 'admin' AND expires_at > NOW()",
      [token]
    );
    return res.rows[0] || null;
  },

  async createSession({ token, teamCode = 'ADMIN', userType = 'student', expiresAt }) {
    const res = await query(
      `INSERT INTO sessions (token, team_code, user_type, created_at, expires_at)
       VALUES ($1, $2, $3, NOW(), $4)
       RETURNING *`,
      [token, teamCode, userType, expiresAt]
    );
    return res.rows[0];
  },

  async deleteByToken(token) {
    await query('DELETE FROM sessions WHERE token = $1', [token]);
  },
};
