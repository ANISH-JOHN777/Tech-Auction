import { query } from '../postgres.js';

export const scoreRepository = {
  async findBySubmissionId(submissionId) {
    const res = await query('SELECT * FROM scores WHERE submission_id = $1', [submissionId]);
    return res.rows[0] || null;
  },

  async getPublicLeaderboard() {
    const res = await query(`
      SELECT sc.total_score, sc.track, s.submitted_at, t.name as team_name, t.code as team_code
      FROM scores sc
      JOIN submissions s ON sc.submission_id = s.id
      JOIN teams t ON sc.team_id = t.id
      WHERE s.status = 'FINAL'
      ORDER BY sc.total_score DESC, s.submitted_at ASC
    `);
    return res.rows;
  },

  async getAdminLeaderboard() {
    const res = await query(`
      SELECT sc.*, s.submitted_at, s.status as submission_status, t.name as team_name, t.code as team_code
      FROM scores sc
      JOIN submissions s ON sc.submission_id = s.id
      JOIN teams t ON sc.team_id = t.id
      ORDER BY sc.total_score DESC, s.submitted_at ASC
    `);
    return res.rows;
  },
};
