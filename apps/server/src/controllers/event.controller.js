import { EventService } from '../services/event.service.js';
import { getDb } from '../db/database.js';

export async function postHeartbeat(req, res, next) {
  try {
    const teamId = req.team.id;
    const sessionId = req.headers['x-event-session-id'] || req.body.session_id || `session_${req.team.code}`;
    const result = await EventService.processHeartbeat(teamId, sessionId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function postViolation(req, res, next) {
  try {
    const teamId = req.team.id;
    const { type, severity, description, metadata, client_timestamp } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_VIOLATION', message: 'Violation type is required' },
      });
    }

    const result = await EventService.recordViolation({
      teamId,
      type,
      severity,
      description,
      metadata,
      clientTimestamp: client_timestamp,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getViolations(req, res, next) {
  try {
    const { team_id, track, severity, type, status, limit, offset } = req.query;
    const result = await EventService.getViolations({
      team_id,
      track,
      severity,
      type,
      status,
      limit,
      offset,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function patchViolationStatus(req, res, next) {
  try {
    const violationId = req.params.id;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status is required' },
      });
    }

    const result = await EventService.updateViolationStatus('admin', violationId, status, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function patchTeamStatus(req, res, next) {
  try {
    const teamId = req.params.id;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Team status is required' },
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'REASON_REQUIRED', message: 'A valid reason is required for administrative team status changes.' },
      });
    }

    const result = await EventService.updateTeamStatus('admin', teamId, status, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function postEventState(req, res, next) {
  try {
    const { status, deadline, reason } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_EVENT_STATE', message: 'Event status is required' },
      });
    }

    const result = await EventService.updateEventState('admin', status, deadline, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getEventSummary(req, res, next) {
  try {
    const summary = await EventService.getEventSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(req, res, next) {
  try {
    const db = getDb();
    const { limit = 100 } = req.query;
    const logs = await db.all(
      `SELECT a.*, t.code as team_code, t.name as team_name
       FROM event_admin_actions a
       LEFT JOIN teams t ON a.team_id = t.id
       ORDER BY a.id DESC LIMIT ?`,
      [Number(limit)]
    );
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
}
