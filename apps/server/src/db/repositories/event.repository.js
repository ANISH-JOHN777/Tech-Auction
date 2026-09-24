import { query } from '../postgres.js';

export const eventRepository = {
  async getSettings() {
    const res = await query('SELECT key, value FROM event_settings');
    const settings = {};
    for (const r of res.rows) {
      settings[r.key] = r.value;
    }
    return settings;
  },

  async getSettingByKey(key) {
    const res = await query('SELECT value FROM event_settings WHERE key = $1', [key]);
    return res.rows[0] ? res.rows[0].value : null;
  },

  async setSetting(key, value) {
    const now = new Date().toISOString();
    const res = await query(
      `INSERT INTO event_settings (key, value, updated_at) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [key, String(value), now]
    );
    return res.rows[0];
  },

  async upsertSession({ teamId, sessionId, visibilityState, fullscreenEnabled, clientMetadata }) {
    const now = new Date().toISOString();
    const active = await query(
      "SELECT * FROM team_event_sessions WHERE team_id = $1 AND status = 'ACTIVE' AND session_id = $2",
      [teamId, sessionId]
    );

    if (active.rows.length === 0) {
      const res = await query(
        `INSERT INTO team_event_sessions (team_id, session_id, started_at, last_heartbeat, last_visibility_state, fullscreen_enabled, status, client_metadata)
         VALUES ($1, $2, $3, $3, $4, $5, 'ACTIVE', $6)
         RETURNING *`,
        [teamId, sessionId, now, visibilityState, fullscreenEnabled ? 1 : 0, JSON.stringify(clientMetadata)]
      );
      return res.rows[0];
    } else {
      const res = await query(
        `UPDATE team_event_sessions
         SET last_heartbeat = $1, last_visibility_state = $2, fullscreen_enabled = $3, client_metadata = $4
         WHERE id = $5 RETURNING *`,
        [now, visibilityState, fullscreenEnabled ? 1 : 0, JSON.stringify(clientMetadata), active.rows[0].id]
      );
      return res.rows[0];
    }
  },

  async getActiveEventSessions() {
    const res = await query(`
      SELECT s.*, t.code as team_code, t.name as team_name, t.status as team_status
      FROM team_event_sessions s
      JOIN teams t ON s.team_id = t.id
      WHERE s.status = 'ACTIVE'
    `);
    return res.rows;
  },
};
