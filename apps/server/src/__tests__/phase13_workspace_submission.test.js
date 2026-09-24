import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { initDb } from '../db/database.js';
import { sessionRepository } from '../db/repositories/session.repository.js';
import { saveWorkspaceFile } from '../services/workspace.service.js';
import { EventService } from '../services/event.service.js';
import { evaluateSubmission, getPublicLeaderboard, updateEventSetting } from '../services/submission.service.js';
import { createApp } from '../app.js';
import { query } from '../db/postgres.js';

describe('PHASE 13 — IN-PORTAL DEBUG WORKSPACE (PHASE 5 SUBMISSION INTEGRATION SUITE)', () => {
  let db;
  let server;
  let baseUrl;

  const TEAM_SUB_FS1 = { id: 401, code: 'W_SUB_FS1', name: 'Sub FS Team 1', challenge: 'full-stack' };
  const TEAM_SUB_FS2 = { id: 402, code: 'W_SUB_FS2', name: 'Sub FS Team 2', challenge: 'full-stack' };
  const TEAM_SUB_CY1 = { id: 403, code: 'W_SUB_CY1', name: 'Sub CY Team 1', challenge: 'cybersecurity' };

  let tokenFS1;
  let tokenFS2;
  let tokenCY1;

  before(async () => {
    db = await initDb();

    // Clean up test workspace files, snapshots, submissions, scores, sessions, and teams
    await db.run('DELETE FROM workspace_submission_snapshots WHERE team_id IN (401, 402, 403)');
    await db.run('DELETE FROM scores WHERE team_id IN (401, 402, 403)');
    await db.run('DELETE FROM evaluation_events WHERE submission_id IN (SELECT id FROM submissions WHERE team_id IN (401, 402, 403))');
    await db.run('DELETE FROM submissions WHERE team_id IN (401, 402, 403)');
    await db.run('DELETE FROM team_workspace_files WHERE team_id IN (401, 402, 403)');
    await db.run("DELETE FROM sessions WHERE team_code IN ('W_SUB_FS1', 'W_SUB_FS2', 'W_SUB_CY1')");
    await db.run('DELETE FROM teams WHERE id IN (401, 402, 403)');

    // Insert test teams
    await db.run(
      `INSERT INTO teams (id, code, name, college, department, challenge, wallet, auction_eligible, login_enabled, pin, status)
       VALUES 
       (401, 'W_SUB_FS1', 'Sub FS Team 1', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234', 'ACTIVE'),
       (402, 'W_SUB_FS2', 'Sub FS Team 2', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234', 'ACTIVE'),
       (403, 'W_SUB_CY1', 'Sub CY Team 1', 'SNS Tech', 'IT', 'cybersecurity', 1000, 1, 1, '1234', 'ACTIVE')`
    );

    // Ensure event is LIVE and deadline is in future
    await EventService.updateEventState('admin', 'LIVE', null, 'Workspace submission test suite initialization');
    const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await updateEventSetting('challenge_deadline', futureDeadline);

    // Create team sessions
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    tokenFS1 = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenFS1,
      teamCode: 'W_SUB_FS1',
      userType: 'student',
      expiresAt,
    });

    tokenFS2 = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenFS2,
      teamCode: 'W_SUB_FS2',
      userType: 'student',
      expiresAt,
    });

    tokenCY1 = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenCY1,
      teamCode: 'W_SUB_CY1',
      userType: 'student',
      expiresAt,
    });

    // Start test server
    const app = createApp();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. Workspace → final submission succeeds via API', async () => {
    // Save draft fix in Team 401 workspace
    await saveWorkspaceFile(401, 'full-stack', 'frontend/src/App.jsx', '// Team 401 final app solution');

    const res = await fetch(`${baseUrl}/api/submission`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFS1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissionType: 'WORKSPACE',
        submissionReference: 'In-Portal Debug Workspace Solution',
        isFinal: true,
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.status, 'FINAL');
    assert.equal(json.data.submission_type, 'WORKSPACE');
    assert.equal(json.data.isLocked, true);
  });

  it('2. Final snapshot creation (Workspace files captured in workspace_submission_snapshots)', async () => {
    const subRes = await query("SELECT id FROM submissions WHERE team_id = 401 AND status = 'FINAL'");
    assert.ok(subRes.rows.length > 0);
    const subId = subRes.rows[0].id;

    const snapRes = await query('SELECT * FROM workspace_submission_snapshots WHERE submission_id = $1', [subId]);
    assert.ok(snapRes.rows.length > 0);

    const appSnap = snapRes.rows.find((r) => r.file_path === 'frontend/src/App.jsx');
    assert.ok(appSnap);
    assert.equal(appSnap.content, '// Team 401 final app solution');
  });

  it('3. Final submission lock is active in student GET submission endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/submission`, {
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.submission.status, 'FINAL');
    assert.equal(json.data.submission.isLocked, true);
  });

  it('4. Save file rejected after FINAL submission (403 WORKSPACE_LOCKED)', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFS1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: 'frontend/src/App.jsx',
        content: '// Attempt post-final edit',
      }),
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'WORKSPACE_LOCKED');
  });

  it('5. Reset workspace rejected after FINAL submission (403 WORKSPACE_LOCKED)', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'WORKSPACE_LOCKED');
  });

  it('6. Run tests rejected after FINAL submission (403 WORKSPACE_LOCKED)', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'WORKSPACE_LOCKED');
  });

  it('7. Duplicate final submission rejected (403 SUBMISSION_LOCKED)', async () => {
    const res = await fetch(`${baseUrl}/api/submission`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFS1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissionType: 'WORKSPACE',
        submissionReference: 'Duplicate final submission attempt',
        isFinal: true,
      }),
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'SUBMISSION_LOCKED');
  });

  it('8. Submission deadline enforcement (Rejects submission when deadline has passed)', async () => {
    // Set deadline in past
    const pastDeadline = new Date(Date.now() - 3600000).toISOString();
    await updateEventSetting('challenge_deadline', pastDeadline);

    const res = await fetch(`${baseUrl}/api/submission`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFS2}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissionType: 'WORKSPACE',
        submissionReference: 'Late submission attempt',
        isFinal: true,
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'SUBMISSION_DEADLINE_PASSED');

    // Restore future deadline for remaining tests
    await updateEventSetting('challenge_deadline', new Date(Date.now() + 86400000).toISOString());
  });

  it('9. Team isolation (Team 1 submission lock does not prevent Team 2 from editing or submitting)', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/files`, {
      headers: { Authorization: `Bearer ${tokenFS2}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);

    // Save file for Team 2 succeeds
    const saveRes = await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFS2}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: 'frontend/src/App.jsx',
        content: '// Team 402 active draft',
      }),
    });
    assert.equal(saveRes.status, 200);
  });

  it('10. Track isolation (Cybersecurity track final submission captures Cybersecurity file snapshots)', async () => {
    const res = await fetch(`${baseUrl}/api/submission`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenCY1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissionType: 'WORKSPACE',
        submissionReference: 'SecureVault Final Solution',
        isFinal: true,
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.status, 'FINAL');
    assert.equal(json.data.track, 'cybersecurity');

    const subId = json.data.id;
    const snapRes = await query('SELECT file_path FROM workspace_submission_snapshots WHERE submission_id = $1', [subId]);
    const paths = snapRes.rows.map((r) => r.file_path);
    assert.ok(paths.includes('frontend/src/pages/ConfigViewer.jsx'));
  });

  it('11. Snapshot immutability (Database snapshots are preserved independently)', async () => {
    const subRes = await query("SELECT id FROM submissions WHERE team_id = 401 AND status = 'FINAL'");
    const subId = subRes.rows[0].id;

    const snapBefore = await query("SELECT content FROM workspace_submission_snapshots WHERE submission_id = $1 AND file_path = 'frontend/src/App.jsx'", [subId]);
    assert.equal(snapBefore.rows[0].content, '// Team 401 final app solution');
  });

  it('12. Existing evaluation compatibility (Faculty can evaluate final workspace submission)', async () => {
    const subRes = await query("SELECT id FROM submissions WHERE team_id = 401 AND status = 'FINAL'");
    const subId = subRes.rows[0].id;

    const evalResult = await evaluateSubmission({
      adminUser: 'faculty_judge_1',
      submissionId: subId,
      status: 'FINAL',
      bugPoints: 50,
      functionalPoints: 12,
      technicalPoints: 8,
      reportPoints: 8,
      presentationPoints: 4,
      judgeNotes: 'Excellent workspace fixes applied.',
    });

    assert.equal(evalResult.score.total_score, 82);
    assert.equal(evalResult.score.evaluated_by, 'faculty_judge_1');
  });

  it('13. Existing leaderboard compatibility (Evaluated workspace submission appears on leaderboard)', async () => {
    await updateEventSetting('leaderboard_visible', 'true');
    const leaderboard = await getPublicLeaderboard();

    assert.equal(leaderboard.visible, true);
    assert.ok(Array.isArray(leaderboard.entries));
    const entry = leaderboard.entries.find((e) => e.teamCode === 'W_SUB_FS1');
    assert.ok(entry);
    assert.equal(entry.score, 82);
  });
});
