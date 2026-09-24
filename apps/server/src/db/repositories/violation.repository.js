import { query } from '../postgres.js';

export const violationRepository = {
  async getLastSameType(teamId, type) {
    const res = await query(
      'SELECT created_at, server_timestamp FROM violations WHERE team_id = $1 AND type = $2 ORDER BY id DESC LIMIT 1',
      [teamId, type]
    );
    return res.rows[0] || null;
  },

  async recordViolation({ teamId, type, severity, description, metadata, clientTimestamp }) {
    const now = new Date().toISOString();
    const res = await query(
      `INSERT INTO violations (team_id, type, severity, description, metadata, client_timestamp, server_timestamp, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', $7)
       RETURNING *`,
      [teamId, type, severity, description, metadata || null, clientTimestamp || now, now]
    );
    return res.rows[0];
  },

  async getViolations({ team_id, track, severity, type, status, limit = 100, offset = 0 } = {}) {
    const whereClauses = [];
    const params = [];
    let idx = 1;

    if (team_id) { whereClauses.push(`team_id = $${idx++}`); params.push(team_id); }
    if (severity) { whereClauses.push(`severity = $${idx++}`); params.push(severity); }
    if (type) { whereClauses.push(`type = $${idx++}`); params.push(type); }
    if (status) { whereClauses.push(`status = $${idx++}`); params.push(status); }

    const vWhere = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let sql = `
      SELECT v.*, t.code as team_code, t.name as team_name, t.challenge as track, t.status as team_status
      FROM (SELECT * FROM violations ${vWhere}) v
      JOIN teams t ON v.team_id = t.id
      WHERE 1=1
    `;

    if (track) {
      sql += ` AND t.challenge = $${idx++}`;
      params.push(track);
    }

    sql += ` ORDER BY v.id DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(Number(limit), Number(offset));

    const res = await query(sql, params);
    return res.rows;
  },

  async updateStatus(violationId, status) {
    const res = await query(
      'UPDATE violations SET status = $1 WHERE id = $2 RETURNING *',
      [status, violationId]
    );
    return res.rows[0] || null;
  },

  async findById(violationId) {
    const res = await query('SELECT * FROM violations WHERE id = $1', [violationId]);
    return res.rows[0] || null;
  },
};
