import crypto from 'crypto';
import { getClient } from '../db/postgres.js';
import { teamRepository } from '../db/repositories/team.repository.js';
import { sessionRepository } from '../db/repositories/session.repository.js';
import { studentRepository, verifyPin } from '../db/repositories/student.repository.js';

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

export async function studentLogin(req, res, next) {
  try {
    const { studentCode, pin } = req.body;
    if (!studentCode || typeof studentCode !== 'string' || !studentCode.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STUDENT_CODE',
          message: 'Please provide a valid Student ID.',
        },
      });
    }

    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PIN',
          message: 'Please provide a valid PIN.',
        },
      });
    }

    const student = await studentRepository.findByCode(studentCode);
    if (!student) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid Student ID or PIN.',
        },
      });
    }

    const isPinValid = verifyPin(pin, student.pin_hash);
    if (!isPinValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid Student ID or PIN.',
        },
      });
    }

    let team = null;
    if (student.team_id) {
      team = await teamRepository.findById(student.team_id);
      if (team) {
        team.members = await teamRepository.getMembers(team.id);
        delete team.pin;
      }
    }

    const token = 'student_session_' + crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await sessionRepository.createSession({
      token,
      teamCode: team ? team.code : null,
      studentId: student.id,
      userType: 'student',
      expiresAt,
    });

    const safeStudent = {
      id: student.id,
      student_code: student.student_code,
      name: student.name,
      team_id: student.team_id,
    };

    res.json({
      success: true,
      data: {
        token,
        student: safeStudent,
        team,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function joinOrCreateTeam(req, res, next) {
  try {
    const student = req.student;
    if (!student) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Student authentication required for team self-formation.',
        },
      });
    }

    if (student.team_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_IN_TEAM',
          message: 'Student already belongs to a team.',
        },
      });
    }

    const { teamName, track } = req.body;
    if (!teamName || typeof teamName !== 'string' || !teamName.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TEAM_NAME',
          message: 'Please provide a valid team name.',
        },
      });
    }

    const normalizedName = teamName.trim();
    if (normalizedName.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TEAM_NAME_TOO_SHORT',
          message: 'Team name must be at least 2 characters long.',
        },
      });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const existingTeamRes = await client.query(
        'SELECT * FROM teams WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) FOR UPDATE',
        [normalizedName]
      );
      const existingTeam = existingTeamRes.rows[0] || null;

      let targetTeam = null;

      if (existingTeam) {
        const memberCountRes = await client.query(
          'SELECT COUNT(*)::int as count FROM students WHERE team_id = $1 FOR UPDATE',
          [existingTeam.id]
        );
        const currentCount = memberCountRes.rows[0].count;

        if (currentCount >= 4) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: {
              code: 'TEAM_FULL',
              message: 'Team already has maximum 4 members.',
            },
          });
        }

        await client.query(
          'UPDATE students SET team_id = $1, updated_at = NOW() WHERE id = $2',
          [existingTeam.id, student.id]
        );

        await client.query(
          `INSERT INTO team_members (team_id, name, email, role) VALUES ($1, $2, '', 'Member')`,
          [existingTeam.id, student.name || `Student ${student.student_code}`]
        );

        targetTeam = existingTeam;
      } else {
        if (!track || !['full-stack', 'cybersecurity'].includes(track)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_TRACK',
              message: 'Valid track required for new team creation (full-stack or cybersecurity).',
            },
          });
        }

        const teamCode = `T-${student.student_code}`;
        const now = new Date().toISOString();

        const newTeamRes = await client.query(
          `INSERT INTO teams (code, name, pin, college, department, challenge, wallet, auction_eligible, login_enabled, status, created_at, updated_at)
           VALUES ($1, $2, '1234', 'SNS College of Technology', 'Department of IT', $3, 1000, 1, 1, 'ACTIVE', $4, $4)
           RETURNING *`,
          [teamCode, normalizedName, track, now]
        );
        targetTeam = newTeamRes.rows[0];

        await client.query(
          'INSERT INTO wallets (team_id, balance, held_balance, updated_at) VALUES ($1, 1000, 0, $2)',
          [targetTeam.id, now]
        );

        await client.query(
          `INSERT INTO wallet_transactions (team_id, amount, type, description, created_at) VALUES ($1, 1000, 'INITIAL_BALANCE', 'Default starting auction credits (1000)', $2)`,
          [targetTeam.id, now]
        );

        await client.query(
          'UPDATE students SET team_id = $1, updated_at = NOW() WHERE id = $2',
          [targetTeam.id, student.id]
        );

        await client.query(
          `INSERT INTO team_members (team_id, name, email, role) VALUES ($1, $2, '', 'Team Lead')`,
          [targetTeam.id, student.name || `Student ${student.student_code}`]
        );
      }

      if (req.token) {
        await client.query('UPDATE sessions SET team_code = $1 WHERE token = $2', [targetTeam.code, req.token]);
      }

      await client.query('COMMIT');

      const teamMembers = await teamRepository.getMembers(targetTeam.id);
      targetTeam.members = teamMembers;
      delete targetTeam.pin;

      const safeStudent = {
        id: student.id,
        student_code: student.student_code,
        name: student.name,
        team_id: targetTeam.id,
      };

      res.json({
        success: true,
        data: {
          team: targetTeam,
          student: safeStudent,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const team = req.team ? { ...req.team } : null;
    if (team) delete team.pin;
    const student = req.student ? {
      id: req.student.id,
      student_code: req.student.student_code,
      name: req.student.name,
      team_id: req.student.team_id,
    } : null;

    res.json({
      success: true,
      data: {
        student,
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
