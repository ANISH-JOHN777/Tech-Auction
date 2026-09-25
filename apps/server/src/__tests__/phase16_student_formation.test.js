import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { seedDemoData } from '../db/seed.js';
import { teamRepository } from '../db/repositories/team.repository.js';
import { sessionRepository } from '../db/repositories/session.repository.js';

test('PHASE 2 — STUDENT LOGIN & TEAM SELF-FORMATION SUITE', async (t) => {
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

  await t.test('1. STU001 valid login succeeds', async () => {
    const res = await makeRequest('/api/auth/student-login', 'POST', {
      studentCode: 'STU001',
      pin: '1234',
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.data.token.startsWith('student_session_'));
    assert.equal(res.data.data.student.student_code, 'STU001');
    assert.equal(res.data.data.student.pin_hash, undefined, 'pin_hash must not be exposed');
  });

  await t.test('2. Invalid student ID is rejected with 401', async () => {
    const res = await makeRequest('/api/auth/student-login', 'POST', {
      studentCode: 'INVALID_ID_999',
      pin: '1234',
    });

    assert.equal(res.status, 401);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error.code, 'INVALID_CREDENTIALS');
  });

  await t.test('3. Invalid PIN is rejected with 401', async () => {
    const res = await makeRequest('/api/auth/student-login', 'POST', {
      studentCode: 'STU001',
      pin: 'WRONG_PIN',
    });

    assert.equal(res.status, 401);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error.code, 'INVALID_CREDENTIALS');
  });

  await t.test('4. Student session contains student_id in sessions table', async () => {
    const loginRes = await makeRequest('/api/auth/student-login', 'POST', {
      studentCode: 'STU001',
      pin: '1234',
    });

    const token = loginRes.data.data.token;
    const session = await sessionRepository.findByToken(token);
    assert.ok(session, 'Session must exist');
    assert.ok(session.student_id, 'Session must store student_id');
  });

  await t.test('5. Student with no team can create a new team', async () => {
    const loginRes = await makeRequest('/api/auth/student-login', 'POST', {
      studentCode: 'STU001',
      pin: '1234',
    });
    const token = loginRes.data.data.token;

    const joinRes = await makeRequest('/api/auth/team/join-or-create', 'POST', {
      teamName: 'Binary Bosses',
      track: 'full-stack',
    }, token);

    assert.equal(joinRes.status, 200);
    assert.equal(joinRes.data.success, true);
    assert.equal(joinRes.data.data.team.name, 'Binary Bosses');
    assert.equal(joinRes.data.data.team.challenge, 'full-stack');
  });

  await t.test('6. New team receives 1000 starting credits', async () => {
    const loginRes = await makeRequest('/api/auth/student-login', 'POST', {
      studentCode: 'STU002',
      pin: '1234',
    });
    const token = loginRes.data.data.token;

    const joinRes = await makeRequest('/api/auth/team/join-or-create', 'POST', {
      teamName: 'Cyber Knights',
      track: 'cybersecurity',
    }, token);

    const team = joinRes.data.data.team;
    assert.equal(team.wallet, 1000, 'New team starting wallet must equal 1000');
  });

  await t.test('7. First member establishes track for the team', async () => {
    const loginRes = await makeRequest('/api/auth/student-login', 'POST', {
      studentCode: 'STU003',
      pin: '1234',
    });
    const token = loginRes.data.data.token;

    const joinRes = await makeRequest('/api/auth/team/join-or-create', 'POST', {
      teamName: 'Stack Overlords',
      track: 'full-stack',
    }, token);

    assert.equal(joinRes.data.data.team.challenge, 'full-stack');
  });

  await t.test('8, 9 & 10. Second member joins existing team, inherits track, and cannot change track', async () => {
    // STU004 creates team 'Dev Squad' with full-stack
    const login1 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU004', pin: '1234' });
    await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Dev Squad', track: 'full-stack' }, login1.data.data.token);

    // STU005 joins 'Dev Squad' supplying conflicting track 'cybersecurity'
    const login2 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU005', pin: '1234' });
    const join2 = await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Dev Squad', track: 'cybersecurity' }, login2.data.data.token);

    assert.equal(join2.status, 200);
    assert.equal(join2.data.data.team.name, 'Dev Squad');
    assert.equal(join2.data.data.team.challenge, 'full-stack', 'Second member must inherit team track');

    const team = await teamRepository.findByName('Dev Squad');
    assert.equal(team.challenge, 'full-stack', 'Team track must remain full-stack');
  });

  await t.test('11 & 12. Team reaches 4 members and 5th member is rejected with TEAM_FULL', async () => {
    // STU006 creates team 'Quad Force'
    const l6 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU006', pin: '1234' });
    await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Quad Force', track: 'cybersecurity' }, l6.data.data.token);

    // STU007, STU008, STU009 join 'Quad Force' (total 4)
    for (const code of ['STU007', 'STU008', 'STU009']) {
      const l = await makeRequest('/api/auth/student-login', 'POST', { studentCode: code, pin: '1234' });
      const j = await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Quad Force' }, l.data.data.token);
      assert.equal(j.status, 200);
    }

    // STU010 attempts to join full team (5th member)
    const l10 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU010', pin: '1234' });
    const j10 = await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Quad Force' }, l10.data.data.token);

    assert.equal(j10.status, 400);
    assert.equal(j10.data.error.code, 'TEAM_FULL');
  });

  await t.test('13. Case/whitespace team-name normalization prevents duplicate team creation', async () => {
    // STU011 creates '  Alpha Squad  '
    const l11 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU011', pin: '1234' });
    const j11 = await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: '  Alpha Squad  ', track: 'full-stack' }, l11.data.data.token);
    assert.equal(j11.status, 200);

    // STU012 joins 'alpha squad'
    const l12 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU012', pin: '1234' });
    const j12 = await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'alpha squad' }, l12.data.data.token);

    assert.equal(j12.status, 200);
    assert.equal(j12.data.data.team.name, 'Alpha Squad', 'Normalized lookup must match existing Alpha Squad team');
  });

  await t.test('14. Student already in a team cannot create/join another team', async () => {
    const l13 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU013', pin: '1234' });
    await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'First Team', track: 'full-stack' }, l13.data.data.token);

    const jDouble = await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Second Team', track: 'cybersecurity' }, l13.data.data.token);

    assert.equal(jDouble.status, 400);
    assert.equal(jDouble.data.error.code, 'ALREADY_IN_TEAM');
  });

  await t.test('15. Concurrent 5th-member join request is safely rejected', async () => {
    // STU014 creates 'Trio Team'
    const l14 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU014', pin: '1234' });
    await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Trio Team', track: 'full-stack' }, l14.data.data.token);

    // STU015, STU016 join (3 total)
    for (const code of ['STU015', 'STU016']) {
      const l = await makeRequest('/api/auth/student-login', 'POST', { studentCode: code, pin: '1234' });
      await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Trio Team' }, l.data.data.token);
    }

    // STU017 & STU018 attempt to join concurrently (4th & 5th)
    const l17 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU017', pin: '1234' });
    const l18 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU018', pin: '1234' });

    const [j17, j18] = await Promise.all([
      makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Trio Team' }, l17.data.data.token),
      makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Trio Team' }, l18.data.data.token),
    ]);

    const statuses = [j17.status, j18.status].sort();
    assert.deepEqual(statuses, [200, 400], 'Exactly one concurrent request succeeds (200) and the other is rejected (400 TEAM_FULL)');
  });

  await t.test('16. Existing team_members records remain valid', async () => {
    const l19 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU019', pin: '1234' });
    const j19 = await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Member Check', track: 'full-stack' }, l19.data.data.token);

    const team = j19.data.data.team;
    const members = await teamRepository.getMembers(team.id);
    assert.equal(members.length, 1, 'team_members table must contain 1 entry');
    assert.equal(members[0].role, 'Team Lead');
  });

  await t.test('17. Existing admin login still works', async () => {
    const res = await makeRequest('/api/admin/login', 'POST', {
      username: 'admin',
      password: 'admin123',
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.data.token.startsWith('admin_session_'));
  });

  await t.test('18. Existing team-based APIs still resolve req.team', async () => {
    const l20 = await makeRequest('/api/auth/student-login', 'POST', { studentCode: 'STU020', pin: '1234' });
    await makeRequest('/api/auth/team/join-or-create', 'POST', { teamName: 'Resolver Squad', track: 'cybersecurity' }, l20.data.data.token);

    const meRes = await makeRequest('/api/me', 'GET', null, l20.data.data.token);

    assert.equal(meRes.status, 200);
    assert.ok(meRes.data.data.team, 'req.team must be resolved in /api/me');
    assert.equal(meRes.data.data.team.name, 'Resolver Squad');
    assert.ok(meRes.data.data.student, 'req.student must be resolved in /api/me');
    assert.equal(meRes.data.data.student.student_code, 'STU020');
  });
});
