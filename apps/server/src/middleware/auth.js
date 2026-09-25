import { sessionRepository } from '../db/repositories/session.repository.js';
import { teamRepository } from '../db/repositories/team.repository.js';
import { studentRepository } from '../db/repositories/student.repository.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.headers['x-session-token'];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in.',
        },
      });
    }

    const session = await sessionRepository.findByToken(token);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SESSION',
          message: 'Session invalid or expired. Please log in again.',
        },
      });
    }

    if (session.user_type !== 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Student session required for this action.',
        },
      });
    }

    let student = null;
    let team = null;

    if (session.student_id) {
      student = await studentRepository.findById(session.student_id);
      if (student && student.team_id) {
        team = await teamRepository.findById(student.team_id);
      }
    }

    if (!team && session.team_code) {
      team = await teamRepository.findByCode(session.team_code);
    }

    if (team) {
      if (!team.login_enabled) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'LOGIN_DISABLED',
            message: 'Login for your team has been disabled by the organizer.',
          },
        });
      }
      team.members = await teamRepository.getMembers(team.id);
    }

    req.session = session;
    req.student = student;
    req.team = team;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAdminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.headers['x-session-token'];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin authentication required.',
        },
      });
    }

    const session = await sessionRepository.findAdminByToken(token);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_ADMIN_SESSION',
          message: 'Admin session invalid or expired.',
        },
      });
    }

    req.adminToken = token;
    next();
  } catch (err) {
    next(err);
  }
}
