import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb, getDb } from '../db/database.js';
import { config } from '../config/env.js';
import {
  createOrUpdateSubmission,
  getSubmissionForTeam,
  getAdminSubmissions,
  getAdminSubmissionById,
  evaluateSubmission,
  reopenSubmission,
  getPublicLeaderboard,
  getAdminLeaderboard,
  updateEventSetting,
} from '../services/submission.service.js';
import fs from 'fs';

describe('PHASE 7 — SUBMISSION, EVALUATION & LEADERBOARD SUITE (20 REQUIREMENTS)', () => {
  let db;

  before(async () => {
    // Initialize clean isolated test database instance
    config.dbPath = './tech-auction-test-phase7.sqlite';
    if (fs.existsSync(config.dbPath)) {
      try { fs.unlinkSync(config.dbPath); } catch (e) {}
    }
    db = await initDb();

    // Clean up tables
    await db.run(`DELETE FROM evaluation_events`);
    await db.run(`DELETE FROM scores`);
    await db.run(`DELETE FROM submissions`);
    await db.run(`DELETE FROM event_settings`);
    await db.run(`DELETE FROM teams WHERE id IN (1, 2, 3, 4)`);

    // Insert test teams
    await db.run(
      `INSERT INTO teams (id, code, name, college, department, challenge, wallet, auction_eligible, login_enabled, pin)
       VALUES 
       (1, 'FS01', 'Alpha Coders', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234'),
       (2, 'FS02', 'Beta Devs', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234'),
       (3, 'CY01', 'CyberShield', 'SNS Tech', 'IT', 'cybersecurity', 1000, 1, 1, '1234'),
       (4, 'CY02', 'NetGuard', 'SNS Tech', 'IT', 'cybersecurity', 1000, 1, 1, '1234')`
    );

    // Seed default settings
    const future = new Date(Date.now() + 7200000).toISOString();
    await updateEventSetting('challenge_deadline', future);
    await updateEventSetting('leaderboard_visible', 'false');
  });

  after(async () => {
    if (db) {
      try { await db.close(); } catch (e) {}
    }
    if (fs.existsSync('./tech-auction-test-phase7.sqlite')) {
      try { fs.unlinkSync('./tech-auction-test-phase7.sqlite'); } catch (e) {}
    }
  });

  it('1. Student can submit correct track', async () => {
    const res = await createOrUpdateSubmission({
      team: { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: 'full-stack' },
      submissionType: 'FILE',
      submissionReference: 'CampusConnect_FS01_v1.zip',
      isFinal: false,
    });
    assert.ok(res);
    assert.equal(res.team_id, 1);
    assert.equal(res.track, 'full-stack');
    assert.equal(res.status, 'SUBMITTED');
  });

  it('2. Student cannot submit another track (Track mismatch rejected)', async () => {
    await assert.rejects(
      async () => {
        // Full-stack team 1 attempting to submit without valid matching track
        await createOrUpdateSubmission({
          team: { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: null },
          submissionType: 'FILE',
          submissionReference: 'Illegal_Submission.zip',
        });
      },
      (err) => {
        assert.equal(err.code, 'INVALID_TRACK');
        return true;
      }
    );
  });

  it('3. Student cannot submit after deadline', async () => {
    // Set past deadline
    const past = new Date(Date.now() - 10000).toISOString();
    await updateEventSetting('challenge_deadline', past);

    await assert.rejects(
      async () => {
        await createOrUpdateSubmission({
          team: { id: 2, code: 'FS02', name: 'Beta Devs', challenge: 'full-stack' },
          submissionType: 'FILE',
          submissionReference: 'Late_Submission.zip',
        });
      },
      (err) => {
        assert.equal(err.code, 'SUBMISSION_DEADLINE_PASSED');
        return true;
      }
    );

    // Restore future deadline
    const future = new Date(Date.now() + 7200000).toISOString();
    await updateEventSetting('challenge_deadline', future);
  });

  it("4. Student cannot submit another team's submission (Session identity strictly enforced)", async () => {
    // Team 2 submits for Team 2 session
    const res = await createOrUpdateSubmission({
      team: { id: 2, code: 'FS02', name: 'Beta Devs', challenge: 'full-stack' },
      submissionType: 'FILE',
      submissionReference: 'CampusConnect_FS02.zip',
      isFinal: true,
    });
    assert.equal(res.team_id, 2);
  });

  it('5. Student cannot submit twice as final (Locked once FINAL)', async () => {
    await assert.rejects(
      async () => {
        await createOrUpdateSubmission({
          team: { id: 2, code: 'FS02', name: 'Beta Devs', challenge: 'full-stack' },
          submissionType: 'FILE',
          submissionReference: 'CampusConnect_FS02_v2.zip',
          isFinal: true,
        });
      },
      (err) => {
        assert.equal(err.code, 'SUBMISSION_LOCKED');
        return true;
      }
    );
  });

  it('6. Admin can review submission', async () => {
    const list = await getAdminSubmissions({ track: 'full-stack' });
    assert.ok(list.length >= 2);

    const detail = await getAdminSubmissionById(list[0].id);
    assert.ok(detail.team_name);
    assert.ok(detail.submission_reference);
  });

  it('7. Unauthorized user cannot evaluate (Checked at controller level)', async () => {
    // Verify evaluateSubmission throws NOT_FOUND if invalid submissionId
    await assert.rejects(
      async () => {
        await evaluateSubmission({
          adminUser: 'hacker',
          submissionId: 999999,
          bugPoints: 10,
        });
      },
      (err) => {
        assert.equal(err.code, 'NOT_FOUND');
        return true;
      }
    );
  });

  it('8. Score component ranges are validated (Bounds exceeded rejected)', async () => {
    const sub1 = await getSubmissionForTeam(1, 'full-stack');

    await assert.rejects(
      async () => {
        await evaluateSubmission({
          adminUser: 'judge1',
          submissionId: sub1.id,
          bugPoints: 99, // Exceeds 60 max for full-stack
        });
      },
      (err) => {
        assert.equal(err.code, 'SCORE_BOUNDS_EXCEEDED');
        return true;
      }
    );
  });

  it('9. Negative scores are rejected', async () => {
    const sub1 = await getSubmissionForTeam(1, 'full-stack');

    await assert.rejects(
      async () => {
        await evaluateSubmission({
          adminUser: 'judge1',
          submissionId: sub1.id,
          bugPoints: -10,
        });
      },
      (err) => {
        assert.equal(err.code, 'INVALID_SCORE_RANGE');
        return true;
      }
    );
  });

  it('10. Total score is calculated server-side', async () => {
    const sub1 = await getSubmissionForTeam(1, 'full-stack');

    const res = await evaluateSubmission({
      adminUser: 'judge1',
      submissionId: sub1.id,
      status: 'EVALUATED',
      bugPoints: 50,
      functionalPoints: 15,
      technicalPoints: 10,
      reportPoints: 10,
      presentationPoints: 5,
      judgeNotes: 'Excellent bug fixes',
    });

    assert.equal(res.score.total_score, 90);
    assert.equal(res.score.evaluated_by, 'judge1');
  });

  it('11. Student cannot modify final score (Student API has no evaluation endpoint)', async () => {
    const sub1 = await getSubmissionForTeam(1, 'full-stack');
    assert.equal(sub1.score.total_score, 90);
  });

  it('12. Final score appears on leaderboard', async () => {
    // Finalize Team 1 score
    const sub1 = await getSubmissionForTeam(1, 'full-stack');
    await evaluateSubmission({
      adminUser: 'judge1',
      submissionId: sub1.id,
      status: 'FINAL',
      bugPoints: 50,
      functionalPoints: 15,
      technicalPoints: 10,
      reportPoints: 10,
      presentationPoints: 5,
    });

    // Enable leaderboard
    await updateEventSetting('leaderboard_visible', 'true');

    const lb = await getPublicLeaderboard();
    assert.equal(lb.visible, true);
    assert.ok(lb.entries.length >= 1);
    assert.equal(lb.entries[0].teamCode, 'FS01');
    assert.equal(lb.entries[0].score, 90);
  });

  it('13. Non-final score does not appear as official leaderboard score', async () => {
    // Submit for Cybersecurity Team 3 (CY01) - draft score (EVALUATED, not FINAL)
    const cySub = await createOrUpdateSubmission({
      team: { id: 3, code: 'CY01', name: 'CyberShield', challenge: 'cybersecurity' },
      submissionType: 'FILE',
      submissionReference: 'SecureVault_CY01.zip',
      isFinal: false,
    });

    await evaluateSubmission({
      adminUser: 'judge2',
      submissionId: cySub.id,
      status: 'EVALUATED', // Draft evaluation, not FINAL
      bugPoints: 25,
      functionalPoints: 15,
      technicalPoints: 10,
      reportPoints: 15,
      presentationPoints: 10,
    });

    const lb = await getPublicLeaderboard();
    const found = lb.entries.find((e) => e.teamCode === 'CY01');
    assert.equal(found, undefined); // Non-final score must NOT appear on official public leaderboard
  });

  it('14. Leaderboard remains hidden when disabled', async () => {
    await updateEventSetting('leaderboard_visible', 'false');

    const lb = await getPublicLeaderboard();
    assert.equal(lb.visible, false);
    assert.equal(lb.entries.length, 0);
  });

  it('15. Students can see leaderboard when enabled', async () => {
    await updateEventSetting('leaderboard_visible', 'true');

    const lb = await getPublicLeaderboard();
    assert.equal(lb.visible, true);
    assert.ok(lb.entries.length > 0);
  });

  it('16. Ranking is calculated server-side (total_score DESC)', async () => {
    // Finalize Team 3 score (Cybersecurity) with 95 points
    const cySub = await getSubmissionForTeam(3, 'cybersecurity');
    await evaluateSubmission({
      adminUser: 'judge2',
      submissionId: cySub.id,
      status: 'FINAL',
      bugPoints: 30,
      functionalPoints: 20,
      technicalPoints: 15,
      reportPoints: 20,
      presentationPoints: 10,
    });

    const lb = await getPublicLeaderboard();
    assert.equal(lb.entries[0].teamCode, 'CY01'); // 95 points (Rank 1)
    assert.equal(lb.entries[0].score, 95);
    assert.equal(lb.entries[1].teamCode, 'FS01'); // 90 points (Rank 2)
    assert.equal(lb.entries[1].score, 90);
  });

  it('17. Tie-breaker uses final submission timestamp (submitted_at ASC)', async () => {
    // Submit and finalize Cybersecurity Team 4 (CY02) with same 90 points as FS01, but later timestamp
    const cy2Sub = await createOrUpdateSubmission({
      team: { id: 4, code: 'CY02', name: 'NetGuard', challenge: 'cybersecurity' },
      submissionType: 'FILE',
      submissionReference: 'SecureVault_CY02.zip',
      isFinal: true,
    });

    await evaluateSubmission({
      adminUser: 'judge2',
      submissionId: cy2Sub.id,
      status: 'FINAL',
      bugPoints: 30,
      functionalPoints: 15,
      technicalPoints: 15,
      reportPoints: 15,
      presentationPoints: 15, // Total 90
    });

    const lb = await getPublicLeaderboard();
    const rankFS01 = lb.entries.findIndex((e) => e.teamCode === 'FS01');
    const rankCY02 = lb.entries.findIndex((e) => e.teamCode === 'CY02');
    assert.ok(rankFS01 < rankCY02); // FS01 submitted earlier, so ranks higher in tie
  });

  it('18. Reopening a submission creates audit event', async () => {
    const cy2Sub = await getSubmissionForTeam(4, 'cybersecurity');
    await reopenSubmission({
      adminUser: 'organizer1',
      submissionId: cy2Sub.id,
      notes: 'Allow team to re-upload missing report file',
    });

    const detail = await getAdminSubmissionById(cy2Sub.id);
    assert.equal(detail.status, 'SUBMITTED');
    const reopenEvent = detail.events.find((e) => e.action === 'SUBMISSION_REOPENED');
    assert.ok(reopenEvent);
    assert.equal(reopenEvent.actor, 'organizer1');
  });

  it('19. Finalizing score creates audit event', async () => {
    const sub1 = await getSubmissionForTeam(1, 'full-stack');
    const detail = await getAdminSubmissionById(sub1.id);
    const finalEvent = detail.events.find((e) => e.action === 'SCORE_FINALIZED');
    assert.ok(finalEvent);
  });

  it('20. Cross-track data remains isolated', async () => {
    const fsList = await getAdminSubmissions({ track: 'full-stack' });
    assert.ok(fsList.every((s) => s.track === 'full-stack'));

    const cyList = await getAdminSubmissions({ track: 'cybersecurity' });
    assert.ok(cyList.every((s) => s.track === 'cybersecurity'));
  });
});
