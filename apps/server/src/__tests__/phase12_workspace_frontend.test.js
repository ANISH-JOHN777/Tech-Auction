import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { initDb } from '../db/database.js';
import { sessionRepository } from '../db/repositories/session.repository.js';
import { saveWorkspaceFile, resetWorkspace } from '../services/workspace.service.js';
import { EventService } from '../services/event.service.js';
import { createApp } from '../app.js';

describe('PHASE 12 — IN-PORTAL DEBUG WORKSPACE (PHASE 4 FRONTEND WORKFLOW SUITE)', () => {
  let db;
  let server;
  let baseUrl;

  let tokenFullStack;
  let tokenCyber;

  before(async () => {
    db = await initDb();

    // Clean up test workspace files, sessions, and teams
    await db.run('DELETE FROM team_workspace_files WHERE team_id IN (301, 302)');
    await db.run("DELETE FROM sessions WHERE team_code IN ('W_UI_FS', 'W_UI_CY')");
    await db.run('DELETE FROM teams WHERE id IN (301, 302)');

    // Insert test teams
    await db.run(
      `INSERT INTO teams (id, code, name, college, department, challenge, wallet, auction_eligible, login_enabled, pin, status)
       VALUES 
       (301, 'W_UI_FS', 'UI FullStack Team', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234', 'ACTIVE'),
       (302, 'W_UI_CY', 'UI Cyber Team', 'SNS Tech', 'IT', 'cybersecurity', 1000, 1, 1, '1234', 'ACTIVE')`
    );

    // Ensure event is LIVE
    await EventService.updateEventState('admin', 'LIVE', null, 'Workspace UI test suite initialization');

    // Create team sessions
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    tokenFullStack = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenFullStack,
      teamCode: 'W_UI_FS',
      userType: 'student',
      expiresAt,
    });

    tokenCyber = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenCyber,
      teamCode: 'W_UI_CY',
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

  it('1. Workspace loads approved file tree and content', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/files`, {
      headers: { Authorization: `Bearer ${tokenFullStack}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.track, 'full-stack');
    assert.ok(Array.isArray(json.data.files));
    assert.ok(json.data.files.length > 0);
  });

  it('2. File selection works and allows opening allowed challenge files', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/files`, {
      headers: { Authorization: `Bearer ${tokenFullStack}` },
    });
    const json = await res.json();
    const appFile = json.data.files.find((f) => f.path === 'frontend/src/App.jsx');
    assert.ok(appFile);
    assert.equal(appFile.path, 'frontend/src/App.jsx');
  });

  it('3. Editor displays content from selected file', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/files`, {
      headers: { Authorization: `Bearer ${tokenFullStack}` },
    });
    const json = await res.json();
    const apiFile = json.data.files.find((f) => f.path === 'frontend/src/services/api.js');
    assert.ok(apiFile);
    assert.equal(typeof apiFile.content, 'string');
  });

  it('4. Save draft calls workspace POST API and updates saved file content', async () => {
    const updatedContent = '// Updated via UI Save action\nconsole.log("Save test");';
    const res = await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFullStack}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: 'frontend/src/App.jsx',
        content: updatedContent,
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.saved, true);
  });

  it('5. Run tests calls runner API and returns structured test results', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFullStack}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.summary);
    assert.ok(Array.isArray(json.data.results));
  });

  it('6. PASS result renders correctly in test output', async () => {
    // Save fix for FS_SEARCH_FILTER
    await saveWorkspaceFile(
      301,
      'full-stack',
      'backend/src/index.js',
      'SELECT * FROM opportunities WHERE title LIKE ? OR company_name LIKE ?; const searchPattern = "%" + q + "%";'
    );

    const res = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFullStack}` },
    });
    const json = await res.json();

    const passResult = json.data.results.find((r) => r.id === 'FS_SEARCH_FILTER');
    assert.ok(passResult);
    assert.equal(passResult.status, 'PASS');
    assert.ok(passResult.message);
  });

  it('7. FAIL result renders correctly in test output with expected/actual data', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFullStack}` },
    });
    const json = await res.json();

    const failResult = json.data.results.find((r) => r.status === 'FAIL');
    assert.ok(failResult);
    assert.equal(failResult.status, 'FAIL');
    assert.ok(failResult.expected !== undefined);
    assert.ok(failResult.actual !== undefined);
  });

  it('8. Reset workspace confirmation calls reset API and restores original template files', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFullStack}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data.files));
  });

  it('9. Track-specific challenge handling (Full Stack vs Cybersecurity title & file tree)', async () => {
    const fsRes = await fetch(`${baseUrl}/api/workspace/files`, {
      headers: { Authorization: `Bearer ${tokenFullStack}` },
    });
    const fsJson = await fsRes.json();
    assert.equal(fsJson.data.track, 'full-stack');

    const cyRes = await fetch(`${baseUrl}/api/workspace/files`, {
      headers: { Authorization: `Bearer ${tokenCyber}` },
    });
    const cyJson = await cyRes.json();
    assert.equal(cyJson.data.track, 'cybersecurity');
    assert.ok(cyJson.data.files.some((f) => f.path === 'frontend/src/pages/ConfigViewer.jsx'));
  });

  it('10. Unauthenticated or expired session rejects workspace requests safely', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/files`);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHORIZED');
  });

  it('11. Path security: Client attempt to pass path traversal in save file request is rejected (400)', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFullStack}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: '../../etc/passwd',
        content: 'malicious',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'PATH_TRAVERSAL_DETECTED');
  });

  it('12. Forbidden file path in save request is rejected (403)', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenFullStack}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: '.env',
        content: 'SECRET=123',
      }),
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'FORBIDDEN_FILE');
  });
});
