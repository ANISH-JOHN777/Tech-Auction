import crypto from 'crypto';
import { teamRepository } from '../db/repositories/team.repository.js';
import { sessionRepository } from '../db/repositories/session.repository.js';

export async function login(req, res, next) {
  try {
    const { teamCode, pin } = req.body;
    if (!teamCode || typeof teamCode !== 'string' || !teamCode.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TEAM_CODE',
          message: 'Please provide a valid team code.',
        },
      });
    }

    const team = await teamRepository.findByCode(teamCode);

    if (!team) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid team code or PIN.',
        },
      });
    }

    if (!team.login_enabled) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'LOGIN_DISABLED',
          message: 'Team login has been disabled by the event organizer.',
        },
      });
    }

    // Verify PIN if provided / required
    if (pin !== undefined && team.pin && team.pin !== pin.toString().trim()) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid team code or PIN.',
        },
      });
    }

    const members = await teamRepository.getMembers(team.id);
    team.members = members;

    // Generate student session token
    const token = 'student_session_' + crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await sessionRepository.createSession({
      token,
      teamCode: team.code,
      userType: 'student',
      expiresAt,
    });

    delete team.pin;

    res.json({
      success: true,
      data: {
        token,
        team,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const team = { ...req.team };
    delete team.pin;
    res.json({
      success: true,
      data: {
        team,
        token: req.token,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    if (req.token) {
      await sessionRepository.deleteByToken(req.token);
    }
    res.json({
      success: true,
      data: { message: 'Logged out successfully.' },
    });
  } catch (err) {
    next(err);
  }
}

export async function selectChallenge(req, res, next) {
  try {
    const { challenge } = req.body;
    if (!['full-stack', 'cybersecurity'].includes(challenge)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CHALLENGE',
          message: 'Invalid challenge selected. Must be full-stack or cybersecurity.',
        },
      });
    }

    const team = req.team;
    if (team.challenge && team.challenge !== challenge) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CHALLENGE_LOCKED',
          message: 'Your team challenge has already been locked and cannot be changed.',
        },
      });
    }

    const updatedTeam = await teamRepository.updateChallenge(team.code, challenge);
    delete updatedTeam.pin;

    res.json({
      success: true,
      data: {
        team: updatedTeam,
      },
    });
  } catch (err) {
    next(err);
  }
}
