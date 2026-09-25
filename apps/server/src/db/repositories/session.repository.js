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

  async createSession({ token, teamCode = null, studentId = null, userType = 'student', expiresAt }) {
    const res = await query(
      `INSERT INTO sessions (token, team_code, student_id, user_type, created_at, expires_at)
       VALUES ($1, $2, $3, $4, NOW(), $5)
       RETURNING *`,
      [token, teamCode, studentId, userType, expiresAt]
    );
    return res.rows[0];
  },

  async updateSessionTeam(token, teamCode) {
    const res = await query(
      'UPDATE sessions SET team_code = $1 WHERE token = $2 RETURNING *',
      [teamCode, token]
    );
    return res.rows[0] || null;
  },

  async deleteByToken(token) {
    await query('DELETE FROM sessions WHERE token = $1', [token]);
  },
};
