import { eventRepository } from '../db/repositories/event.repository.js';
import { teamRepository } from '../db/repositories/team.repository.js';
import { violationRepository } from '../db/repositories/violation.repository.js';
import { auditRepository } from '../db/repositories/audit.repository.js';
import { submissionRepository } from '../db/repositories/submission.repository.js';

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
    const now = new Date().toISOString();
    const { visibilityState = 'visible', fullscreenEnabled = false, clientMetadata = {} } = payload;

    // 1. Check existing active sessions for this team
    const activeSessions = await eventRepository.getActiveEventSessions();
    const teamActiveSessions = activeSessions.filter((s) => s.team_id === teamId);
    let currentSession = teamActiveSessions.find((s) => s.session_id === sessionId);

    // If second active session detected from different session_id, log MULTIPLE_SESSION violation
    if (teamActiveSessions.length > 0 && !currentSession) {
      const lastMult = await violationRepository.getLastSameType(teamId, 'MULTIPLE_SESSION');
      if (!lastMult || (new Date(now) - new Date(lastMult.created_at || lastMult.server_timestamp)) / 1000 > 30) {
        await this.recordViolation({
          teamId,
          type: 'MULTIPLE_SESSION',
          severity: 'HIGH',
          description: `Multiple active sessions detected for team. Current session: ${sessionId}`,
          metadata: JSON.stringify({ existing_sessions: teamActiveSessions.map((s) => s.session_id), new_session: sessionId }),
        });
      }
    }

    currentSession = await eventRepository.upsertSession({
      teamId,
      sessionId,
      visibilityState,
      fullscreenEnabled,
      clientMetadata,
    });

    // Get current event status
    const eventStatus = await eventRepository.getSettingByKey('event_status') || 'SETUP';
    const challengeDeadline = await eventRepository.getSettingByKey('challenge_deadline') || null;
    const team = await teamRepository.findById(teamId);

    return {
      success: true,
      event_status: eventStatus,
      challenge_deadline: challengeDeadline,
      team_status: team ? team.status : 'ACTIVE',
      session_id: sessionId,
      last_heartbeat: now,
    };
  }

  /**
   * Record a violation with privacy sanitization and rate-limiting
   */
  static async recordViolation({ teamId, type, severity, description, metadata, clientTimestamp }) {
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
    const lastSameType = await violationRepository.getLastSameType(teamId, type);

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

    const row = await violationRepository.recordViolation({
      teamId,
      type,
      severity,
      description: cleanDescription,
      metadata: cleanMetadata,
      clientTimestamp,
    });

    return {
      id: row.id,
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
    return await violationRepository.getViolations({ team_id, track, severity, type, status, limit, offset });
  }

  /**
   * Admin action: update violation status (REVIEWED, DISMISSED, ACTION_TAKEN)
   */
  static async updateViolationStatus(adminUser, violationId, newStatus, reason = '') {
    const violation = await violationRepository.findById(violationId);
    if (!violation) {
      throw new Error('Violation not found');
    }

    await violationRepository.updateStatus(violationId, newStatus);

    const actionType = newStatus === 'DISMISSED' ? 'VIOLATION_DISMISSED' : 'VIOLATION_REVIEWED';
    await auditRepository.recordAdminAction(
      adminUser || 'admin',
      violation.team_id,
      actionType,
      reason || `Violation #${violationId} set to ${newStatus}`
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

    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    await teamRepository.updateTeam(teamId, { status: newStatus });

    let actionName = `TEAM_${newStatus}`;
    if (newStatus === 'ACTIVE') actionName = 'TEAM_REINSTATED';

    await auditRepository.recordAdminAction(adminUser || 'admin', teamId, actionName, reason.trim());

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

    const now = new Date().toISOString();

    await eventRepository.setSetting('event_status', newEventStatus);

    if (newEventStatus === 'LIVE') {
      await eventRepository.setSetting('event_started_at', now);
      await eventRepository.setSetting('challenge_started_at', now);
    }

    if (deadline) {
      await eventRepository.setSetting('challenge_deadline', deadline);
    }

    const actionName = `EVENT_${newEventStatus}`;
    await auditRepository.recordAdminAction(
      adminUser || 'admin',
      null,
      actionName,
      reason || `Event status changed to ${newEventStatus}`
    );

    return { success: true, event_status: newEventStatus, updated_at: now };
  }

  /**
   * Organizer Dashboard / Monitoring Summary
   */
  static async getEventSummary() {
    const settings = await eventRepository.getSettings();

    const totalTeamsCount = await teamRepository.count();

    const allTeams = await teamRepository.findAll();
    const eligibleTeams = allTeams.filter((t) => t.auction_eligible === 1).length;
    const activeTeams = allTeams.filter((t) => t.status === 'ACTIVE').length;
    const suspendedTeams = allTeams.filter((t) => t.status === 'SUSPENDED').length;
    const disqualifiedTeams = allTeams.filter((t) => t.status === 'DISQUALIFIED').length;
    const fullStackTeams = allTeams.filter((t) => (t.challenge || t.track || '').toLowerCase().includes('full')).length;
    const cybersecurityTeams = allTeams.filter((t) => (t.challenge || t.track || '').toLowerCase().includes('cyber')).length;

    const submittedTeamsCount = await submissionRepository.countDistinctSubmittedTeams();

    const openViolationsList = await violationRepository.getViolations({ status: 'OPEN', limit: 1000 });
    const flaggedTeamIds = new Set(
      openViolationsList.filter((v) => ['HIGH', 'CRITICAL'].includes(v.severity)).map((v) => v.team_id)
    );

    const latestEvents = await violationRepository.getViolations({ limit: 10 });
    const activeSessions = await eventRepository.getActiveEventSessions();

    return {
      event_status: settings.event_status || 'SETUP',
      event_started_at: settings.event_started_at || null,
      challenge_started_at: settings.challenge_started_at || null,
      challenge_deadline: settings.challenge_deadline || null,
      leaderboard_visible: settings.leaderboard_visible === 'true',
      registered_teams: totalTeamsCount,
      total_teams: totalTeamsCount,
      eligible_teams: eligibleTeams,
      active_teams: activeTeams,
      suspended_teams: suspendedTeams,
      disqualified_teams: disqualifiedTeams,
      full_stack_teams: fullStackTeams,
      cybersecurity_teams: cybersecurityTeams,
      submitted_teams: submittedTeamsCount,
      submissions_count: submittedTeamsCount,
      flagged_teams: flaggedTeamIds.size,
      open_violations: openViolationsList.length,
      violations_count: openViolationsList.length,
      latest_events: latestEvents,
      active_sessions: activeSessions,
    };
  }
}
