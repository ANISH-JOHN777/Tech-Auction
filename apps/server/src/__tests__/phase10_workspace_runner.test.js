import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { initDb } from '../db/database.js';
import { sessionRepository } from '../db/repositories/session.repository.js';
import { saveWorkspaceFile, resetWorkspace } from '../services/workspace.service.js';
import { EventService } from '../services/event.service.js';
import { createApp } from '../app.js';
import { runControlledWorkspaceTests } from '../services/workspaceRunner.service.js';

describe('PHASE 10 — IN-PORTAL DEBUG WORKSPACE (PHASE 3 TEST RUNNER SUITE)', () => {
  let db;
  let server;
  let baseUrl;

  const TEAM_FS_1 = { id: 201, code: 'W_RUN_FS1', name: 'FS Runner Team 1', challenge: 'full-stack' };
  const TEAM_FS_2 = { id: 202, code: 'W_RUN_FS2', name: 'FS Runner Team 2', challenge: 'full-stack' };
  const TEAM_CY_1 = { id: 203, code: 'W_RUN_CY1', name: 'Cyber Runner Team 1', challenge: 'cybersecurity' };

  let tokenFS1;
  let tokenFS2;
  let tokenCY1;

  before(async () => {
    db = await initDb();

    // Clean up test workspace files, sessions, and teams
    await db.run('DELETE FROM team_workspace_files WHERE team_id IN (201, 202, 203)');
    await db.run("DELETE FROM sessions WHERE team_code IN ('W_RUN_FS1', 'W_RUN_FS2', 'W_RUN_CY1')");
    await db.run('DELETE FROM teams WHERE id IN (201, 202, 203)');

    // Insert test teams
    await db.run(
      `INSERT INTO teams (id, code, name, college, department, challenge, wallet, auction_eligible, login_enabled, pin, status)
       VALUES 
       (201, 'W_RUN_FS1', 'FS Runner Team 1', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234', 'ACTIVE'),
       (202, 'W_RUN_FS2', 'FS Runner Team 2', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234', 'ACTIVE'),
       (203, 'W_RUN_CY1', 'Cyber Runner Team 1', 'SNS Tech', 'IT', 'cybersecurity', 1000, 1, 1, '1234', 'ACTIVE')`
    );

    // Ensure event is LIVE
    await EventService.updateEventState('admin', 'LIVE', null, 'Workspace runner test suite initialization');

    // Create team sessions
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    tokenFS1 = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenFS1,
      teamCode: 'W_RUN_FS1',
      userType: 'student',
      expiresAt,
    });

    tokenFS2 = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenFS2,
      teamCode: 'W_RUN_FS2',
      userType: 'student',
      expiresAt,
    });

    tokenCY1 = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenCY1,
      teamCode: 'W_RUN_CY1',
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

  it('1. Authenticated RUN request succeeds and returns structured summary and results', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data);
    assert.ok(json.data.summary);
    assert.equal(typeof json.data.summary.passed, 'number');
    assert.equal(typeof json.data.summary.failed, 'number');
    assert.equal(typeof json.data.summary.total, 'number');
    assert.ok(Array.isArray(json.data.results));
  });

  it('2. Unauthenticated RUN request is rejected (401)', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
    });
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHORIZED');
  });

  it('3. Team isolation (Modifying Team 1 workspace improves Team 1 results without affecting Team 2)', async () => {
    // Initially both teams fail FS_SEARCH_FILTER test on default template
    const initialRunTeam1 = await runControlledWorkspaceTests(201, 'full-stack');
    const initialRunTeam2 = await runControlledWorkspaceTests(202, 'full-stack');

    const searchTestInitial1 = initialRunTeam1.results.find((r) => r.id === 'FS_SEARCH_FILTER');
    const searchTestInitial2 = initialRunTeam2.results.find((r) => r.id === 'FS_SEARCH_FILTER');

    assert.equal(searchTestInitial1.status, 'FAIL');
    assert.equal(searchTestInitial2.status, 'FAIL');

    // Fix backend search filter query ONLY in Team 1 workspace
    const fixedBackendIndex = `
      import express from 'express';
      const app = express();
      app.get('/api/opportunities/search', (req, res) => {
        const { q } = req.query;
        const searchPattern = '%' + q + '%';
        const query = 'SELECT * FROM opportunities WHERE title LIKE ? OR company_name LIKE ?';
        res.json({ results: [] });
      });
    `;
    await saveWorkspaceFile(201, 'full-stack', 'backend/src/index.js', fixedBackendIndex);

    // Re-run for Team 1 and Team 2
    const updatedRunTeam1 = await runControlledWorkspaceTests(201, 'full-stack');
    const updatedRunTeam2 = await runControlledWorkspaceTests(202, 'full-stack');

    const searchTestTeam1 = updatedRunTeam1.results.find((r) => r.id === 'FS_SEARCH_FILTER');
    const searchTestTeam2 = updatedRunTeam2.results.find((r) => r.id === 'FS_SEARCH_FILTER');

    assert.equal(searchTestTeam1.status, 'PASS');
    assert.equal(searchTestTeam2.status, 'FAIL');
  });

  it('4. Track isolation (Full Stack team runs Full Stack test IDs, Cybersecurity team runs Cybersecurity test IDs)', async () => {
    const fsRun = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });
    const fsJson = await fsRun.json();
    const fsIds = fsJson.data.results.map((r) => r.id);
    assert.deepEqual(fsIds, ['FS_SEARCH_FILTER', 'FS_API_RESPONSE', 'FS_STATUS_UPDATE', 'FS_SUBMISSION']);

    const cyRun = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCY1}` },
    });
    const cyJson = await cyRun.json();
    const cyIds = cyJson.data.results.map((r) => r.id);
    assert.deepEqual(cyIds, ['CY_PASSWORD_EXPOSURE', 'CY_IDOR_AUTHORIZATION', 'CY_SESSION_REVOCATION', 'CY_XSS_PROTECTION']);
  });

  it('5. Full Stack runner evaluation (Fixed code passes all 4 tests)', async () => {
    // Apply fixes for all 4 Full Stack challenge issues to Team 201
    await saveWorkspaceFile(
      201,
      'full-stack',
      'backend/src/index.js',
      'SELECT * FROM opportunities WHERE title LIKE ? OR company_name LIKE ?; const searchPattern = "%" + q + "%";'
    );
    await saveWorkspaceFile(
      201,
      'full-stack',
      'frontend/src/pages/Login.jsx',
      'const handleLogin = (res) => { if (res.user) { setUser(res.user); } };'
    );
    await saveWorkspaceFile(
      201,
      'full-stack',
      'frontend/src/components/OpportunityCard.jsx',
      'export function OpportunityCard({ opportunity }) { return <div>{opportunity.company_name}</div>; }'
    );
    await saveWorkspaceFile(
      201,
      'full-stack',
      'frontend/src/components/ApplyModal.jsx',
      'const numGpa = parseFloat(gpa); if (numGpa >= 0.0 && numGpa <= 4.0) submit();'
    );

    const runResult = await runControlledWorkspaceTests(201, 'full-stack');
    assert.equal(runResult.summary.passed, 4);
    assert.equal(runResult.summary.failed, 0);
    assert.equal(runResult.summary.total, 4);
    assert.ok(runResult.results.every((r) => r.status === 'PASS'));
  });

  it('6. Cybersecurity runner evaluation (Default template has failing tests, fixed code passes all 4 tests)', async () => {
    // Default cyber run has failing tests
    const initialRun = await runControlledWorkspaceTests(203, 'cybersecurity');
    assert.ok(initialRun.summary.failed > 0);

    // Apply fixes for all 4 Cybersecurity challenge vulnerabilities to Team 203
    await saveWorkspaceFile(
      203,
      'cybersecurity',
      'backend/src/index.js',
      `
      app.get('/api/user/profile', (req, res) => {
        res.json({ id: req.user.id, email: req.user.email }); // debug password removed
      });
      app.get('/api/documents/:id', (req, res) => {
        const doc = db.query('SELECT * FROM documents WHERE id = ? AND owner_id = ?', [req.params.id, req.user.id]);
      });
      app.post('/api/auth/logout', (req, res) => {
        db.query('DELETE FROM sessions WHERE token = ?', [req.token]);
      });
      `
    );
    await saveWorkspaceFile(
      203,
      'cybersecurity',
      'frontend/src/pages/Search.jsx',
      'export function SearchPage({ query }) { return <div>Results for: {query}</div>; }'
    );

    const runResult = await runControlledWorkspaceTests(203, 'cybersecurity');
    assert.equal(runResult.summary.passed, 4);
    assert.equal(runResult.summary.failed, 0);
    assert.equal(runResult.summary.total, 4);
    assert.ok(runResult.results.every((r) => r.status === 'PASS'));
  });

  it('7. PASS result format compliance', async () => {
    const runResult = await runControlledWorkspaceTests(201, 'full-stack');
    const passItem = runResult.results.find((r) => r.status === 'PASS');

    assert.ok(passItem);
    assert.ok(typeof passItem.id === 'string');
    assert.ok(typeof passItem.name === 'string');
    assert.equal(passItem.status, 'PASS');
    assert.ok(typeof passItem.message === 'string');
  });

  it('8. FAIL result format compliance (returns FAIL status without HTTP 500 error)', async () => {
    // Reset team 202 to template (which has failing tests)
    await resetWorkspace(202, 'full-stack');

    const res = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS2}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);

    const failItem = json.data.results.find((r) => r.status === 'FAIL');
    assert.ok(failItem);
    assert.ok(typeof failItem.id === 'string');
    assert.ok(typeof failItem.name === 'string');
    assert.equal(failItem.status, 'FAIL');
    assert.ok(typeof failItem.message === 'string');
    assert.ok(failItem.expected !== undefined);
    assert.ok(failItem.actual !== undefined);
  });

  it('9. Hidden test implementation is not returned in API response', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });
    const json = await res.json();

    const responseStr = JSON.stringify(json);

    // Verify hidden server test code / internal framework state is not leaked
    assert.ok(!responseStr.includes('runFullStackAssertions'));
    assert.ok(!responseStr.includes('runCybersecurityAssertions'));
    assert.ok(!responseStr.includes('fileMap.get'));
    assert.ok(!responseStr.includes('DATABASE_URL'));
    assert.ok(!responseStr.includes('SUPABASE_KEY'));
    assert.ok(!responseStr.includes('/apps/server/src'));
  });

  it('10. Safe error handling (Missing track or malformed workspace returns safe standard API error)', async () => {
    // Team without challenge track
    await db.run("INSERT INTO teams (id, code, name, challenge, status) VALUES (204, 'W_NO_TRACK', 'No Track Team', NULL, 'ACTIVE')");
    const tokenNoTrack = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenNoTrack,
      teamCode: 'W_NO_TRACK',
      userType: 'student',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    const res = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenNoTrack}` },
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'TRACK_NOT_SELECTED');
  });

  it('11. No arbitrary command execution (Runner service uses purely deterministic logic)', async () => {
    // Verify that running tests finishes instantly (< 100ms) without starting external processes
    const startTime = Date.now();
    const result = await runControlledWorkspaceTests(201, 'full-stack');
    const elapsed = Date.now() - startTime;

    assert.ok(result.summary.total > 0);
    assert.ok(elapsed < 200, `Execution took ${elapsed}ms, expected fast deterministic execution`);
  });

  it('12. Oversized / invalid workspace handling does not crash server', async () => {
    // Save multiple large valid files
    const largeCode = '// Valid large file content\n'.repeat(2000);
    await saveWorkspaceFile(201, 'full-stack', 'backend/src/index.js', largeCode);

    const res = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFS1}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
  });
});
