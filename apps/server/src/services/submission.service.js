import { getClient, query } from '../db/postgres.js';
import { eventRepository } from '../db/repositories/event.repository.js';
import { submissionRepository } from '../db/repositories/submission.repository.js';
import { scoreRepository } from '../db/repositories/score.repository.js';
import { auditRepository } from '../db/repositories/audit.repository.js';
import { getWorkspaceFiles } from './workspace.service.js';

export async function getEventSettings() {
  return await eventRepository.getSettings();
}

export async function updateEventSetting(key, value) {
  await eventRepository.setSetting(key, value);
  return await getEventSettings();
}

export async function getSubmissionForTeam(teamId, track) {
  const submission = await submissionRepository.findLatestByTeamAndTrack(teamId, track);

  if (!submission) {
    return null;
  }

  const score = await scoreRepository.findBySubmissionId(submission.id);

  let workspaceFiles = null;
  if (submission.submission_type === 'WORKSPACE' || submission.status === 'FINAL') {
    const snapRes = await query(
      'SELECT file_path, content, created_at FROM workspace_submission_snapshots WHERE submission_id = $1 ORDER BY file_path ASC',
      [submission.id]
    );
    if (snapRes.rows.length > 0) {
      workspaceFiles = snapRes.rows;
    }
  }

  return {
    ...submission,
    score: score || null,
    workspaceFiles,
    isLocked: submission.status === 'FINAL',
  };
}

