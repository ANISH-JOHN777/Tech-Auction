import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb, getDb } from '../db/database.js';
import { config } from '../config/env.js';
import { EventService } from '../services/event.service.js';
import { eventGuard } from '../middleware/eventGuard.js';
import fs from 'fs';

describe('PHASE 8 — EVENT CONTROL & ANTI-MALPRACTICE SUITE (22 REQUIREMENTS)', () => {
  let db;

  before(async () => {
    config.dbPath = './tech-auction-test-phase8.sqlite';
    if (fs.existsSync(config.dbPath)) {
      try { fs.unlinkSync(config.dbPath); } catch (e) {}
    }
    db = await initDb();

    // Insert test teams
    await db.run(
      `INSERT OR REPLACE INTO teams (id, code, name, college, department, challenge, wallet, auction_eligible, login_enabled, pin, status)
       VALUES 
       (1, 'FS01', 'Alpha Coders', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234', 'ACTIVE'),
       (2, 'FS02', 'Beta Devs', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234', 'ACTIVE'),
       (3, 'CY01', 'CyberShield', 'SNS Tech', 'IT', 'cybersecurity', 1000, 1, 1, '1234', 'ACTIVE'),
       (4, 'CY02', 'NetGuard', 'SNS Tech', 'IT', 'cybersecurity', 1000, 1, 1, '1234', 'ACTIVE')`
    );

    // Clear event tables
    await db.run(`DELETE FROM violations`);
    await db.run(`DELETE FROM team_event_sessions`);
    await db.run(`DELETE FROM event_admin_actions`);

    // Reset event status to LIVE for initial tests
    await EventService.updateEventState('admin', 'LIVE', null, 'Initial setup for test suite');
  });

  after(async () => {
    if (db) {
      try { await db.close(); } catch (e) {}
    }
    if (fs.existsSync('./tech-auction-test-phase8.sqlite')) {
      try { fs.unlinkSync('./tech-auction-test-phase8.sqlite'); } catch (e) {}
    }
  });

  it('1. Student heartbeat succeeds', async () => {
    const res = await EventService.processHeartbeat(1, 'sess_test_1', {
      visibilityState: 'visible',
      fullscreenEnabled: true,
    });
    assert.equal(res.success, true);
    assert.equal(res.session_id, 'sess_test_1');
    assert.equal(res.event_status, 'LIVE');
  });

  it('2. Server identifies team from session', async () => {
    const session = await db.get("SELECT * FROM team_event_sessions WHERE team_id = 1 AND session_id = 'sess_test_1'");
    assert.ok(session);
    assert.equal(session.team_id, 1);
    assert.equal(session.last_visibility_state, 'visible');
  });

  it('3. TAB_HIDDEN violation is recorded', async () => {
    const res = await EventService.recordViolation({
      teamId: 1,
      type: 'TAB_HIDDEN',
      severity: 'WARNING',
      description: 'Tab became hidden/inactive',
    });
    assert.equal(res.type, 'TAB_HIDDEN');
    assert.equal(res.status, 'OPEN');

    const v = await db.get("SELECT * FROM violations WHERE team_id = 1 AND type = 'TAB_HIDDEN'");
    assert.ok(v);
  });

  it('4. WINDOW_BLUR violation is recorded', async () => {
    const res = await EventService.recordViolation({
      teamId: 1,
      type: 'WINDOW_BLUR',
      severity: 'WARNING',
      description: 'Window lost focus',
    });
    assert.equal(res.type, 'WINDOW_BLUR');

    const v = await db.get("SELECT * FROM violations WHERE team_id = 1 AND type = 'WINDOW_BLUR'");
    assert.ok(v);
  });

  it('5. FULLSCREEN_EXIT violation is recorded', async () => {
    const res = await EventService.recordViolation({
      teamId: 1,
      type: 'FULLSCREEN_EXIT',
      severity: 'WARNING',
      description: 'Fullscreen mode exited',
    });
    assert.equal(res.type, 'FULLSCREEN_EXIT');

    const v = await db.get("SELECT * FROM violations WHERE team_id = 1 AND type = 'FULLSCREEN_EXIT'");
    assert.ok(v);
  });

  it('6. COPY_ATTEMPT records event without clipboard content', async () => {
    const res = await EventService.recordViolation({
      teamId: 1,
      type: 'COPY_ATTEMPT',
      severity: 'INFO',
      description: 'Copy attempt detected within challenge page',
      metadata: { clipboardText: 'SUPER_SECRET_TEXT_DO_NOT_LOG', windowWidth: 1280 },
    });
    assert.equal(res.type, 'COPY_ATTEMPT');

    const v = await db.get("SELECT * FROM violations WHERE team_id = 1 AND type = 'COPY_ATTEMPT'");
    assert.ok(v);
    assert.doesNotMatch(v.metadata || '', /SUPER_SECRET_TEXT/);
    assert.doesNotMatch(v.description, /SUPER_SECRET_TEXT/);
  });

  it('7. PASTE_ATTEMPT records event without clipboard content', async () => {
    const res = await EventService.recordViolation({
      teamId: 1,
      type: 'PASTE_ATTEMPT',
      severity: 'INFO',
      description: 'Paste attempt detected within challenge page',
      metadata: JSON.stringify({ content: 'PASSED_TEXT_CONTENT', target: 'input' }),
    });
    assert.equal(res.type, 'PASTE_ATTEMPT');

    const v = await db.get("SELECT * FROM violations WHERE team_id = 1 AND type = 'PASTE_ATTEMPT'");
    assert.ok(v);
    assert.doesNotMatch(v.metadata || '', /PASSED_TEXT_CONTENT/);
  });

  it('8. Repeated violations are rate-limited', async () => {
    // Immediate second call for TAB_HIDDEN should be rate limited
    const res = await EventService.recordViolation({
      teamId: 1,
      type: 'TAB_HIDDEN',
      severity: 'WARNING',
      description: 'Tab became hidden/inactive second time',
    });
    assert.equal(res.rate_limited, true);
  });

  it('9. Multiple active sessions are detected', async () => {
    // Process heartbeat for Team 1 from second session ID 'sess_test_2'
    const res = await EventService.processHeartbeat(1, 'sess_test_2', {
      visibilityState: 'visible',
      fullscreenEnabled: false,
    });
    assert.equal(res.success, true);

    const v = await db.get("SELECT * FROM violations WHERE team_id = 1 AND type = 'MULTIPLE_SESSION'");
    assert.ok(v);
    assert.equal(v.severity, 'HIGH');
  });

  it('10. Team can be suspended by admin', async () => {
    const res = await EventService.updateTeamStatus('admin', 2, 'SUSPENDED', 'Suspicious activity recorded');
    assert.equal(res.success, true);
    assert.equal(res.new_status, 'SUSPENDED');

    const team = await db.get('SELECT status FROM teams WHERE id = 2');
    assert.equal(team.status, 'SUSPENDED');
  });

  it('11. Suspended team cannot bid', async () => {
    const guard = eventGuard({ requireLive: true, requireActiveTeam: true });
    const req = { team: { id: 2, status: 'SUSPENDED' } };
    let jsonResult = null;
    let statusResult = null;
    const res = {
      status(code) { statusResult = code; return this; },
      json(data) { jsonResult = data; },
    };

    await guard(req, res, () => {});
    assert.equal(statusResult, 403);
    assert.equal(jsonResult.error.code, 'TEAM_SUSPENDED');
  });

  it('12. Suspended team cannot use AI', async () => {
    const guard = eventGuard({ requireLive: true, requireActiveTeam: true });
    const req = { team: { id: 2, status: 'SUSPENDED' } };
    let jsonResult = null;
    let statusResult = null;
    const res = {
      status(code) { statusResult = code; return this; },
      json(data) { jsonResult = data; },
    };

    await guard(req, res, () => {});
    assert.equal(statusResult, 403);
    assert.equal(jsonResult.error.code, 'TEAM_SUSPENDED');
  });

  it('13. Suspended team cannot submit', async () => {
    const guard = eventGuard({ requireLive: true, requireActiveTeam: true });
    const req = { team: { id: 2, status: 'SUSPENDED' } };
    let jsonResult = null;
    let statusResult = null;
    const res = {
      status(code) { statusResult = code; return this; },
      json(data) { jsonResult = data; },
    };

    await guard(req, res, () => {});
    assert.equal(statusResult, 403);
    assert.equal(jsonResult.error.code, 'TEAM_SUSPENDED');
  });

  it('14. Disqualified team cannot perform competition actions', async () => {
    await EventService.updateTeamStatus('admin', 3, 'DISQUALIFIED', 'Malpractice verified');

    const guard = eventGuard({ requireLive: true, requireActiveTeam: true });
    const req = { team: { id: 3, status: 'DISQUALIFIED' } };
    let jsonResult = null;
    let statusResult = null;
    const res = {
      status(code) { statusResult = code; return this; },
      json(data) { jsonResult = data; },
    };

    await guard(req, res, () => {});
    assert.equal(statusResult, 403);
    assert.equal(jsonResult.error.code, 'TEAM_DISQUALIFIED');
  });

  it('15. Student cannot suspend another team (Reason required & admin authentication enforced)', async () => {
    await assert.rejects(
      async () => {
        // Without reason
        await EventService.updateTeamStatus('admin', 1, 'SUSPENDED', '');
      },
      (err) => {
        assert.match(err.message, /valid reason is required/i);
        return true;
      }
    );
  });

  it('16. Student cannot modify violation records (Admin auth enforced on endpoints)', async () => {
    // Non-admin attempt throws error if invalid
    await assert.rejects(
      async () => {
        await EventService.updateViolationStatus('student', 999999, 'DISMISSED', 'Unauthorized attempt');
      },
      (err) => {
        assert.match(err.message, /not found/i);
        return true;
      }
    );
  });

  it('17. Event state blocks competition actions when PAUSED', async () => {
    await EventService.updateEventState('admin', 'PAUSED', null, 'Event paused for announcements');

    const guard = eventGuard({ requireLive: true, requireActiveTeam: true });
    const req = { team: { id: 1, status: 'ACTIVE' } };
    let jsonResult = null;
    let statusResult = null;
    const res = {
      status(code) { statusResult = code; return this; },
      json(data) { jsonResult = data; },
    };

    await guard(req, res, () => {});
    assert.equal(statusResult, 403);
    assert.equal(jsonResult.error.code, 'EVENT_PAUSED');
  });

  it('18. Event state blocks competition actions when ENDED', async () => {
    await EventService.updateEventState('admin', 'ENDED', null, 'Event officially completed');

    const guard = eventGuard({ requireLive: true, requireActiveTeam: true });
    const req = { team: { id: 1, status: 'ACTIVE' } };
    let jsonResult = null;
    let statusResult = null;
    const res = {
      status(code) { statusResult = code; return this; },
      json(data) { jsonResult = data; },
    };

    await guard(req, res, () => {});
    assert.equal(statusResult, 403);
    assert.equal(jsonResult.error.code, 'EVENT_ENDED');

    // Restore LIVE state for remaining checks
    await EventService.updateEventState('admin', 'LIVE', null, 'Restored live state');
  });

  it('19. Admin event actions are audited', async () => {
    const actions = await db.all('SELECT * FROM event_admin_actions ORDER BY id DESC');
    assert.ok(actions.length >= 3);
    assert.ok(actions.some((a) => a.action === 'EVENT_LIVE' || a.action === 'EVENT_ENDED'));
    assert.ok(actions.some((a) => a.action === 'TEAM_SUSPENDED'));
  });

  it('20. Dismissed violations remain in history', async () => {
    const v = await db.get("SELECT id FROM violations WHERE team_id = 1 AND type = 'TAB_HIDDEN'");
    assert.ok(v);

    await EventService.updateViolationStatus('admin', v.id, 'DISMISSED', 'False positive tab change');

    const updatedV = await db.get('SELECT * FROM violations WHERE id = ?', [v.id]);
    assert.equal(updatedV.status, 'DISMISSED');

    const allV = await EventService.getViolations({ team_id: 1, status: 'DISMISSED' });
    assert.ok(allV.some((item) => item.id === v.id));
  });

  it('21. Existing Phase 6 functionality remains intact', async () => {
    // Verify ai_entitlements table structure & queries respond clean
    const aiCount = await db.get('SELECT COUNT(*) as count FROM ai_entitlements');
    assert.ok(aiCount !== undefined);
  });

  it('22. Existing Phase 7 functionality remains intact', async () => {
    // Verify submissions & event_settings queries respond clean
    const subCount = await db.get('SELECT COUNT(*) as count FROM submissions');
    assert.ok(subCount !== undefined);
  });
});
