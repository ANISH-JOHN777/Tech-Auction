import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { initDb, getDb } from '../db/database.js';
import { sessionRepository } from '../db/repositories/session.repository.js';
import {
  getWorkspaceFiles,
  saveWorkspaceFile,
  resetWorkspace,
  sanitizeFilePath,
} from '../services/workspace.service.js';
import { EventService } from '../services/event.service.js';
import { createApp } from '../app.js';

describe('PHASE 10 — IN-PORTAL DEBUG WORKSPACE (PHASE 2 BACKEND SUITE)', () => {
  let db;
  let server;
  let baseUrl;

  const TEAM_1 = { id: 101, code: 'W_FS01', name: 'Alpha Workspace Devs', challenge: 'full-stack' };
  const TEAM_2 = { id: 102, code: 'W_FS02', name: 'Beta Workspace Devs', challenge: 'full-stack' };
  const TEAM_3 = { id: 103, code: 'W_CY01', name: 'Cyber Workspace Shield', challenge: 'cybersecurity' };

  let tokenTeam1;
  let tokenTeam2;

  before(async () => {
    db = await initDb();

    // Clean up test workspace files, sessions, and teams
    await db.run('DELETE FROM team_workspace_files WHERE team_id IN (101, 102, 103)');
    await db.run("DELETE FROM sessions WHERE team_code IN ('W_FS01', 'W_FS02', 'W_CY01')");
    await db.run('DELETE FROM teams WHERE id IN (101, 102, 103)');

    // Insert test teams
    await db.run(
      `INSERT INTO teams (id, code, name, college, department, challenge, wallet, auction_eligible, login_enabled, pin, status)
       VALUES 
       (101, 'W_FS01', 'Alpha Workspace Devs', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234', 'ACTIVE'),
       (102, 'W_FS02', 'Beta Workspace Devs', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234', 'ACTIVE'),
       (103, 'W_CY01', 'Cyber Workspace Shield', 'SNS Tech', 'IT', 'cybersecurity', 1000, 1, 1, '1234', 'ACTIVE')`
    );

    // Ensure event is LIVE
    await EventService.updateEventState('admin', 'LIVE', null, 'Workspace test suite initialization');

    // Create team sessions
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    tokenTeam1 = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenTeam1,
      teamCode: 'W_FS01',
      userType: 'student',
      expiresAt,
    });

    tokenTeam2 = 'student_session_' + crypto.randomBytes(24).toString('hex');
    await sessionRepository.createSession({
      token: tokenTeam2,
      teamCode: 'W_FS02',
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

  it('1. Authenticated workspace access succeeds', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/files`, {
      headers: { Authorization: `Bearer ${tokenTeam1}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.track, 'full-stack');
    assert.ok(Array.isArray(json.data.files));
    assert.ok(json.data.files.length > 0);
  });

  it('2. Unauthenticated request is rejected (401)', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/files`);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'UNAUTHORIZED');
  });

  it('3. Team isolation (Team A changes do not leak to Team B)', async () => {
    const modifiedContent = '// Team 1 custom App logic\nexport default function App() { return <div>Team 1</div>; }';
    await saveWorkspaceFile(101, 'full-stack', 'frontend/src/App.jsx', modifiedContent);

    const team1Workspace = await getWorkspaceFiles(101, 'full-stack');
    const team1App = team1Workspace.files.find((f) => f.path === 'frontend/src/App.jsx');
    assert.equal(team1App.content, modifiedContent);

    const team2Workspace = await getWorkspaceFiles(102, 'full-stack');
    const team2App = team2Workspace.files.find((f) => f.path === 'frontend/src/App.jsx');
    assert.notEqual(team2App.content, modifiedContent);
  });

  it('4. Track isolation (Full-Stack team cannot access Cybersecurity files)', async () => {
    await assert.rejects(
      async () => {
        sanitizeFilePath('frontend/src/pages/ConfigViewer.jsx', 'full-stack');
      },
      (err) => {
        assert.equal(err.code, 'FORBIDDEN_FILE');
        return true;
      }
    );
  });

  it('5. Allowed file path is accepted', () => {
    const sanitized = sanitizeFilePath('frontend/src/App.jsx', 'full-stack');
    assert.equal(sanitized, 'frontend/src/App.jsx');
  });

  it('6. Path traversal is rejected', () => {
    assert.throws(
      () => sanitizeFilePath('../../etc/passwd', 'full-stack'),
      (err) => {
        assert.equal(err.code, 'PATH_TRAVERSAL_DETECTED');
        return true;
      }
    );

    assert.throws(
      () => sanitizeFilePath('frontend/../App.jsx', 'full-stack'),
      (err) => {
        assert.equal(err.code, 'PATH_TRAVERSAL_DETECTED');
        return true;
      }
    );
  });

  it('7. Forbidden file path is rejected', () => {
    assert.throws(
      () => sanitizeFilePath('.env', 'full-stack'),
      (err) => {
        assert.equal(err.code, 'FORBIDDEN_FILE');
        return true;
      }
    );

    assert.throws(
      () => sanitizeFilePath('package.json', 'full-stack'),
      (err) => {
        assert.equal(err.code, 'FORBIDDEN_FILE');
        return true;
      }
    );
  });

  it('8. Save file via API persists changes', async () => {
    const testContent = '// API save test content';
    const res = await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenTeam1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: 'frontend/src/services/api.js',
        content: testContent,
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.saved, true);
  });

  it('9. Reload saved file returns updated content', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/files`, {
      headers: { Authorization: `Bearer ${tokenTeam1}` },
    });
    const json = await res.json();
    const apiFile = json.data.files.find((f) => f.path === 'frontend/src/services/api.js');
    assert.equal(apiFile.content, '// API save test content');
  });

  it('10. Reset workspace deletes modifications and restores default templates', async () => {
    const res = await fetch(`${baseUrl}/api/workspace/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenTeam1}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);

    const appFile = json.data.files.find((f) => f.path === 'frontend/src/App.jsx');
    assert.ok(!appFile.content.includes('Team 1 custom App logic'));
  });

  it('11. Resetting one team does not affect another team', async () => {
    const team2Content = '// Team 2 distinct code';
    await saveWorkspaceFile(102, 'full-stack', 'frontend/src/App.jsx', team2Content);

    // Reset Team 1
    await resetWorkspace(101, 'full-stack');

    // Verify Team 2 still has saved modifications
    const team2Workspace = await getWorkspaceFiles(102, 'full-stack');
    const team2App = team2Workspace.files.find((f) => f.path === 'frontend/src/App.jsx');
    assert.equal(team2App.content, team2Content);
  });

  it('12. Oversized content is rejected (413)', async () => {
    const hugeContent = 'A'.repeat(250 * 1024); // 250KB

    const res = await fetch(`${baseUrl}/api/workspace/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenTeam1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: 'frontend/src/App.jsx',
        content: hugeContent,
      }),
    });

    assert.equal(res.status, 413);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'PAYLOAD_TOO_LARGE');
  });
});
