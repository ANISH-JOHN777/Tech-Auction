import { query } from '../postgres.js';

const TRACK_ASSERTIONS = {
  'full-stack': ['FS_SEARCH_FILTER', 'FS_API_RESPONSE', 'FS_STATUS_UPDATE', 'FS_SUBMISSION'],
  'cybersecurity': ['CY_PASSWORD_EXPOSURE', 'CY_IDOR_AUTHORIZATION', 'CY_SESSION_REVOCATION', 'CY_XSS_PROTECTION'],
};

export const scoreRepository = {
  async recordClearedBug(teamId, track, assertionKey) {
    const normalizedTrack = (track || '').toLowerCase();
    const allowedKeys = TRACK_ASSERTIONS[normalizedTrack] || [];
    if (!allowedKeys.includes(assertionKey)) {
      return null;
    }

    const res = await query(
      `INSERT INTO team_cleared_bugs (team_id, track, assertion_key, cleared_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (team_id, assertion_key) DO NOTHING
       RETURNING *`,
      [teamId, normalizedTrack, assertionKey]
    );
    return res.rows[0] || null;
  },

  async getClearedBugs(teamId) {
    const res = await query(
      'SELECT assertion_key, track, cleared_at FROM team_cleared_bugs WHERE team_id = $1 ORDER BY cleared_at ASC',
      [teamId]
    );
    return res.rows;
  },

  async countClearedBugs(teamId) {
    const res = await query(
      'SELECT COUNT(*)::int as count FROM team_cleared_bugs WHERE team_id = $1',
      [teamId]
    );
    return res.rows[0].count;
  },

  async findBySubmissionId(submissionId) {
    const res = await query('SELECT * FROM scores WHERE submission_id = $1', [submissionId]);
    return res.rows[0] || null;
  },

  async getPublicLeaderboard() {
    const res = await query(`
      SELECT sc.total_score, sc.track, s.submitted_at, t.id as team_id, t.name as team_name, t.code as team_code,
             COALESCE(b.bugs_cleared, 0) as bugs_cleared,
             COALESCE(w.balance - w.held_balance, 1000) as remaining_credits
      FROM scores sc
      JOIN submissions s ON sc.submission_id = s.id
      JOIN teams t ON sc.team_id = t.id
      LEFT JOIN (
        SELECT team_id, COUNT(*)::int as bugs_cleared FROM team_cleared_bugs GROUP BY team_id
      ) b ON t.id = b.team_id
      LEFT JOIN wallets w ON t.id = w.team_id
      WHERE s.status = 'FINAL'
      ORDER BY sc.total_score DESC, b.bugs_cleared DESC, (w.balance - w.held_balance) DESC, s.submitted_at ASC
    `);
    return res.rows;
  },

  async getAdminLeaderboard() {
    const res = await query(`
      SELECT sc.*, s.submitted_at, s.status as submission_status, t.name as team_name, t.code as team_code,
             COALESCE(b.bugs_cleared, 0) as bugs_cleared,
             COALESCE(w.balance - w.held_balance, 1000) as remaining_credits
      FROM scores sc
      JOIN submissions s ON sc.submission_id = s.id
      JOIN teams t ON sc.team_id = t.id
      LEFT JOIN (
        SELECT team_id, COUNT(*)::int as bugs_cleared FROM team_cleared_bugs GROUP BY team_id
      ) b ON t.id = b.team_id
      LEFT JOIN wallets w ON t.id = w.team_id
      ORDER BY sc.total_score DESC, b.bugs_cleared DESC, (w.balance - w.held_balance) DESC, s.submitted_at ASC
    `);
    return res.rows;
  },
};
