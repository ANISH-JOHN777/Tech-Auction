import { query } from '../postgres.js';

export const auditRepository = {
  async recordAdminAction(adminUser, teamId, action, reason) {
    const res = await query(
      `INSERT INTO event_admin_actions (admin_user, team_id, action, reason, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [adminUser || 'admin', teamId || null, action, reason || null]
    );
    return res.rows[0];
  },

  async recordEvaluationEvent(submissionId, action, actor, notes) {
    const res = await query(
      `INSERT INTO evaluation_events (submission_id, action, actor, notes, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [submissionId, action, actor, notes || null]
    );
    return res.rows[0];
  },

  async getEvaluationEventsForSubmission(submissionId) {
    const res = await query(
      'SELECT * FROM evaluation_events WHERE submission_id = $1 ORDER BY id DESC',
      [submissionId]
    );
    return res.rows;
  },
};
