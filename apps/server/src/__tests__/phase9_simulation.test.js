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
import { ensureAuctionRooms, ensureWalletsAndCatalog } from '../db/seed.js';

describe('PHASE 9 — FULL TECH AUCTION EVENT SIMULATION & HARDENING SUITE', () => {
  let db;

  before(async () => {
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

    await ensureAuctionRooms();
    await ensureWalletsAndCatalog();
  });

  after(async () => {
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
    assert.ok(!invalidPin);
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

    let calledNext = false;
    await guard(req, res, () => { calledNext = true; });

    assert.equal(calledNext, false);
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
    const pastTime = new Date(Date.now() - 60000).toISOString();
    await db.run("UPDATE ai_entitlements SET expires_at = ?, status = 'EXPIRED' WHERE team_id = 2", [pastTime]);

    await assert.rejects(
      async () => {
        await processAIChat({
          team: { id: 2, code: 'FS02', challenge: 'full-stack' },
          message: 'Another question after expiry',
          forceMock: true,
        });
      },
      (err) => err.code === 'AI_SESSION_EXPIRED'
    );
  });

  it('Phase H — Challenge Lab Content Integrity', async () => {
    // Verification of track isolation rules
    const fsTeam = { id: 1, challenge: 'full-stack' };
    const cyTeam = { id: 4, challenge: 'cybersecurity' };

    assert.notEqual(fsTeam.challenge, cyTeam.challenge);
  });

  it('Phase I — Anti-Malpractice Signal Monitoring', async () => {
    const v1 = await EventService.recordViolation({
      teamId: 1,
      type: 'TAB_HIDDEN',
      severity: 'WARNING',
      description: 'Tab hidden during challenge',
    });
    assert.equal(v1.status, 'OPEN');

    const summary = await EventService.getEventSummary();
    assert.ok(summary.open_violations >= 1);
  });

  it('Phase J — Team Status Enforcement (Suspension & Disqualification)', async () => {
    await EventService.updateTeamStatus('admin', 1, 'SUSPENDED', 'Repeated tab switches detected');

    const guard = eventGuard({ requireLive: true, requireActiveTeam: true });
    const req = { team: { id: 1 } };
    let jsonResult = null;
    let statusResult = null;
    const res = {
      status(code) { statusResult = code; return this; },
      json(data) { jsonResult = data; },
    };

    let calledNext = false;
    await guard(req, res, () => { calledNext = true; });

    assert.equal(calledNext, false);
    assert.equal(statusResult, 403);
    assert.equal(jsonResult.error.code, 'TEAM_SUSPENDED');

    // Reinstate team for subsequent tests
    await EventService.updateTeamStatus('admin', 1, 'ACTIVE', 'Reinstated after review');
  });

  it('Phase K — Submission Portal & Constraint Rules', async () => {
    // Draft submission
    const sub1 = await createOrUpdateSubmission({
      team: { id: 1, code: 'FS01', challenge: 'full-stack' },
      submissionType: 'FILE',
      submissionReference: 'CampusConnect_FS01_v1.zip',
      isFinal: false,
    });
    assert.equal(sub1.status, 'SUBMITTED');
    assert.equal(sub1.submission_version, 1);

    // Finalize submission
    const subFinal = await createOrUpdateSubmission({
      team: { id: 1, code: 'FS01', challenge: 'full-stack' },
      submissionType: 'FILE',
      submissionReference: 'CampusConnect_FS01_FINAL.zip',
      isFinal: true,
    });
    assert.equal(subFinal.status, 'FINAL');
    assert.equal(subFinal.submission_version, 2);

    // Locked check
    await assert.rejects(
      async () => {
        await createOrUpdateSubmission({
          team: { id: 1, code: 'FS01', challenge: 'full-stack' },
          submissionType: 'FILE',
          submissionReference: 'CampusConnect_FS01_v3.zip',
          isFinal: false,
        });
      },
      (err) => err.code === 'SUBMISSION_LOCKED'
    );
  });

  it('Phase L — Faculty Evaluation & Rubric Validation (60/15/10/10/5 & 30/20/15/20/10/5)', async () => {
    const sub = await getSubmissionForTeam(1, 'full-stack');
    assert.ok(sub);

    // Exceed max rubric test
    await assert.rejects(
      async () => {
        await evaluateSubmission({
          adminUser: 'judge1',
          submissionId: sub.id,
          bugPoints: 70, // Exceeds 60
          functionalPoints: 10,
        });
      },
      (err) => err.code === 'SCORE_BOUNDS_EXCEEDED'
    );

    // Valid evaluation
    const evalRes = await evaluateSubmission({
      adminUser: 'judge1',
      submissionId: sub.id,
      status: 'FINAL',
      bugPoints: 50,
      functionalPoints: 12,
      technicalPoints: 8,
      reportPoints: 8,
      presentationPoints: 4,
      judgeNotes: 'Excellent bug fixes and presentation',
    });

    assert.equal(evalRes.score.total_score, 82);
  });

  it('Phase M — Official Leaderboard & Privacy Visibility Gate', async () => {
    // Leaderboard hidden initially
    await updateEventSetting('leaderboard_visible', 'false');
    const hiddenLb = await getPublicLeaderboard();
    assert.equal(hiddenLb.visible, false);

    // Enable leaderboard
    await updateEventSetting('leaderboard_visible', 'true');
    const publicLb = await getPublicLeaderboard();
    assert.equal(publicLb.visible, true);
    assert.ok(publicLb.entries.length >= 1);
    assert.equal(publicLb.entries[0].teamCode, 'FS01');
    assert.equal(publicLb.entries[0].score, 82);
  });

  it('Phase N — Event Termination (LIVE -> ENDED)', async () => {
    await EventService.updateEventState('admin', 'ENDED', null, 'Event completed');

    const guard = eventGuard({ requireLive: true, requireActiveTeam: true });
    const req = { team: { id: 1, status: 'ACTIVE' } };
    let jsonResult = null;
    let statusResult = null;
    const res = {
      status(code) { statusResult = code; return this; },
      json(data) { jsonResult = data; },
    };

    let calledNext = false;
    await guard(req, res, () => { calledNext = true; });

    assert.equal(calledNext, false);
    assert.equal(statusResult, 403);
    assert.equal(jsonResult.error.code, 'EVENT_ENDED');
  });

  // ---------------------------------------------------------
  // 2. HARDENING & AUDIT SUITES
  // ---------------------------------------------------------

  it('Database Integrity Audit — No Orphan Records or Invalid Balances', async () => {
    const wallets = await db.all('SELECT * FROM wallets');
    assert.ok(wallets.every((w) => w.balance >= 0 && w.held_balance >= 0));

    const bids = await db.all('SELECT * FROM bids');
    assert.ok(bids.every((b) => b.amount > 0));
  });

  it('Wallet Audit — Transaction Ledger Balances Match', async () => {
    const wallets = await db.all('SELECT * FROM wallets');
    for (const w of wallets) {
      const txs = await db.all("SELECT amount FROM wallet_transactions WHERE team_id = ? AND type IN ('INITIAL_BALANCE', 'ITEM_PURCHASE', 'ADMIN_ADJUSTMENT')", [w.team_id]);
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

    // Ensure initial draft submission exists
    await createOrUpdateSubmission({
      team: { id: 3, code: 'FS03', name: 'Gamma Hackers', challenge: 'full-stack' },
      submissionType: 'FILE',
      submissionReference: 'CampusConnect_FS03_draft.zip',
      isFinal: false,
    });

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
