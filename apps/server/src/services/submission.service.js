import { getDb } from '../db/database.js';

export async function getEventSettings() {
  const db = getDb();
  const rows = await db.all('SELECT * FROM event_settings');
  const settings = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return settings;
}

export async function updateEventSetting(key, value) {
  const db = getDb();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO event_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, String(value), now]
  );
  return await getEventSettings();
}

export async function getSubmissionForTeam(teamId, track) {
  const db = getDb();
  const submission = await db.get(
    `SELECT * FROM submissions WHERE team_id = ? AND track = ? ORDER BY id DESC LIMIT 1`,
    [teamId, track]
  );

  if (!submission) {
    return null;
  }

  const score = await db.get(`SELECT * FROM scores WHERE submission_id = ?`, [submission.id]);
  return {
    ...submission,
    score: score || null,
  };
}

export async function createOrUpdateSubmission({ team, submissionType = 'FILE', submissionReference, isFinal = false }) {
  const db = getDb();

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

  // Atomic SQLite transaction to prevent submission race conditions
  await db.exec('BEGIN IMMEDIATE');
  let submissionId;
  let version = 1;
  const now = new Date().toISOString();
  const status = isFinal ? 'FINAL' : 'SUBMITTED';

  try {
    // Check existing submission inside transaction
    const existing = await db.get(
      `SELECT * FROM submissions WHERE team_id = ? AND track = ? ORDER BY id DESC LIMIT 1`,
      [team.id, track]
    );

    if (existing && existing.status === 'FINAL') {
      const err = new Error('Final submission has already been recorded and cannot be changed unless reopened by an organizer.');
      err.statusCode = 403;
      err.code = 'SUBMISSION_LOCKED';
      throw err;
    }

    if (existing) {
      version = (existing.submission_version || 1) + 1;
      await db.run(
        `UPDATE submissions SET submission_type = ?, submission_reference = ?, submitted_at = ?, status = ?, submission_version = ?, updated_at = ? WHERE id = ?`,
        [submissionType, submissionReference || 'Submission package recorded', now, status, version, now, existing.id]
      );
      submissionId = existing.id;
    } else {
      const result = await db.run(
        `INSERT INTO submissions (team_id, track, submission_version, submission_type, submission_reference, submitted_at, status, created_at, updated_at)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)`,
        [team.id, track, submissionType, submissionReference || 'Submission package recorded', now, status, now, now]
      );
      submissionId = result.lastID;
    }

    // Log evaluation audit event
    await db.run(
      `INSERT INTO evaluation_events (submission_id, action, actor, notes, created_at) VALUES (?, ?, ?, ?, ?)`,
      [
        submissionId,
        isFinal ? 'SUBMISSION_FINALIZED' : 'SUBMISSION_UPDATED',
        `TEAM:${team.code}`,
        `Submission v${version} recorded by team ${team.name}`,
        now,
      ]
    );

    await db.exec('COMMIT');
  } catch (err) {
    try { await db.exec('ROLLBACK'); } catch (e) {}
    throw err;
  }

  return await getSubmissionForTeam(team.id, track);
}

export async function getAdminSubmissions({ track = '', status = '', search = '' }) {
  const db = getDb();
  let query = `
    SELECT s.*, t.name as team_name, t.code as team_code, t.college as team_college,
           sc.total_score, sc.evaluated_by, sc.evaluated_at
    FROM submissions s
    JOIN teams t ON s.team_id = t.id
    LEFT JOIN scores sc ON s.id = sc.submission_id
    WHERE 1=1
  `;
  const params = [];

  if (track) {
    query += ` AND s.track = ?`;
    params.push(track);
  }

  if (status) {
    query += ` AND s.status = ?`;
    params.push(status);
  }

  if (search) {
    query += ` AND (LOWER(t.name) LIKE ? OR LOWER(t.code) LIKE ?)`;
    params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
  }

  query += ` ORDER BY s.submitted_at DESC`;
  return await db.all(query, params);
}

