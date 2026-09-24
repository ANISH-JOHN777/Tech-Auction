import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { initDb } from '../db/database.js';
import { sessionRepository } from '../db/repositories/session.repository.js';
import { saveWorkspaceFile } from '../services/workspace.service.js';
import { EventService } from '../services/event.service.js';
import { evaluateSubmission, getPublicLeaderboard, updateEventSetting, getAdminSubmissionById } from '../services/submission.service.js';
import { createApp } from '../app.js';
import { query } from '../db/postgres.js';

describe('PHASE 14 — FINAL END-TO-END DEBUG WORKSPACE VERIFICATION SUITE', () => {
  let db;
  let server;
  let baseUrl;

  const TEAM_E2E_FS1 = { id: 501, code: 'E2E_FS1', name: 'E2E FullStack Team 1', challenge: 'full-stack' };
  const TEAM_E2E_FS2 = { id: 502, code: 'E2E_FS2', name: 'E2E FullStack Team 2', challenge: 'full-stack' };
  const TEAM_E2E_CY1 = { id: 503, code: 'E2E_CY1', name: 'E2E Cyber Team 1', challenge: 'cybersecurity' };

  let tokenFS1;
  let tokenFS2;
  let tokenCY1;

  before(async () => {
    db = await initDb();

    // Clean up test workspace files, snapshots, submissions, scores, sessions, and teams
    await db.run('DELETE FROM workspace_submission_snapshots WHERE team_id IN (501, 502, 503)');
    await db.run('DELETE FROM scores WHERE team_id IN (501, 502, 503)');
    await db.run('DELETE FROM evaluation_events WHERE submission_id IN (SELECT id FROM submissions WHERE team_id IN (501, 502, 503))');
    await db.run('DELETE FROM submissions WHERE team_id IN (501, 502, 503)');
    await db.run('DELETE FROM team_workspace_files WHERE team_id IN (501, 502, 503)');
    await db.run("DELETE FROM sessions WHERE team_code IN ('E2E_FS1', 'E2E_FS2', 'E2E_CY1')");
    await db.run('DELETE FROM teams WHERE id IN (501, 502, 503)');

    // Insert test teams
    await db.run(
      `INSERT INTO teams (id, code, name, college, department, challenge, wallet, auction_eligible, login_enabled, pin, status)
       VALUES 
       (501, 'E2E_FS1', 'E2E FullStack Team 1', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234', 'ACTIVE'),
       (502, 'E2E_FS2', 'E2E FullStack Team 2', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234', 'ACTIVE'),
       (503, 'E2E_CY1', 'E2E Cyber Team 1', 'SNS Tech', 'IT', 'cybersecurity', 1000, 1, 1, '1234', 'ACTIVE')`
    );

    // Ensure event is LIVE and deadline is in future
    await EventService.updateEventState('admin', 'LIVE', null, 'Workspace E2E verification test suite initialization');
    const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await updateEventSetting('challenge_deadline', futureDeadline);

    // Create team sessions
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    tokenFS1 = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenFS1,
      teamCode: 'E2E_FS1',
      userType: 'student',
      expiresAt,
    });

    tokenFS2 = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenFS2,
      teamCode: 'E2E_FS2',
      userType: 'student',
      expiresAt,
    });

    tokenCY1 = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenCY1,
      teamCode: 'E2E_CY1',
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

  it('1. TEST 1 — FULL STACK E2E WORKFLOW', async () => {
    // 1-5. GET workspace files and verify tree
    const getRes = await fetch(`${baseUrl}/api/workspace/files`, {
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });
    assert.equal(getRes.status, 200);
    const getJson = await getRes.json();
    assert.equal(getJson.success, true);
    assert.ok(getJson.data.files.some((f) => f.path === 'backend/src/index.js'));

    // 6-8. Edit known challenge file & SAVE DRAFT
    const saveRes = await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFS1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: 'backend/src/index.js',
        content: '// Temporary edit before fix',
      }),
    });
    assert.equal(saveRes.status, 200);

    // 9-10. RUN TESTS returns initial FAIL for un-fixed defects
    const runRes1 = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });
    assert.equal(runRes1.status, 200);
    const runJson1 = await runRes1.json();
    const searchTest1 = runJson1.data.results.find((r) => r.id === 'FS_SEARCH_FILTER');
    assert.equal(searchTest1.status, 'FAIL');

    // 11-14. Correct defect, SAVE DRAFT, RUN TESTS again -> returns PASS
    const fixCode = `
      SELECT * FROM opportunities WHERE title LIKE ? OR company_name LIKE ?;
      const searchPattern = "%" + q + "%";
    `;
    await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFS1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: 'backend/src/index.js',
        content: fixCode,
      }),
    });

    const runRes2 = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });
    const runJson2 = await runRes2.json();
    const searchTest2 = runJson2.data.results.find((r) => r.id === 'FS_SEARCH_FILTER');
    assert.equal(searchTest2.status, 'PASS');

    // 15-18. SUBMIT SOLUTION & confirm final submission
    const subRes = await fetch(`${baseUrl}/api/submission`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFS1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissionType: 'WORKSPACE',
        submissionReference: 'CampusConnect E2E Final Solution',
        isFinal: true,
      }),
    });
    assert.equal(subRes.status, 200);
    const subJson = await subRes.json();
    assert.equal(subJson.data.status, 'FINAL');
    assert.equal(subJson.data.isLocked, true);

    // 19-24. Verify lock rejects subsequent edits, resets, runs, and duplicate submissions
    const lockSave = await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFS1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_path: 'backend/src/index.js', content: 'hacked' }),
    });
    assert.equal(lockSave.status, 403);

    const lockReset = await fetch(`${baseUrl}/api/workspace/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });
    assert.equal(lockReset.status, 403);

    const lockRun = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });
    assert.equal(lockRun.status, 403);

    const lockSub = await fetch(`${baseUrl}/api/submission`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFS1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ submissionType: 'WORKSPACE', isFinal: true }),
    });
    assert.equal(lockSub.status, 403);

    // 25. Admin sees final workspace snapshot
    const adminDetail = await getAdminSubmissionById(subJson.data.id);
    assert.ok(adminDetail.workspaceFiles.length > 0);
    const appSnap = adminDetail.workspaceFiles.find((f) => f.file_path === 'backend/src/index.js');
    assert.equal(appSnap.content, fixCode);
  });

  it('2. TEST 2 — CYBERSECURITY E2E WORKFLOW', async () => {
    // 1-5. GET workspace files for SecureVault
    const getRes = await fetch(`${baseUrl}/api/workspace/files`, {
      headers: { Authorization: `Bearer ${tokenCY1}` },
    });
    assert.equal(getRes.status, 200);
    const getJson = await getRes.json();
    assert.equal(getJson.data.track, 'cybersecurity');

    // 6-10. RUN TESTS returns initial FAIL for security vulnerability
    const runRes1 = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCY1}` },
    });
    const runJson1 = await runRes1.json();
    const passCount1 = runJson1.data.summary.passed;

    // 11-14. Fix password leakage in profile route and re-run -> PASS
    const fixCyberCode = `
      app.get('/api/user/profile', (req, res) => {
        res.json({ id: req.user.id, email: req.user.email });
      });
      app.get('/api/documents/:id', (req, res) => {
        const doc = db.query('SELECT * FROM documents WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
      });
      app.post('/api/auth/logout', (req, res) => {
        db.query('DELETE FROM sessions WHERE token = ?', [req.token]);
      });
    `;
    await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenCY1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: 'backend/src/index.js',
        content: fixCyberCode,
      }),
    });
    await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenCY1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: 'frontend/src/pages/Search.jsx',
        content: 'export function SearchPage({ query }) { return <div>{query}</div>; }',
      }),
    });

    const runRes2 = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCY1}` },
    });
    const runJson2 = await runRes2.json();
    assert.equal(runJson2.data.summary.passed, 4);

    // 15-18. SUBMIT SOLUTION & confirm final submission
    const subRes = await fetch(`${baseUrl}/api/submission`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenCY1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submissionType: 'WORKSPACE',
        submissionReference: 'SecureVault E2E Final Solution',
        isFinal: true,
      }),
    });
    assert.equal(subRes.status, 200);
    const subJson = await subRes.json();
    assert.equal(subJson.data.status, 'FINAL');

    // 19-23. Lock enforcement on Cyber track
    const lockSave = await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenCY1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_path: 'backend/src/index.js', content: 'bypass' }),
    });
    assert.equal(lockSave.status, 403);

    // 24. Admin sees final cyber snapshot
    const adminDetail = await getAdminSubmissionById(subJson.data.id);
    assert.ok(adminDetail.workspaceFiles.length > 0);
  });

  it('3. TEST 3 — CROSS-TEAM ISOLATION', async () => {
    // Team 1 (401) is locked; Team 2 (402) is unlocked and operates independently
    const team2Res = await fetch(`${baseUrl}/api/workspace/files`, {
      headers: { Authorization: `Bearer ${tokenFS2}` },
    });
    assert.equal(team2Res.status, 200);
    const team2Json = await team2Res.json();

    // Verify Team 2 workspace does NOT contain Team 1 custom edits
    const team2Index = team2Json.data.files.find((f) => f.path === 'backend/src/index.js');
    assert.notEqual(team2Index.content, '// Temporary edit before fix');
  });

  it('4. TEST 4 — TRACK ISOLATION', async () => {
    // Full Stack team cannot request Cybersecurity approved file
    const fsAttempt = await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFS2}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: 'frontend/src/pages/ConfigViewer.jsx',
        content: 'unauthorized',
      }),
    });
    assert.equal(fsAttempt.status, 403);
  });

  it('5. TEST 5 — FINAL LOCK ENFORCEMENT', async () => {
    // All post-FINAL operations for Team 401 must fail with 403
    const f1 = await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: 'frontend/src/App.jsx', content: 'x' }),
    });
    assert.equal(f1.status, 403);

    const f2 = await fetch(`${baseUrl}/api/workspace/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });
    assert.equal(f2.status, 403);

    const f3 = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });
    assert.equal(f3.status, 403);

    const f4 = await fetch(`${baseUrl}/api/submission`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFinal: true }),
    });
    assert.equal(f4.status, 403);
  });

  it('6. TEST 6 — SNAPSHOT IMMUTABILITY', async () => {
    const subRes = await query("SELECT id FROM submissions WHERE team_id = 501 AND status = 'FINAL'");
    const subId = subRes.rows[0].id;

    // Mutate live team_workspace_files row directly to simulate database tampering attempt
    await query("UPDATE team_workspace_files SET content = 'TAMPERED' WHERE team_id = 501 AND file_path = 'backend/src/index.js'");

    // Verify snapshot in workspace_submission_snapshots remains unchanged
    const snapRes = await query("SELECT content FROM workspace_submission_snapshots WHERE submission_id = $1 AND file_path = 'backend/src/index.js'", [subId]);
    assert.ok(!snapRes.rows[0].content.includes('TAMPERED'));
  });

  it('7. TEST 7 — DEADLINE ENFORCEMENT', async () => {
    // Set deadline in past
    await updateEventSetting('challenge_deadline', new Date(Date.now() - 3600000).toISOString());

    const res = await fetch(`${baseUrl}/api/submission`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS2}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionType: 'WORKSPACE', isFinal: true }),
    });
    assert.equal(res.status, 400);

    // Restore future deadline
    await updateEventSetting('challenge_deadline', new Date(Date.now() + 86400000).toISOString());
  });

  it('8. TEST 8 — ADMIN EVALUATION WORKFLOW', async () => {
    const subRes = await query("SELECT id FROM submissions WHERE team_id = 501 AND status = 'FINAL'");
    const subId = subRes.rows[0].id;

    const evalResult = await evaluateSubmission({
      adminUser: 'faculty_head',
      submissionId: subId,
      status: 'FINAL',
      bugPoints: 55,
      functionalPoints: 14,
      technicalPoints: 9,
      reportPoints: 9,
      presentationPoints: 5,
      judgeNotes: 'E2E Full Stack workspace verified excellent solution.',
    });

    assert.equal(evalResult.score.total_score, 92);
    assert.equal(evalResult.score.evaluated_by, 'faculty_head');
  });

  it('9. TEST 9 — LEADERBOARD REFLECTION', async () => {
    await updateEventSetting('leaderboard_visible', 'true');
    const leaderboard = await getPublicLeaderboard();

    assert.equal(leaderboard.visible, true);
    const entry = leaderboard.entries.find((e) => e.teamCode === 'E2E_FS1');
    assert.ok(entry);
    assert.equal(entry.score, 92);
  });
});
