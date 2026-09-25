import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDemoData } from '../db/seed.js';
import { teamRepository } from '../db/repositories/team.repository.js';
import { scoreRepository } from '../db/repositories/score.repository.js';
import { walletRepository } from '../db/repositories/wallet.repository.js';
import { saveWorkspaceFile } from '../services/workspace.service.js';
import { runControlledWorkspaceTests } from '../services/workspaceRunner.service.js';
import { manualWalletAdjustment } from '../services/auctionEngine.service.js';
import { query } from '../db/postgres.js';

test('PHASE 3 — BUG CLEARING SCORE & COMPETITION TRACKING SUITE', async (t) => {
  const app = createApp();
  let server;
  let port;

  t.before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        port = server.address().port;
        process.env.PORT = port;
        resolve();
      });
    });
  });

  t.after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  t.beforeEach(async () => {
    await seedDemoData();
    // Enable LIVE event status so eventGuard allows workspace route execution
    await query("UPDATE event_settings SET value = 'LIVE' WHERE key = 'event_status'");
  });

  async function makeRequest(path, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`http://localhost:${port}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  await t.test('1. Initial bug score in database for a new team is 0', async () => {
    const team = await teamRepository.findByCode('FS01');
    const count = await scoreRepository.countClearedBugs(team.id);
    assert.equal(count, 0, 'Newly initialized team must have 0 cleared bugs in database');
  });

  await t.test('2. Execution with FAIL status does not credit failing bugs', async () => {
    const team = await teamRepository.findByCode('FS01');
    const result = await runControlledWorkspaceTests(team.id, 'full-stack');
    
    // Default template passes 2 assertions (FS_STATUS_UPDATE, FS_SUBMISSION) and fails 2 assertions (FS_SEARCH_FILTER, FS_API_RESPONSE)
    assert.equal(result.summary.bugsCleared, 2, 'Only passing assertions are credited as cleared bugs');
    assert.ok(!result.clearedBugs.includes('FS_SEARCH_FILTER'), 'Failing assertion FS_SEARCH_FILTER must not be credited');
    assert.ok(!result.clearedBugs.includes('FS_API_RESPONSE'), 'Failing assertion FS_API_RESPONSE must not be credited');
  });

  await t.test('3. Transition from FAIL -> PASS adds exactly 1 cleared bug', async () => {
    const team = await teamRepository.findByCode('FS01');
    const initialRun = await runControlledWorkspaceTests(team.id, 'full-stack');
    const baseCount = initialRun.summary.bugsCleared; // 2

    // Fix FS_SEARCH_FILTER in workspace
    await saveWorkspaceFile(
      team.id,
      'full-stack',
      'backend/src/index.js',
      "SELECT * FROM opportunities WHERE title LIKE %?% OR company_name LIKE %?%"
    );

    const updatedRun = await runControlledWorkspaceTests(team.id, 'full-stack');
    assert.equal(updatedRun.summary.bugsCleared, baseCount + 1, 'Newly fixed assertion must increment cleared bugs by exactly 1');
    assert.ok(updatedRun.clearedBugs.includes('FS_SEARCH_FILTER'));
  });

  await t.test('4. Repeated PASS execution does not duplicate points', async () => {
    const team = await teamRepository.findByCode('FS01');
    
    await saveWorkspaceFile(
      team.id,
      'full-stack',
      'backend/src/index.js',
      "SELECT * FROM opportunities WHERE title LIKE %?% OR company_name LIKE %?%"
    );

    await runControlledWorkspaceTests(team.id, 'full-stack');
    await runControlledWorkspaceTests(team.id, 'full-stack');
    const result = await runControlledWorkspaceTests(team.id, 'full-stack');

    assert.equal(result.summary.bugsCleared, 3);
    const dbCount = await scoreRepository.countClearedBugs(team.id);
    assert.equal(dbCount, 3, 'Database unique constraint must enforce single entry per bug');
  });

  await t.test('5. Multiple unique PASS assertions accumulate correctly', async () => {
    const team = await teamRepository.findByCode('FS01');

    // Fix bug 1: FS_SEARCH_FILTER
    await saveWorkspaceFile(
      team.id,
      'full-stack',
      'backend/src/index.js',
      "SELECT * FROM opportunities WHERE title LIKE %?% OR company_name LIKE %?%"
    );

    // Fix bug 2: FS_API_RESPONSE
    await saveWorkspaceFile(
      team.id,
      'full-stack',
      'frontend/src/pages/Login.jsx',
      "const user = res.user;"
    );

    const result = await runControlledWorkspaceTests(team.id, 'full-stack');
    assert.equal(result.summary.bugsCleared, 4, 'All 4 cleared bugs must yield score of 4');
  });

  await t.test('6. Full Stack track evaluates strictly FS assertions', async () => {
    const team = await teamRepository.findByCode('FS01');
    const result = await runControlledWorkspaceTests(team.id, 'full-stack');
    const ids = result.results.map((r) => r.id);
    assert.ok(ids.every((id) => id.startsWith('FS_')), 'Full Stack runner must only output FS_ assertion IDs');
  });

  await t.test('7. Cybersecurity track evaluates strictly CY assertions', async () => {
    const team = await teamRepository.findByCode('CY01');
    const result = await runControlledWorkspaceTests(team.id, 'cybersecurity');
    const ids = result.results.map((r) => r.id);
    assert.ok(ids.every((id) => id.startsWith('CY_')), 'Cybersecurity runner must only output CY_ assertion IDs');
  });

  await t.test('8. Team isolation: Team A cannot view or modify Team B score', async () => {
    const teamA = await teamRepository.findByCode('FS01');
    const teamB = await teamRepository.findByCode('FS02');

    await scoreRepository.recordClearedBug(teamA.id, 'full-stack', 'FS_SEARCH_FILTER');

    const bugsA = await scoreRepository.getClearedBugs(teamA.id);
    const bugsB = await scoreRepository.getClearedBugs(teamB.id);

    assert.equal(bugsA.length, 1);
    assert.equal(bugsB.length, 0, 'Team B must have 0 cleared bugs despite Team A progress');
  });

  await t.test('9. Track isolation: Direct attempt to record wrong-track assertion fails', async () => {
    const team = await teamRepository.findByCode('FS01');

    // Attempt to credit Cybersecurity assertion on Full Stack team
    const res = await scoreRepository.recordClearedBug(team.id, 'full-stack', 'CY_PASSWORD_EXPOSURE');
    assert.equal(res, null, 'Repository must reject wrong-track assertion crediting');

    const result = await runControlledWorkspaceTests(team.id, 'full-stack');
    assert.ok(!result.clearedBugs.includes('CY_PASSWORD_EXPOSURE'), 'Wrong track assertion must not be cleared');
  });

  await t.test('10. Client-supplied score parameters in /api/workspace/run are ignored', async () => {
    const l1 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU001', pin: '1234' });
    await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Score Hackers', track: 'full-stack' }, l1.data.data.token);

    const res = await makeRequest('/api/workspace/run', 'POST', {
      bugsCleared: 999,
      score: 100,
      points: 500,
      clearedBugs: ['FS_SEARCH_FILTER', 'FS_API_RESPONSE', 'FS_STATUS_UPDATE', 'FS_SUBMISSION'],
    }, l1.data.data.token);

    assert.equal(res.status, 200);
    assert.equal(res.data.data.summary.bugsCleared, 2, 'Server must derive score authoritatively and ignore client params');
  });

  await t.test('11. Starting wallet credits equal 1000', async () => {
    const team = await teamRepository.findByCode('FS01');
    const wallet = await walletRepository.findByTeamId(team.id);
    assert.equal(wallet.balance, 1000, 'Starting balance must be 1000');
  });

  await t.test('12. Auction spending reduces remaining credits', async () => {
    const team = await teamRepository.findByCode('FS01');
    await manualWalletAdjustment({ teamId: team.id, amount: -200, description: 'Auction purchase' });

    const result = await runControlledWorkspaceTests(team.id, 'full-stack');
    assert.equal(result.summary.remainingCredits, 800, 'Remaining credits must reflect auction deduction');
  });

  await t.test('13. Bug clearing does NOT alter wallet balance or credits', async () => {
    const team = await teamRepository.findByCode('FS01');
    const initialWallet = await walletRepository.findByTeamId(team.id);

    await scoreRepository.recordClearedBug(team.id, 'full-stack', 'FS_SEARCH_FILTER');

    const updatedWallet = await walletRepository.findByTeamId(team.id);
    assert.equal(updatedWallet.balance, initialWallet.balance, 'Bug clearing must not alter wallet balance');
  });

  await t.test('14 & 15. Final submission locks workspace and prevents post-final score increases', async () => {
    const l1 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU001', pin: '1234' });
    const j1 = await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Final Lock Team', track: 'full-stack' }, l1.data.data.token);
    const token = l1.data.data.token;
    const teamId = j1.data.data.team.id;

    // Clear 1 bug
    await scoreRepository.recordClearedBug(teamId, 'full-stack', 'FS_SEARCH_FILTER');

    // Submit final solution
    const subRes = await makeRequest('/api/submission', 'POST', {
      submissionType: 'WORKSPACE',
      submissionReference: 'Final Solution',
      isFinal: true,
    }, token);
    assert.equal(subRes.status, 200);

    // Attempt to run tests post-final
    const runRes = await makeRequest('/api/workspace/run', 'POST', {}, token);
    assert.ok(runRes.status >= 400, 'Post-final test run must be blocked by workspace lock');

    const count = await scoreRepository.countClearedBugs(teamId);
    assert.equal(count, 1, 'Final score must remain preserved at 1');
  });
});
