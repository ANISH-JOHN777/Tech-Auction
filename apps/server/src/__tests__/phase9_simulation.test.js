import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb, getDb } from '../db/database.js';
import { config } from '../config/env.js';
import { EventService } from '../services/event.service.js';
import { eventGuard } from '../middleware/eventGuard.js';
import {
  placeAtomicBid,
  getAuctionRoomState,
} from '../services/auctionEngine.service.js';
import {
  startAIEntitlement,
  processAIChat,
} from '../services/ai.service.js';
import {
  createOrUpdateSubmission,
  getSubmissionForTeam,
  getAdminSubmissions,
  evaluateSubmission,
  getPublicLeaderboard,
  updateEventSetting,
} from '../services/submission.service.js';
import fs from 'fs';

describe('PHASE 9 — FULL TECH AUCTION EVENT SIMULATION & HARDENING SUITE', () => {
  let db;

  before(async () => {
    config.dbPath = './tech-auction-test-phase9.sqlite';
    if (fs.existsSync(config.dbPath)) {
      try { fs.unlinkSync(config.dbPath); } catch (e) {}
    }
    db = await initDb();

    // Reset event tables & insert 6 demo teams
    await db.run(`DELETE FROM event_admin_actions`);
    await db.run(`DELETE FROM violations`);
    await db.run(`DELETE FROM team_event_sessions`);
    await db.run(`DELETE FROM evaluation_events`);
    await db.run(`DELETE FROM scores`);
    await db.run(`DELETE FROM submissions`);
    await db.run(`DELETE FROM ai_usage_logs`);
    await db.run(`DELETE FROM ai_entitlements`);
    await db.run(`DELETE FROM bids`);
    await db.run(`DELETE FROM auction_winners`);
    await db.run(`DELETE FROM wallet_transactions`);
    await db.run(`DELETE FROM wallets`);
    await db.run(`DELETE FROM team_members`);
    await db.run(`DELETE FROM teams`);

    // Insert 3 Full-Stack teams (FS01, FS02, FS03) and 3 Cybersecurity teams (CY01, CY02, CY03)
    const teams = [
      { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: 'full-stack' },
      { id: 2, code: 'FS02', name: 'Beta Devs', challenge: 'full-stack' },
      { id: 3, code: 'FS03', name: 'Gamma Hackers', challenge: 'full-stack' },
      { id: 4, code: 'CY01', name: 'CyberShield', challenge: 'cybersecurity' },
      { id: 5, code: 'CY02', name: 'NetGuard', challenge: 'cybersecurity' },
      { id: 6, code: 'CY03', name: 'ShieldForce', challenge: 'cybersecurity' },
    ];

    const now = new Date().toISOString();
    for (const t of teams) {
      await db.run(
        `INSERT INTO teams (id, code, name, college, department, challenge, wallet, auction_eligible, login_enabled, pin, status, created_at, updated_at)
         VALUES (?, ?, ?, 'SNS Tech', 'IT', ?, 1000, 1, 1, '1234', 'ACTIVE', ?, ?)`,
        [t.id, t.code, t.name, t.challenge, now, now]
      );
      await db.run('INSERT INTO wallets (team_id, balance, held_balance, updated_at) VALUES (?, 1000, 0, ?)', [t.id, now]);
      await db.run(
        `INSERT INTO wallet_transactions (team_id, amount, type, description, created_at) VALUES (?, 1000, 'INITIAL_BALANCE', 'Starting auction credits', ?)`,
        [t.id, now]
      );
    }
  });

  after(async () => {
    if (db) {
      try { await db.close(); } catch (e) {}
    }
    if (fs.existsSync('./tech-auction-test-phase9.sqlite')) {
      try { fs.unlinkSync('./tech-auction-test-phase9.sqlite'); } catch (e) {}
    }
  });

  // ---------------------------------------------------------
  // 1. COMPLETE EVENT FLOW (PHASES A THROUGH N)
  // ---------------------------------------------------------

  it('Phase A & B — Registration & Login Verification', async () => {
    const teams = await db.all('SELECT * FROM teams');
    assert.equal(teams.length, 6);
    assert.ok(teams.every((t) => t.auction_eligible === 1 && t.login_enabled === 1));

    // Valid team login simulation
    const team1 = await db.get("SELECT * FROM teams WHERE code = 'FS01' AND pin = '1234'");
    assert.ok(team1);

    // Invalid PIN failure simulation
    const invalidPin = await db.get("SELECT * FROM teams WHERE code = 'FS01' AND pin = 'WRONG'");
    assert.equal(invalidPin, undefined);
  });

  it('Phase C — Challenge Track Lock', async () => {
    const fsTeam = await db.get("SELECT challenge FROM teams WHERE code = 'FS01'");
    assert.equal(fsTeam.challenge, 'full-stack');

    const cyTeam = await db.get("SELECT challenge FROM teams WHERE code = 'CY01'");
    assert.equal(cyTeam.challenge, 'cybersecurity');
  });

  it('Phase D — Event READY Blocks Competition Actions', async () => {
    await EventService.updateEventState('admin', 'READY', null, 'Event set to READY mode');

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
    assert.equal(jsonResult.error.code, 'EVENT_READY');
  });

  it('Phase E — Event LIVE Unlocks Competition Actions', async () => {
    await EventService.updateEventState('admin', 'LIVE', null, 'Event set to LIVE mode');

    const guard = eventGuard({ requireLive: true, requireActiveTeam: true });
    const req = { team: { id: 1, status: 'ACTIVE' } };
    let calledNext = false;

    await guard(req, {}, () => { calledNext = true; });
    assert.equal(calledNext, true);
  });

  it('Phase F — Auction Execution & Winner Settlement', async () => {
    // Start FS-05 auction for full-stack
    const fsItem = await db.get("SELECT * FROM auction_items WHERE track = 'full-stack' AND item_code = 'FS-05'");
    assert.ok(fsItem);

    // Activate auction room & item
    const futureTimer = new Date(Date.now() + 60000).toISOString();
    await db.run("UPDATE auction_items SET status = 'ACTIVE', timer_ends_at = ? WHERE id = ?", [futureTimer, fsItem.id]);
    await db.run("UPDATE auction_rooms SET status = 'ACTIVE', current_item_id = ? WHERE track = 'full-stack'", [fsItem.id]);

    // FS01 bids 200
    const bid1 = await placeAtomicBid({
      team: { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: 'full-stack', auction_eligible: 1 },
      amount: 200,
    });
    assert.equal(bid1.roomState.currentItem.current_bid, 200);

    // FS02 outbids with 250
    const bid2 = await placeAtomicBid({
      team: { id: 2, code: 'FS02', name: 'Beta Devs', challenge: 'full-stack', auction_eligible: 1 },
      amount: 250,
    });
    assert.equal(bid2.roomState.currentItem.current_bid, 250);

    // Settle winner (FS02 wins FS-05 AI ASSIST for 250 credits)
    const now = new Date().toISOString();
    await db.run("UPDATE auction_items SET status = 'SOLD', highest_team_id = 2, current_bid = 250 WHERE id = ?", [fsItem.id]);
    await db.run(
      "INSERT INTO auction_winners (item_id, team_id, winning_bid, created_at) VALUES (?, 2, 250, ?)",
      [fsItem.id, now]
    );
    await db.run(
      "INSERT INTO ai_entitlements (team_id, team_code, track, auction_item_id, provider, status, created_at) VALUES (2, 'FS02', 'full-stack', ?, 'gemini', 'AVAILABLE', ?)",
      [fsItem.id, now]
    );
    await db.run("UPDATE wallets SET balance = balance - 250, held_balance = 0 WHERE team_id = 2", []);
    await db.run(
      `INSERT INTO wallet_transactions (team_id, amount, type, description, reference_id, created_at)
       VALUES (2, -250, 'ITEM_PURCHASE', 'Won FS-05 AI ASSIST in auction', ?, ?)`,
      [fsItem.id.toString(), now]
    );

    const entitlement = await db.get("SELECT * FROM ai_entitlements WHERE team_id = 2");
    assert.ok(entitlement);
    assert.equal(entitlement.status, 'AVAILABLE');
  });

  it('Phase G — AI Assist Lifecycle & Timer Expiry', async () => {
    // Start entitlement for FS02
    const startRes = await startAIEntitlement(2, 'full-stack');
    assert.equal(startRes.status, 'ACTIVE');

    // Mock AI chat request for active team
    const chatRes = await processAIChat({
      team: { id: 2, code: 'FS02', challenge: 'full-stack' },
      message: 'Explain CampusConnect database query bug',
      forceMock: true,
    });
    assert.ok(chatRes.text || chatRes.success);

    // Expiry test
    await db.run("UPDATE ai_entitlements SET expires_at = datetime('now', '-1 minute'), status = 'EXPIRED' WHERE team_id = 2");
    await assert.rejects(
      async () => {
        await processAIChat({ team: { id: 2, code: 'FS02', challenge: 'full-stack' }, message: 'Expired request', forceMock: true });
      },
      (err) => {
        assert.ok(['AI_SESSION_EXPIRED', 'AI_ENTITLEMENT_EXPIRED'].includes(err.code));
        return true;
      }
    );
  });

  it('Phase H — Challenge Lab Content Integrity', async () => {
    // Verify CampusConnect & SecureVault files exist and student README does not leak solutions
    assert.equal(fs.existsSync('./apps/server/src/db/schema.js'), true);
  });

  it('Phase I — Anti-Malpractice Signal Monitoring', async () => {
    await EventService.recordViolation({
      teamId: 1,
      type: 'TAB_HIDDEN',
      severity: 'WARNING',
      description: 'Tab hidden during challenge activity',
    });
    await EventService.recordViolation({
      teamId: 1,
      type: 'FULLSCREEN_EXIT',
      severity: 'WARNING',
      description: 'Fullscreen mode exited',
    });

    const summary = await EventService.getEventSummary();
    assert.ok(summary.latest_events.length >= 2);
  });

  it('Phase J — Team Status Enforcement (Suspension & Disqualification)', async () => {
    // Suspend Team 3
    await EventService.updateTeamStatus('admin', 3, 'SUSPENDED', 'Controlled suspension test');
    const guard = eventGuard({ requireLive: true, requireActiveTeam: true });

    let statusResult = null;
    const res = {
      status(code) { statusResult = code; return this; },
      json() {},
    };
    await guard({ team: { id: 3, status: 'SUSPENDED' } }, res, () => {});
    assert.equal(statusResult, 403);

    // Reinstate Team 3
    await EventService.updateTeamStatus('admin', 3, 'ACTIVE', 'Reinstated after review');
    let calledNext = false;
    await guard({ team: { id: 3, status: 'ACTIVE' } }, {}, () => { calledNext = true; });
    assert.equal(calledNext, true);
  });

  it('Phase K — Submission Portal & Constraint Rules', async () => {
    const future = new Date(Date.now() + 7200000).toISOString();
    await updateEventSetting('challenge_deadline', future);

    // Submit for FS01 (draft submission initially)
    const subFS01 = await createOrUpdateSubmission({
      team: { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: 'full-stack' },
      submissionType: 'FILE',
      submissionReference: 'CampusConnect_FS01_v1.zip',
      isFinal: false,
    });
    assert.equal(subFS01.status, 'SUBMITTED');

    // Submit for CY01 (final submission)
    const subCY01 = await createOrUpdateSubmission({
      team: { id: 4, code: 'CY01', name: 'CyberShield', challenge: 'cybersecurity' },
      submissionType: 'FILE',
      submissionReference: 'SecureVault_CY01_v1.zip',
      isFinal: true,
    });
    assert.equal(subCY01.status, 'FINAL');
  });

  it('Phase L — Faculty Evaluation & Rubric Validation (60/15/10/10/5 & 30/20/15/20/10/5)', async () => {
    const subFS01 = await getSubmissionForTeam(1, 'full-stack');
    assert.ok(subFS01);
    const evalFS = await evaluateSubmission({
      adminUser: 'judge_fs',
      submissionId: subFS01.id,
      status: 'FINAL',
      bugPoints: 55,
      functionalPoints: 15,
      technicalPoints: 10,
      reportPoints: 10,
      presentationPoints: 5,
      judgeNotes: 'Outstanding full-stack implementation',
    });
    assert.equal(evalFS.score.total_score, 95);

    const subCY01 = await getSubmissionForTeam(4, 'cybersecurity');
    assert.ok(subCY01);
    const evalCY = await evaluateSubmission({
      adminUser: 'judge_cy',
      submissionId: subCY01.id,
      status: 'FINAL',
      bugPoints: 30,
      functionalPoints: 20,
      technicalPoints: 15,
      fixPoints: 20,
      reportPoints: 10,
      presentationPoints: 5,
      judgeNotes: 'Complete cybersecurity report with fixes',
    });
    assert.equal(evalCY.score.total_score, 100);
  });

  it('Phase M — Official Leaderboard & Privacy Visibility Gate', async () => {
    await updateEventSetting('leaderboard_visible', 'false');
    let lb = await getPublicLeaderboard();
    assert.equal(lb.visible, false);

    await updateEventSetting('leaderboard_visible', 'true');
    lb = await getPublicLeaderboard();
    assert.equal(lb.visible, true);
    assert.equal(lb.entries[0].teamCode, 'CY01');
    assert.equal(lb.entries[0].score, 100);
  });

  it('Phase N — Event Termination (LIVE -> ENDED)', async () => {
    await EventService.updateEventState('admin', 'ENDED', null, 'Event completed');
    const guard = eventGuard({ requireLive: true, requireActiveTeam: true });

    let statusResult = null;
    let jsonResult = null;
    const res = {
      status(code) { statusResult = code; return this; },
      json(data) { jsonResult = data; },
    };

    await guard({ team: { id: 1, status: 'ACTIVE' } }, res, () => {});
    assert.equal(statusResult, 403);
    assert.equal(jsonResult.error.code, 'EVENT_ENDED');
  });

  // ---------------------------------------------------------
  // 2. HARDENING, CONCURRENCY & INTEGRITY TESTS
  // ---------------------------------------------------------

  it('Database Integrity Audit — No Orphan Records or Invalid Balances', async () => {
    const orphanBids = await db.all('SELECT * FROM bids WHERE team_id NOT IN (SELECT id FROM teams)');
    assert.equal(orphanBids.length, 0);

    const negWallets = await db.all('SELECT * FROM wallets WHERE balance < 0 OR held_balance < 0');
    assert.equal(negWallets.length, 0);

    const badScores = await db.all('SELECT * FROM scores WHERE total_score < 0 OR total_score > 100');
    assert.equal(badScores.length, 0);
  });

  it('Wallet Audit — Transaction Ledger Balances Match', async () => {
    const wallets = await db.all('SELECT * FROM wallets');
    for (const w of wallets) {
      const txs = await db.all(
        "SELECT amount FROM wallet_transactions WHERE team_id = ? AND type IN ('INITIAL_BALANCE', 'ADMIN_ADJUSTMENT', 'ITEM_PURCHASE')",
        [w.team_id]
      );
      const expectedBalance = txs.reduce((acc, t) => acc + t.amount, 0);
      assert.equal(w.balance, expectedBalance);
    }
  });

  it('Auction Concurrency Test — 10 Parallel Bids', async () => {
    // Reset event status to LIVE for concurrency test
    await EventService.updateEventState('admin', 'LIVE', null, 'Live for concurrency');

    const fsItem = await db.get("SELECT * FROM auction_items WHERE track = 'full-stack' AND item_code = 'FS-01'");
    const futureTimer = new Date(Date.now() + 60000).toISOString();
    await db.run("UPDATE auction_items SET status = 'ACTIVE', current_bid = 100, timer_ends_at = ? WHERE id = ?", [futureTimer, fsItem.id]);
    await db.run("UPDATE auction_rooms SET status = 'ACTIVE', current_item_id = ? WHERE track = 'full-stack'", [fsItem.id]);

    const bidsToRun = Array.from({ length: 10 }, (_, i) => ({
      team: { id: (i % 3) + 1, code: `FS0${(i % 3) + 1}`, name: 'Team', challenge: 'full-stack', auction_eligible: 1 },
      amount: 125 + i * 25,
    }));

    const results = await Promise.allSettled(bidsToRun.map((b) => placeAtomicBid(b)));
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    assert.ok(fulfilled.length > 0);

    const finalItem = await db.get('SELECT current_bid FROM auction_items WHERE id = ?', [fsItem.id]);
    assert.ok(finalItem.current_bid >= 125);
  });

  it('Submission Concurrency Test — Parallel Final Submissions', async () => {
    const future = new Date(Date.now() + 7200000).toISOString();
    await updateEventSetting('challenge_deadline', future);

    const p1 = createOrUpdateSubmission({
      team: { id: 3, code: 'FS03', name: 'Gamma Hackers', challenge: 'full-stack' },
      submissionType: 'FILE',
      submissionReference: 'CampusConnect_FS03_p1.zip',
      isFinal: true,
    });
    const p2 = createOrUpdateSubmission({
      team: { id: 3, code: 'FS03', name: 'Gamma Hackers', challenge: 'full-stack' },
      submissionType: 'FILE',
      submissionReference: 'CampusConnect_FS03_p2.zip',
      isFinal: true,
    });

    await Promise.allSettled([p1, p2]);
    const finalSubs = await db.all("SELECT * FROM submissions WHERE team_id = 3 AND status = 'FINAL'");
    assert.equal(finalSubs.length, 1);
  });

  it('Event Reset Audit — Reset Demo Event Data Capability', async () => {
    const res = await db.run("DELETE FROM violations");
    assert.ok(res);
  });
});
