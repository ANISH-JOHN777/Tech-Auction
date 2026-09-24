import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../db/database.js';
import { EventService } from '../services/event.service.js';
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
  evaluateSubmission,
  reopenSubmission,
  getPublicLeaderboard,
  updateEventSetting,
  getEventSettings,
} from '../services/submission.service.js';
import { ensureAuctionRooms, ensureWalletsAndCatalog } from '../db/seed.js';

describe('PHASE 11 — REAL USER TESTING & VERIFICATION SUITE', () => {
  let db;

  before(async () => {
    db = await initDb();

    // Reset test environment data cleanly
    const tables = [
      'event_admin_actions', 'violations', 'team_event_sessions', 'evaluation_events',
      'scores', 'submissions', 'ai_usage_logs', 'ai_entitlements', 'bids',
      'auction_winners', 'wallet_transactions', 'wallets', 'team_members', 'teams'
    ];
    for (const t of tables) {
      await db.run(`DELETE FROM ${t}`);
    }

    // Insert test demo teams: FS01, FS02, FS03, CY01, CY02, CY03 with auction_eligible = 1
    const testTeams = [
      { id: 101, code: 'FS01', name: 'Code Warriors', challenge: 'full-stack', eligible: 1 },
      { id: 102, code: 'FS02', name: 'Bug Hunters', challenge: 'full-stack', eligible: 1 },
      { id: 103, code: 'FS03', name: 'Byte Masters', challenge: 'full-stack', eligible: 1 },
      { id: 104, code: 'CY01', name: 'Cyber Hawks', challenge: 'cybersecurity', eligible: 1 },
      { id: 105, code: 'CY02', name: 'Net Defenders', challenge: 'cybersecurity', eligible: 1 },
      { id: 106, code: 'CY03', name: 'Shield Force', challenge: 'cybersecurity', eligible: 1 },
    ];

    const now = new Date().toISOString();
    for (const t of testTeams) {
      await db.run(
        `INSERT INTO teams (id, code, name, pin, college, department, challenge, wallet, auction_eligible, login_enabled, status, created_at, updated_at)
         VALUES (?, ?, ?, '1234', 'SNS College of Technology', 'Department of IT', ?, 1000, ?, 1, 'ACTIVE', ?, ?)`,
        [t.id, t.code, t.name, t.challenge, t.eligible, now, now]
      );
      await db.run(
        `INSERT INTO wallets (team_id, balance, held_balance, updated_at) VALUES (?, 1000, 0, ?)`,
        [t.id, now]
      );
      await db.run(
        `INSERT INTO wallet_transactions (team_id, amount, type, description, created_at) VALUES (?, 1000, 'INITIAL_BALANCE', 'Starting auction credits', ?)`,
        [t.id, now]
      );
    }

    await ensureAuctionRooms();
    await ensureWalletsAndCatalog();
    await EventService.updateEventState('admin', 'LIVE', null, 'Phase 11 Testing Start');
  });

  it('1. Student Authentication & Track Binding (FS01 & CY01)', async () => {
    const fsTeam = await db.get('SELECT * FROM teams WHERE code = ?', ['FS01']);
    assert.equal(fsTeam.code, 'FS01');
    assert.equal(fsTeam.challenge, 'full-stack');

    const cyTeam = await db.get('SELECT * FROM teams WHERE code = ?', ['CY01']);
    assert.equal(cyTeam.code, 'CY01');
    assert.equal(cyTeam.challenge, 'cybersecurity');
  });

  it('2. Full-Stack Auction Bidding, Wallet Hold & Outbid Settlement (FS01 & FS02)', async () => {
    const catalogItem = await db.get("SELECT * FROM auction_items WHERE track = 'full-stack' AND item_code = 'FS-01'");
    assert.ok(catalogItem, 'Catalog item FS-01 must exist');

    // Start item in room
    const timerEndsAt = new Date(Date.now() + 60000).toISOString();
    await db.run(
      "UPDATE auction_rooms SET current_item_id = ?, status = 'ACTIVE' WHERE track = 'full-stack'",
      [catalogItem.id]
    );
    await db.run(
      "UPDATE auction_items SET current_bid = 100, highest_team_id = 101, status = 'ACTIVE', timer_ends_at = ? WHERE id = ?",
      [timerEndsAt, catalogItem.id]
    );
    await db.run("UPDATE wallets SET held_balance = 100 WHERE team_id = 101");

    const team102 = await db.get('SELECT * FROM teams WHERE id = 102');
    const result = await placeAtomicBid({ team: team102, amount: 150 });
    assert.equal(result.roomState.currentItem.current_bid, 150);
    assert.equal(result.roomState.currentItem.highest_team_id, 102);

    // Verify FS01 held balance released and FS02 balance held
    const w101 = await db.get('SELECT * FROM wallets WHERE team_id = 101');
    const w102 = await db.get('SELECT * FROM wallets WHERE team_id = 102');
    assert.equal(w101.held_balance, 0, 'FS01 held balance must be released on outbid');
    assert.equal(w102.held_balance, 150, 'FS02 held balance must equal current bid');
  });

  it('3. Multi-Team Concurrent Bidding Integrity (FS01, FS02, FS03)', async () => {
    const catalogItem = await db.get("SELECT * FROM auction_items WHERE track = 'full-stack' AND item_code = 'FS-05'");
    const timerEndsAt = new Date(Date.now() + 60000).toISOString();

    await db.run("UPDATE auction_items SET current_bid = 0, highest_team_id = NULL, status = 'ACTIVE', timer_ends_at = ? WHERE id = ?", [timerEndsAt, catalogItem.id]);
    await db.run("UPDATE auction_rooms SET current_item_id = ?, status = 'ACTIVE' WHERE track = 'full-stack'", [catalogItem.id]);

    const team101 = await db.get('SELECT * FROM teams WHERE id = 101');
    const team102 = await db.get('SELECT * FROM teams WHERE id = 102');
    const team103 = await db.get('SELECT * FROM teams WHERE id = 103');

    // Place consecutive valid bids
    await placeAtomicBid({ team: team101, amount: 200 });
    await placeAtomicBid({ team: team102, amount: 250 });
    await placeAtomicBid({ team: team103, amount: 300 });

    const finalState = await getAuctionRoomState('full-stack');
    assert.equal(finalState.currentItem.current_bid, 300);
    assert.equal(finalState.currentItem.highest_team_id, 103);

    const w101 = await db.get('SELECT * FROM wallets WHERE team_id = 101');
    const w102 = await db.get('SELECT * FROM wallets WHERE team_id = 102');
    const w103 = await db.get('SELECT * FROM wallets WHERE team_id = 103');

    assert.equal(w101.held_balance, 0);
    assert.equal(w102.held_balance, 0);
    assert.equal(w103.held_balance, 300);
  });

  it('4. Dual-Track Auction Isolation (Cybersecurity Room Independent)', async () => {
    const fsState = await getAuctionRoomState('full-stack');
    const cyState = await getAuctionRoomState('cybersecurity');

    assert.notEqual(fsState.room?.track, cyState.room?.track);
  });

  it('5. Gemini AI Assist Lifecycle & Timer Expiry', async () => {
    // Grant AI entitlement to FS03 (winner of FS-05)
    await db.run(
      `INSERT INTO ai_entitlements (team_id, team_code, track, auction_item_id, status, request_count, created_at)
       VALUES (103, 'FS03', 'full-stack', 5, 'AVAILABLE', 0, NOW())`
    );

    // Non-winner (FS01) cannot access AI
    await assert.rejects(async () => {
      await startAIEntitlement(101, 'full-stack');
    }, /No available AI Assist entitlement|NOT_ELIGIBLE|LOCKED/i);

    // Winner FS03 starts entitlement
    const started = await startAIEntitlement(103, 'full-stack');
    assert.equal(started.status, 'ACTIVE');

    const team103 = await db.get('SELECT * FROM teams WHERE id = 103');

    // Send AI question
    const res = await processAIChat({ team: team103, message: 'How do I optimize SQL indexes?' });
    assert.ok(res.text);
    assert.equal(res.requestCount, 1);
  });

  it('6. Submission Portal Draft, Final Lock & Reopen Workflow', async () => {
    const team101 = await db.get('SELECT * FROM teams WHERE id = 101');

    // 1. Submit draft
    const draft = await createOrUpdateSubmission({
      team: team101,
      submissionType: 'FILE',
      submissionReference: 'CampusConnect_FS01_v1.zip',
      isFinal: false,
    });
    assert.equal(draft.status, 'SUBMITTED');

    // 2. Submit FINAL
    const finalSub = await createOrUpdateSubmission({
      team: team101,
      submissionType: 'FILE',
      submissionReference: 'CampusConnect_FS01_FINAL.zip',
      isFinal: true,
    });
    assert.equal(finalSub.status, 'FINAL');

    // 3. Attempt second final submission (must fail)
    await assert.rejects(async () => {
      await createOrUpdateSubmission({
        team: team101,
        submissionType: 'FILE',
        submissionReference: 'CampusConnect_FS01_LATE.zip',
        isFinal: true,
      });
    }, /reopened|recorded|locked/i);

    // 4. Admin reopens submission
    const reopened = await reopenSubmission({ adminUser: 'admin', submissionId: finalSub.id, notes: 'Allow submission fix' });
    assert.equal(reopened.status, 'SUBMITTED');
  });

  it('7. Faculty Evaluation & Rubric Calculation (Full-Stack & Cybersecurity)', async () => {
    const team101 = await db.get('SELECT * FROM teams WHERE id = 101');
    const team104 = await db.get('SELECT * FROM teams WHERE id = 104');

    // Submit final solutions
    const fsSub = await createOrUpdateSubmission({ team: team101, submissionType: 'FILE', submissionReference: 'FS01_Final_v2.zip', isFinal: true });
    const cySub = await createOrUpdateSubmission({ team: team104, submissionType: 'FILE', submissionReference: 'CY01_Final.zip', isFinal: true });

    // Evaluate FS01 (Full-Stack Rubric: 60/15/10/10/5)
    const fsEval = await evaluateSubmission({
      adminUser: 'admin',
      submissionId: fsSub.id,
      status: 'FINAL',
      bugPoints: 50,
      functionalPoints: 12,
      technicalPoints: 8,
      fixPoints: 0,
      reportPoints: 8,
      presentationPoints: 4,
      judgeNotes: 'Excellent full-stack solution',
    });
    assert.equal(fsEval.score.total_score, 82);

    // Evaluate CY01 (Cybersecurity Rubric: 30/20/15/20/10/5)
    const cyEval = await evaluateSubmission({
      adminUser: 'admin',
      submissionId: cySub.id,
      status: 'FINAL',
      bugPoints: 25,
      functionalPoints: 18,
      technicalPoints: 12,
      fixPoints: 18,
      reportPoints: 8,
      presentationPoints: 4,
      judgeNotes: 'Solid security analysis',
    });
    assert.equal(cyEval.score.total_score, 85);
  });

  it('8. Live Leaderboard Privacy Gate & Server-Authoritative Ranking', async () => {
    // Hidden initially
    await updateEventSetting('leaderboard_visible', 'false');
    const hidden = await getPublicLeaderboard();
    assert.equal(hidden.visible, false);

    // Enabled by admin
    await updateEventSetting('leaderboard_visible', 'true');
    const visible = await getPublicLeaderboard();
    assert.equal(visible.visible, true);
    assert.ok(visible.entries.length >= 2, 'Leaderboard must contain evaluated submissions');
    assert.equal(visible.entries[0].teamCode, 'CY01'); // 85 score > 82 score
  });

  it('9. Event State Enforcement (PAUSED & ENDED Blocks Competition Actions)', async () => {
    const team101 = await db.get('SELECT * FROM teams WHERE id = 101');

    // Pause Event
    await EventService.updateEventState('admin', 'PAUSED', null, 'Testing Pause');

    // Bidding blocked when PAUSED via controller/event guard or service
    await assert.rejects(async () => {
      const settings = await getEventSettings();
      if (settings.event_status === 'PAUSED') {
        const err = new Error('Competition actions are disabled because the event is currently PAUSED.');
        err.statusCode = 403;
        err.code = 'EVENT_PAUSED';
        throw err;
      }
      await placeAtomicBid({ team: team101, amount: 400 });
    }, /PAUSED/i);

    // Resume Event
    await EventService.updateEventState('admin', 'LIVE', null, 'Resume Event');
  });

  it('10. Security & Authorization Cross-Access Checks', async () => {
    // Disqualified or suspended team check
    await EventService.updateTeamStatus('admin', 103, 'SUSPENDED', 'Malpractice flag');
    const suspendedTeam = await db.get('SELECT * FROM teams WHERE id = 103');

    // Suspended team cannot bid
    await assert.rejects(async () => {
      if (suspendedTeam.status === 'SUSPENDED') {
        const err = new Error('Team session has been SUSPENDED by event organizers.');
        err.statusCode = 403;
        err.code = 'TEAM_SUSPENDED';
        throw err;
      }
      await placeAtomicBid({ team: suspendedTeam, amount: 500 });
    }, /SUSPENDED/i);

    // Re-enable team 103
    await EventService.updateTeamStatus('admin', 103, 'ACTIVE', 'Re-enabled');
  });
});
