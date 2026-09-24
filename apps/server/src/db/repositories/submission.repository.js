import { query } from '../postgres.js';

export const submissionRepository = {
  async findLatestByTeamAndTrack(teamId, track) {
    const res = await query(
      'SELECT * FROM submissions WHERE team_id = $1 AND track = $2 ORDER BY id DESC LIMIT 1',
      [teamId, track]
    );
    return res.rows[0] || null;
  },

  async findById(submissionId) {
    const res = await query(
      `SELECT s.*, t.name as team_name, t.code as team_code, t.college as team_college, t.department as team_department
       FROM submissions s
       JOIN teams t ON s.team_id = t.id
       WHERE s.id = $1`,
      [submissionId]
    );
    return res.rows[0] || null;
  },

  async findAdminSubmissions({ track = '', status = '', search = '' }) {
    const whereClauses = [];
    const params = [];
    let idx = 1;

    if (track) { whereClauses.push(`track = $${idx++}`); params.push(track); }
    if (status) { whereClauses.push(`status = $${idx++}`); params.push(status); }

    const sWhere = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let sql = `
      SELECT s.*, t.name as team_name, t.code as team_code, t.college as team_college,
             sc.total_score, sc.evaluated_by, sc.evaluated_at
      FROM (SELECT * FROM submissions ${sWhere}) s
      JOIN teams t ON s.team_id = t.id
      LEFT JOIN scores sc ON s.id = sc.submission_id
      WHERE 1=1
    `;

    if (search) {
      sql += ` AND (t.name ILIKE $${idx} OR t.code ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ' ORDER BY s.submitted_at DESC';
    const res = await query(sql, params);
    return res.rows;
  },

  async countDistinctSubmittedTeams() {
    const res = await query('SELECT COUNT(DISTINCT team_id)::int as count FROM submissions');
    return res.rows[0].count;
  },
};