export async function createOrUpdateSubmission({ team, submissionType = 'FILE', submissionReference, isFinal = false }) {
  if (!team || !team.id) {
    const err = new Error('Authenticated team session required.');
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const track = team.challenge;
  if (!track || !['full-stack', 'cybersecurity'].includes(track)) {
    const err = new Error('Valid challenge track selection required before submission.');
    err.statusCode = 400;
    err.code = 'INVALID_TRACK';
    throw err;
  }

  // Deadline enforcement
  const settings = await getEventSettings();
  if (settings.challenge_deadline) {
    const deadline = new Date(settings.challenge_deadline);
    const now = new Date();
    if (now > deadline) {
      const err = new Error('The challenge submission deadline has passed.');
      err.statusCode = 400;
      err.code = 'SUBMISSION_DEADLINE_PASSED';
      throw err;
    }
  }

  // Pre-fetch workspace state before transaction if final submission
  let workspaceSnapshot = null;
  if (isFinal || submissionType === 'WORKSPACE') {
    workspaceSnapshot = await getWorkspaceFiles(team.id, track);
  }

  // Atomic PostgreSQL transaction with row locking
  const client = await getClient();
  let submissionId;
  let version = 1;
  const now = new Date().toISOString();
  const status = isFinal ? 'FINAL' : 'SUBMITTED';
  const finalRef = submissionReference || (submissionType === 'WORKSPACE' ? 'In-Portal Debug Workspace Solution' : 'Submission package recorded');

  try {
    await client.query('BEGIN');

    // Lock existing submission for update inside transaction
    const existingRes = await client.query(
      `SELECT * FROM submissions WHERE team_id = $1 AND track = $2 ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [team.id, track]
    );
    const existing = existingRes.rows[0];

    if (existing && existing.status === 'FINAL') {
      const err = new Error('Final submission has already been recorded and cannot be changed unless reopened by an organizer.');
      err.statusCode = 403;
      err.code = 'SUBMISSION_LOCKED';
      throw err;
    }

    if (existing) {
      version = (existing.submission_version || 1) + 1;
      const updateRes = await client.query(
        `UPDATE submissions SET submission_type = $1, submission_reference = $2, submitted_at = $3, status = $4, submission_version = $5, updated_at = $3 WHERE id = $6 RETURNING id`,
        [submissionType, finalRef, now, status, version, existing.id]
      );
      submissionId = updateRes.rows[0].id;
    } else {
      const insertRes = await client.query(
        `INSERT INTO submissions (team_id, track, submission_version, submission_type, submission_reference, submitted_at, status, created_at, updated_at)
         VALUES ($1, $2, 1, $3, $4, $5, $6, $5, $5)
         RETURNING id`,
        [team.id, track, submissionType, finalRef, now, status]
      );
      submissionId = insertRes.rows[0].id;
    }

    // Capture workspace file snapshot if final workspace submission
    if (workspaceSnapshot && workspaceSnapshot.files) {
      await client.query('DELETE FROM workspace_submission_snapshots WHERE submission_id = $1', [submissionId]);
      for (const f of workspaceSnapshot.files) {
        await client.query(
          `INSERT INTO workspace_submission_snapshots (submission_id, team_id, track, file_path, content, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [submissionId, team.id, track, f.path, f.content || '']
        );
      }
    }

    // Log evaluation audit event inside transaction
    await client.query(
      `INSERT INTO evaluation_events (submission_id, action, actor, notes, created_at) VALUES ($1, $2, $3, $4, NOW())`,
      [
        submissionId,
        isFinal ? 'SUBMISSION_FINALIZED' : 'SUBMISSION_UPDATED',
        `TEAM:${team.code}`,
        `Submission v${version} recorded by team ${team.name}`,
      ]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return await getSubmissionForTeam(team.id, track);
}

export async function getAdminSubmissions({ track = '', status = '', search = '' }) {
  return await submissionRepository.findAdminSubmissions({ track, status, search });
}

export async function getAdminSubmissionById(submissionId) {
  const submission = await submissionRepository.findById(submissionId);

  if (!submission) {
    const err = new Error('Submission not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const score = await scoreRepository.findBySubmissionId(submissionId);
  const events = await auditRepository.getEvaluationEventsForSubmission(submissionId);
  const snapRes = await query(
    'SELECT file_path, content, created_at FROM workspace_submission_snapshots WHERE submission_id = $1 ORDER BY file_path ASC',
    [submissionId]
  );

  return {
    ...submission,
    score: score || null,
    events,
    workspaceFiles: snapRes.rows || [],
  };
}

export async function evaluateSubmission({
  adminUser = 'admin',
  submissionId,
  status = 'EVALUATED',
  bugPoints = 0,
  functionalPoints = 0,
  technicalPoints = 0,
  fixPoints = 0,
  reportPoints = 0,
  presentationPoints = 0,
  judgeNotes = '',
}) {
  const sub = await submissionRepository.findById(submissionId);

  if (!sub) {
    const err = new Error('Submission not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Rubric Maximum Validation
  const track = sub.track;
  const pBug = Number(bugPoints) || 0;
  const pFunc = Number(functionalPoints) || 0;
  const pTech = Number(technicalPoints) || 0;
  const pFix = Number(fixPoints) || 0;
  const pRep = Number(reportPoints) || 0;
  const pPres = Number(presentationPoints) || 0;

  if (pBug < 0 || pFunc < 0 || pTech < 0 || pFix < 0 || pRep < 0 || pPres < 0) {
    const err = new Error('Score points cannot be negative.');
    err.statusCode = 400;
    err.code = 'INVALID_SCORE_RANGE';
    throw err;
  }

  if (track === 'full-stack') {
    if (pBug > 60 || pFunc > 15 || pTech > 10 || pRep > 10 || pPres > 5) {
      const err = new Error('Full-Stack score components exceed maximum allowed bounds (Bug Fixes <= 60, Functional <= 15, Code Quality <= 10, Technical <= 10, Presentation <= 5).');
      err.statusCode = 400;
      err.code = 'SCORE_BOUNDS_EXCEEDED';
      throw err;
    }
  } else if (track === 'cybersecurity') {
    if (pBug > 30 || pFunc > 20 || pTech > 15 || pFix > 20 || pRep > 20 || pPres > 15 || (pBug + pFunc + pTech + pFix + pRep + pPres > 100)) {
      const err = new Error('Cybersecurity score components exceed maximum allowed bounds (Vulnerability ID <= 30, Analysis <= 20, Impact <= 15, Fix <= 20, Report <= 20, Presentation <= 15, Total <= 100).');
      err.statusCode = 400;
      err.code = 'SCORE_BOUNDS_EXCEEDED';
      throw err;
    }
  }

  // Server-Side Total Score Calculation
  const totalScore = pBug + pFunc + pTech + pFix + pRep + pPres;
  const now = new Date().toISOString();

  // Upsert Score
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const existingScoreRes = await client.query('SELECT id FROM scores WHERE submission_id = $1', [submissionId]);
    if (existingScoreRes.rows.length > 0) {
      await client.query(
        `UPDATE scores SET bug_points = $1, functional_points = $2, technical_points = $3, fix_points = $4, report_points = $5, presentation_points = $6, total_score = $7, judge_notes = $8, evaluated_by = $9, evaluated_at = $10 WHERE submission_id = $11`,
        [pBug, pFunc, pTech, pFix, pRep, pPres, totalScore, judgeNotes, adminUser, now, submissionId]
      );
    } else {
      await client.query(
        `INSERT INTO scores (submission_id, team_id, track, bug_points, functional_points, technical_points, fix_points, report_points, presentation_points, total_score, judge_notes, evaluated_by, evaluated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [submissionId, sub.team_id, track, pBug, pFunc, pTech, pFix, pRep, pPres, totalScore, judgeNotes, adminUser, now]
      );
    }

    // Update Submission Status
    const nextStatus = ['UNDER_REVIEW', 'EVALUATED', 'FINAL'].includes(status) ? status : 'EVALUATED';
    await client.query(`UPDATE submissions SET status = $1, updated_at = $2 WHERE id = $3`, [nextStatus, now, submissionId]);

    // Record Audit Event
    const actionLabel = nextStatus === 'FINAL' ? 'SCORE_FINALIZED' : 'SCORE_DRAFT_SAVED';
    await client.query(
      `INSERT INTO evaluation_events (submission_id, action, actor, notes, created_at) VALUES ($1, $2, $3, $4, NOW())`,
      [submissionId, actionLabel, adminUser, `Total score: ${totalScore}/100. Status: ${nextStatus}. Notes: ${judgeNotes.substring(0, 100)}`]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return await getAdminSubmissionById(submissionId);
}

export async function reopenSubmission({ adminUser = 'admin', submissionId, notes = '' }) {
  const sub = await submissionRepository.findById(submissionId);

  if (!sub) {
    const err = new Error('Submission not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const now = new Date().toISOString();
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE submissions SET status = 'SUBMITTED', updated_at = $1 WHERE id = $2`, [now, submissionId]);
    await client.query(
      `INSERT INTO evaluation_events (submission_id, action, actor, notes, created_at) VALUES ($1, $2, $3, $4, NOW())`,
      [submissionId, 'SUBMISSION_REOPENED', adminUser, notes || 'Organizer reopened submission for revisions.']
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return await getAdminSubmissionById(submissionId);
}

export async function getPublicLeaderboard() {
  const settings = await getEventSettings();
  const isVisible = settings.leaderboard_visible === 'true';

  if (!isVisible) {
    return {
      visible: false,
      entries: [],
    };
  }

  const rows = await scoreRepository.getPublicLeaderboard();
  const entries = rows.map((r, index) => ({
    rank: index + 1,
    teamName: r.team_name,
    teamCode: r.team_code,
    track: r.track.toUpperCase(),
    score: r.total_score,
  }));

  return {
    visible: true,
    entries,
  };
}

export async function getAdminLeaderboard() {
  const settings = await getEventSettings();
  const rows = await scoreRepository.getAdminLeaderboard();

  return {
    settings,
    entries: rows,
  };
}
