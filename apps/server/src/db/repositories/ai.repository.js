import { query } from '../postgres.js';

export const aiRepository = {
  async findActiveOrAvailableEntitlement(teamId, track) {
    const res = await query(
      `SELECT * FROM ai_entitlements WHERE team_id = $1 AND track = $2 AND status IN ('AVAILABLE', 'ACTIVE') ORDER BY id DESC LIMIT 1`,
      [teamId, track]
    );
    return res.rows[0] || null;
  },

  async findLatestEntitlement(teamId, track) {
    const res = await query(
      `SELECT * FROM ai_entitlements WHERE team_id = $1 AND track = $2 ORDER BY id DESC LIMIT 1`,
      [teamId, track]
    );
    return res.rows[0] || null;
  },

  async findAvailableEntitlement(teamId, track) {
    const res = await query(
      `SELECT * FROM ai_entitlements WHERE team_id = $1 AND track = $2 AND status = 'AVAILABLE' ORDER BY id DESC LIMIT 1`,
      [teamId, track]
    );
    return res.rows[0] || null;
  },

  async findActiveEntitlement(teamId, track) {
    const res = await query(
      `SELECT * FROM ai_entitlements WHERE team_id = $1 AND track = $2 AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1`,
      [teamId, track]
    );
    return res.rows[0] || null;
  },

  async createEntitlement({ teamId, teamCode, track, auctionItemId, durationSeconds = 900 }, client = null) {
    const q = client ? client.query.bind(client) : query;
    const now = new Date().toISOString();
    const res = await q(
      `INSERT INTO ai_entitlements (team_id, team_code, track, auction_item_id, provider, duration_seconds, status, request_count, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'gemini', $5, 'AVAILABLE', 0, $6, $6)
       RETURNING *`,
      [teamId, teamCode, track, auctionItemId, durationSeconds, now]
    );
    return res.rows[0];
  },

  async updateEntitlementStatus(id, status, extra = {}) {
    const now = new Date().toISOString();
    const keys = Object.keys(extra);
    const setClauses = ['status = $1', 'updated_at = $2'];
    const params = [status, now];
    let idx = 3;

    for (const key of keys) {
      setClauses.push(`${key} = $${idx++}`);
      params.push(extra[key]);
    }
    params.push(id);

    const res = await query(
      `UPDATE ai_entitlements SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return res.rows[0];
  },

  async logUsage({ teamId, entitlementId, requestNumber, userMessageLength, responseLength, model, success, errorCode }) {
    const res = await query(
      `INSERT INTO ai_usage_logs (team_id, entitlement_id, request_number, user_message_length, response_length, model, success, error_code, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [teamId, entitlementId, requestNumber, userMessageLength, responseLength, model, success ? 1 : 0, errorCode || null]
    );
    return res.rows[0];
  },

  async getAdminSessions() {
    const res = await query(`
      SELECT e.*, t.name as team_name, t.code as team_code, t.challenge as team_track,
             COALESCE(COUNT(l.id), 0)::int as log_count
      FROM ai_entitlements e
      JOIN teams t ON e.team_id = t.id
      LEFT JOIN ai_usage_logs l ON l.entitlement_id = e.id
      GROUP BY e.id, t.name, t.code, t.challenge
      ORDER BY e.created_at DESC
    `);
    return res.rows;
  },
};