export async function getAdminSubmissionById(submissionId) {
  const db = getDb();
  const submission = await db.get(
    `SELECT s.*, t.name as team_name, t.code as team_code, t.college as team_college, t.department as team_department
     FROM submissions s
     JOIN teams t ON s.team_id = t.id
     WHERE s.id = ?`,
    [submissionId]
  );

  if (!submission) {
    const err = new Error('Submission not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const score = await db.get(`SELECT * FROM scores WHERE submission_id = ?`, [submissionId]);
  const events = await db.all(
    `SELECT * FROM evaluation_events WHERE submission_id = ? ORDER BY id DESC`,
    [submissionId]
  );

  return {
    ...submission,
    score: score || null,
    events,
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
  const db = getDb();
  const sub = await db.get(`SELECT * FROM submissions WHERE id = ?`, [submissionId]);

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
  const existingScore = await db.get(`SELECT id FROM scores WHERE submission_id = ?`, [submissionId]);
  if (existingScore) {
    await db.run(
      `UPDATE scores SET bug_points = ?, functional_points = ?, technical_points = ?, fix_points = ?, report_points = ?, presentation_points = ?, total_score = ?, judge_notes = ?, evaluated_by = ?, evaluated_at = ? WHERE submission_id = ?`,
      [pBug, pFunc, pTech, pFix, pRep, pPres, totalScore, judgeNotes, adminUser, now, submissionId]
    );
  } else {
    await db.run(
      `INSERT INTO scores (submission_id, team_id, track, bug_points, functional_points, technical_points, fix_points, report_points, presentation_points, total_score, judge_notes, evaluated_by, evaluated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [submissionId, sub.team_id, track, pBug, pFunc, pTech, pFix, pRep, pPres, totalScore, judgeNotes, adminUser, now]
    );
  }

  // Update Submission Status
  const nextStatus = ['UNDER_REVIEW', 'EVALUATED', 'FINAL'].includes(status) ? status : 'EVALUATED';
  await db.run(`UPDATE submissions SET status = ?, updated_at = ? WHERE id = ?`, [nextStatus, now, submissionId]);

  // Record Audit Event
  const actionLabel = nextStatus === 'FINAL' ? 'SCORE_FINALIZED' : 'SCORE_DRAFT_SAVED';
  await db.run(
    `INSERT INTO evaluation_events (submission_id, action, actor, notes, created_at) VALUES (?, ?, ?, ?, ?)`,
    [submissionId, actionLabel, adminUser, `Total score: ${totalScore}/100. Status: ${nextStatus}. Notes: ${judgeNotes.substring(0, 100)}`, now]
  );

  return await getAdminSubmissionById(submissionId);
}

export async function reopenSubmission({ adminUser = 'admin', submissionId, notes = '' }) {
  const db = getDb();
  const sub = await db.get(`SELECT * FROM submissions WHERE id = ?`, [submissionId]);

  if (!sub) {
    const err = new Error('Submission not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const now = new Date().toISOString();
  await db.run(`UPDATE submissions SET status = 'SUBMITTED', updated_at = ? WHERE id = ?`, [now, submissionId]);

  await db.run(
    `INSERT INTO evaluation_events (submission_id, action, actor, notes, created_at) VALUES (?, ?, ?, ?, ?)`,
    [submissionId, 'SUBMISSION_REOPENED', adminUser, notes || 'Organizer reopened submission for revisions.', now]
  );

  return await getAdminSubmissionById(submissionId);
}

export async function getPublicLeaderboard() {
  const db = getDb();
  const settings = await getEventSettings();
  const isVisible = settings.leaderboard_visible === 'true';

  if (!isVisible) {
    return {
      visible: false,
      entries: [],
    };
  }

  // Leaderboard ranking rule: total_score DESC, submitted_at ASC (earlier final submission timestamp tie-breaker)
  const rows = await db.all(`
    SELECT sc.total_score, sc.track, s.submitted_at, t.name as team_name, t.code as team_code
    FROM scores sc
    JOIN submissions s ON sc.submission_id = s.id
    JOIN teams t ON sc.team_id = t.id
    WHERE s.status = 'FINAL'
    ORDER BY sc.total_score DESC, s.submitted_at ASC
  `);

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
  const db = getDb();
  const settings = await getEventSettings();

  const rows = await db.all(`
    SELECT sc.*, s.submitted_at, s.status as submission_status, t.name as team_name, t.code as team_code
    FROM scores sc
    JOIN submissions s ON sc.submission_id = s.id
    JOIN teams t ON sc.team_id = t.id
    ORDER BY sc.total_score DESC, s.submitted_at ASC
  `);

  return {
    settings,
    entries: rows,
  };
}
