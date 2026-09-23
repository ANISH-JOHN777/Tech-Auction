import { getDb } from '../db/database.js';

// Rate limit windows in seconds
const RATE_LIMITS = {
  TAB_HIDDEN: 30,
  WINDOW_BLUR: 30,
  FULLSCREEN_EXIT: 30,
  DEVTOOLS_SUSPECTED: 60,
  COPY_ATTEMPT: 5,
  PASTE_ATTEMPT: 5,
  CONTEXT_MENU: 10,
};

export class EventService {
  /**
   * Process heartbeat from authenticated student session
   */
  static async processHeartbeat(teamId, sessionId, payload = {}) {
    const db = getDb();
    const now = new Date().toISOString();
    const { visibilityState = 'visible', fullscreenEnabled = false, clientMetadata = {} } = payload;

    // 1. Check existing active sessions for this team
    const activeSessions = await db.all(
      `SELECT * FROM team_event_sessions WHERE team_id = ? AND status = 'ACTIVE'`,
      [teamId]
    );

    let currentSession = activeSessions.find((s) => s.session_id === sessionId);

    // If second active session detected from different session_id, log MULTIPLE_SESSION violation
    if (activeSessions.length > 0 && !currentSession) {
      // Check rate limit for MULTIPLE_SESSION violation
      const lastMult = await db.get(
        `SELECT created_at FROM violations WHERE team_id = ? AND type = 'MULTIPLE_SESSION' ORDER BY id DESC LIMIT 1`,
        [teamId]
      );
      if (!lastMult || (new Date(now) - new Date(lastMult.created_at)) / 1000 > 30) {
        await this.recordViolation({
          teamId,
          type: 'MULTIPLE_SESSION',
          severity: 'HIGH',
          description: `Multiple active sessions detected for team. Current session: ${sessionId}`,
          metadata: JSON.stringify({ existing_sessions: activeSessions.map((s) => s.session_id), new_session: sessionId }),
        });
      }
    }

    if (!currentSession) {
      const res = await db.run(
        `INSERT INTO team_event_sessions (team_id, session_id, started_at, last_heartbeat, last_visibility_state, fullscreen_enabled, status, client_metadata)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
        [teamId, sessionId, now, now, visibilityState, fullscreenEnabled ? 1 : 0, JSON.stringify(clientMetadata)]
      );
      currentSession = { id: res.lastID, team_id: teamId, session_id: sessionId };
    } else {
      await db.run(
        `UPDATE team_event_sessions
         SET last_heartbeat = ?, last_visibility_state = ?, fullscreen_enabled = ?, client_metadata = ?
         WHERE id = ?`,
        [now, visibilityState, fullscreenEnabled ? 1 : 0, JSON.stringify(clientMetadata), currentSession.id]
      );
    }

    // Get current event status
    const statusSetting = await db.get("SELECT value FROM event_settings WHERE key = 'event_status'");
    const deadlineSetting = await db.get("SELECT value FROM event_settings WHERE key = 'challenge_deadline'");
    const team = await db.get('SELECT status FROM teams WHERE id = ?', [teamId]);

    return {
      success: true,
      event_status: statusSetting ? statusSetting.value : 'SETUP',
      challenge_deadline: deadlineSetting ? deadlineSetting.value : null,
      team_status: team ? team.status : 'ACTIVE',
      session_id: sessionId,
      last_heartbeat: now,
    };
  }

  /**
   * Record a violation with privacy sanitization and rate-limiting
   */
  static async recordViolation({ teamId, type, severity, description, metadata, clientTimestamp }) {
    const db = getDb();
    const now = new Date().toISOString();

    // Default severity mapping if not provided
    if (!severity) {
      if (['MULTIPLE_SESSION', 'DEVTOOLS_SUSPECTED'].includes(type)) {
        severity = 'HIGH';
      } else if (['FULLSCREEN_EXIT', 'TAB_HIDDEN', 'WINDOW_BLUR'].includes(type)) {
        severity = 'WARNING';
      } else {
        severity = 'INFO';
      }
    }

    // Rate-limiting check
    const windowSeconds = RATE_LIMITS[type] || 5;
    const lastSameType = await db.get(
      `SELECT created_at, server_timestamp FROM violations WHERE team_id = ? AND type = ? ORDER BY id DESC LIMIT 1`,
      [teamId, type]
    );

    if (lastSameType) {
      const lastTimeStr = lastSameType.created_at || lastSameType.server_timestamp;
      if (lastTimeStr) {
        const lastTime = new Date(lastTimeStr).getTime();
        const currentTime = new Date(now).getTime();
        const elapsed = (currentTime - lastTime) / 1000;
        if (elapsed >= 0 && elapsed < windowSeconds) {
          return {
            rate_limited: true,
            message: `Violation rate limited (${type} cooldown is ${windowSeconds}s)`,
          };
        }
      }
    }

    // Privacy Sanitization: ensure clipboard text or passwords are NEVER logged
    let cleanMetadata = metadata;
    if (typeof metadata === 'object') {
      const copy = { ...metadata };
      delete copy.clipboardText;
      delete copy.text;
      delete copy.content;
      delete copy.clipboardData;
      cleanMetadata = JSON.stringify(copy);
    } else if (typeof metadata === 'string') {
      // If raw string passed, ensure no content leaks
      try {
        const parsed = JSON.parse(metadata);
        delete parsed.clipboardText;
        delete parsed.text;
        delete parsed.content;
        cleanMetadata = JSON.stringify(parsed);
      } catch (e) {
        cleanMetadata = JSON.stringify({ sanitized: true });
      }
    }

    const cleanDescription = description
      ? String(description).replace(/content:.*$/i, '').substring(0, 255)
      : `${type} event logged`;

    const res = await db.run(
      `INSERT INTO violations (team_id, type, severity, description, metadata, client_timestamp, server_timestamp, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
      [teamId, type, severity, cleanDescription, cleanMetadata || null, clientTimestamp || now, now, now]
    );

    return {
      id: res.lastID,
      team_id: teamId,
      type,
      severity,
      description: cleanDescription,
      status: 'OPEN',
      created_at: now,
    };
  }

  /**
   * Admin view of violations with filtering
   */
  static async getViolations({ team_id, track, severity, type, status, limit = 100, offset = 0 } = {}) {
    const db = getDb();
    let query = `
      SELECT v.*, t.code as team_code, t.name as team_name, t.challenge as track, t.status as team_status
      FROM violations v
      JOIN teams t ON v.team_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (team_id) {
      query += ` AND v.team_id = ?`;
      params.push(team_id);
    }
    if (track) {
      query += ` AND t.challenge = ?`;
      params.push(track);
    }
    if (severity) {
      query += ` AND v.severity = ?`;
      params.push(severity);
    }
    if (type) {
      query += ` AND v.type = ?`;
      params.push(type);
    }
    if (status) {
      query += ` AND v.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY v.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = await db.all(query, params);
    return rows;
  }

  /**
   * Admin action: update violation status (REVIEWED, DISMISSED, ACTION_TAKEN)
   */
  static async updateViolationStatus(adminUser, violationId, newStatus, reason = '') {
    const db = getDb();
    const now = new Date().toISOString();

    const violation = await db.get('SELECT * FROM violations WHERE id = ?', [violationId]);
    if (!violation) {
      throw new Error('Violation not found');
    }

    await db.run('UPDATE violations SET status = ? WHERE id = ?', [newStatus, violationId]);

    const actionType = newStatus === 'DISMISSED' ? 'VIOLATION_DISMISSED' : 'VIOLATION_REVIEWED';
    await db.run(
      `INSERT INTO event_admin_actions (admin_user, team_id, action, reason, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [adminUser || 'admin', violation.team_id, actionType, reason || `Violation #${violationId} set to ${newStatus}`, now]
    );

    return { success: true, violation_id: violationId, status: newStatus };
  }

  /**
   * Admin action: suspend, disqualify, or reinstate a team
   */
  static async updateTeamStatus(adminUser, teamId, newStatus, reason) {
    if (!reason || !reason.trim()) {
      throw new Error('A valid reason is required for administrative team actions.');
    }

    const db = getDb();
    const now = new Date().toISOString();

    const team = await db.get('SELECT * FROM teams WHERE id = ?', [teamId]);
    if (!team) {
      throw new Error('Team not found');
    }

    await db.run('UPDATE teams SET status = ? WHERE id = ?', [newStatus, teamId]);

    let actionName = `TEAM_${newStatus}`;
    if (newStatus === 'ACTIVE') actionName = 'TEAM_REINSTATED';

    await db.run(
      `INSERT INTO event_admin_actions (admin_user, team_id, action, reason, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [adminUser || 'admin', teamId, actionName, reason.trim(), now]
    );

    return { success: true, team_id: teamId, team_code: team.code, new_status: newStatus, reason };
  }

  /**
   * Admin action: update overall event state (SETUP, READY, LIVE, PAUSED, ENDED)
   */
  static async updateEventState(adminUser, newEventStatus, deadline = null, reason = '') {
    const validStates = ['SETUP', 'READY', 'LIVE', 'PAUSED', 'ENDED'];
    if (!validStates.includes(newEventStatus)) {
      throw new Error(`Invalid event status: ${newEventStatus}`);
    }

    const db = getDb();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO event_settings (key, value, updated_at) VALUES ('event_status', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [newEventStatus, now]
    );

    if (newEventStatus === 'LIVE') {
      await db.run(
        `INSERT INTO event_settings (key, value, updated_at) VALUES ('event_started_at', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [now, now]
      );
      await db.run(
        `INSERT INTO event_settings (key, value, updated_at) VALUES ('challenge_started_at', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [now, now]
      );
    }

    if (deadline) {
      await db.run(
        `INSERT INTO event_settings (key, value, updated_at) VALUES ('challenge_deadline', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [deadline, now]
      );
    }

    const actionName = `EVENT_${newEventStatus}`;
    await db.run(
      `INSERT INTO event_admin_actions (admin_user, team_id, action, reason, created_at)
       VALUES (?, NULL, ?, ?, ?)`,
      [adminUser || 'admin', actionName, reason || `Event status changed to ${newEventStatus}`, now]
    );

    return { success: true, event_status: newEventStatus, updated_at: now };
  }

  /**
   * Organizer Dashboard / Monitoring Summary
   */
  static async getEventSummary() {
    const db = getDb();

    // Event settings
    const settingsRows = await db.all('SELECT key, value FROM event_settings');
    const settings = {};
    settingsRows.forEach((r) => (settings[r.key] = r.value));

    // Team stats
    const totalTeams = await db.get('SELECT COUNT(*) as count FROM teams');
    const eligibleTeams = await db.get('SELECT COUNT(*) as count FROM teams WHERE auction_eligible = 1');
    const activeTeams = await db.get("SELECT COUNT(*) as count FROM teams WHERE status = 'ACTIVE'");
    const suspendedTeams = await db.get("SELECT COUNT(*) as count FROM teams WHERE status = 'SUSPENDED'");
    const disqualifiedTeams = await db.get("SELECT COUNT(*) as count FROM teams WHERE status = 'DISQUALIFIED'");

    const submittedTeams = await db.get('SELECT COUNT(DISTINCT team_id) as count FROM submissions');
    const flaggedTeams = await db.get(`
      SELECT COUNT(DISTINCT team_id) as count FROM violations WHERE status = 'OPEN' AND severity IN ('HIGH', 'CRITICAL')
    `);

    const openViolations = await db.get("SELECT COUNT(*) as count FROM violations WHERE status = 'OPEN'");

    const latestEvents = await db.all(`
      SELECT v.*, t.code as team_code, t.name as team_name
      FROM violations v
      JOIN teams t ON v.team_id = t.id
      ORDER BY v.id DESC LIMIT 10
    `);

    const activeSessions = await db.all(`
      SELECT s.*, t.code as team_code, t.name as team_name, t.status as team_status
      FROM team_event_sessions s
      JOIN teams t ON s.team_id = t.id
      WHERE s.status = 'ACTIVE'
    `);

    return {
      event_status: settings.event_status || 'SETUP',
      event_started_at: settings.event_started_at || null,
      challenge_started_at: settings.challenge_started_at || null,
      challenge_deadline: settings.challenge_deadline || null,
      leaderboard_visible: settings.leaderboard_visible === 'true',
      registered_teams: totalTeams.count,
      eligible_teams: eligibleTeams.count,
      active_teams: activeTeams.count,
      suspended_teams: suspendedTeams.count,
      disqualified_teams: disqualifiedTeams.count,
      submitted_teams: submittedTeams.count,
      flagged_teams: flaggedTeams.count,
      open_violations: openViolations.count,
      latest_events: latestEvents,
      active_sessions: activeSessions,
    };
  }
}
