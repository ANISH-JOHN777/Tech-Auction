import { getDb } from '../db/database.js';

/**
 * Reusable event status & team state guard middleware.
 * Options:
 * - requireLive: true (default) - enforces event_status === 'LIVE'
 * - requireActiveTeam: true (default) - enforces req.team.status === 'ACTIVE'
 * - allowStates: Array of allowed event_status values (e.g. ['LIVE', 'PAUSED'] if needed)
 */
export function eventGuard(options = {}) {
  const { requireLive = true, requireActiveTeam = true, allowStates = null } = options;

  return async (req, res, next) => {
    try {
      const db = getDb();

      // 1. Verify Team Status if team is authenticated
      if (requireActiveTeam && req.team) {
        // Refresh team status from DB to ensure instant enforcement
        const currentTeam = await db.get('SELECT status FROM teams WHERE id = ?', [req.team.id]);
        const teamStatus = currentTeam ? currentTeam.status : req.team.status;

        if (teamStatus === 'SUSPENDED') {
          return res.status(403).json({
            success: false,
            error: {
              code: 'TEAM_SUSPENDED',
              message: 'Your team has been suspended by the organizer.',
            },
          });
        }

        if (teamStatus === 'DISQUALIFIED') {
          return res.status(403).json({
            success: false,
            error: {
              code: 'TEAM_DISQUALIFIED',
              message: 'Your team has been disqualified from the competition.',
            },
          });
        }
      }

      // 2. Verify Event Status
      const statusSetting = await db.get("SELECT value FROM event_settings WHERE key = 'event_status'");
      const eventStatus = statusSetting ? statusSetting.value : 'SETUP';

      // Check allowed states if specified
      if (allowStates && Array.isArray(allowStates)) {
        if (!allowStates.includes(eventStatus)) {
          return res.status(403).json({
            success: false,
            error: {
              code: `EVENT_${eventStatus}`,
              message: `Action not allowed while event is in ${eventStatus} status.`,
              event_status: eventStatus,
            },
          });
        }
        return next();
      }

      // Default Live check
      if (requireLive && eventStatus !== 'LIVE') {
        let code = `EVENT_${eventStatus}`;
        let message = `Action not allowed while event is in ${eventStatus} status.`;

        if (eventStatus === 'SETUP') {
          message = 'Event is in setup mode. Challenge activity has not started.';
        } else if (eventStatus === 'READY') {
          message = 'Event is in ready mode. Please wait for the organizer to start the event.';
        } else if (eventStatus === 'PAUSED') {
          message = 'Event is currently paused by the organizer.';
        } else if (eventStatus === 'ENDED') {
          message = 'Event has ended. No further activity is allowed.';
        }

        return res.status(403).json({
          success: false,
          error: {
            code,
            message,
            event_status: eventStatus,
          },
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
