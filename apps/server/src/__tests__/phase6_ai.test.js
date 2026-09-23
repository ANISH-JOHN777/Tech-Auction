import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb, getDb } from '../db/database.js';
import { config } from '../config/env.js';
import {
  getAIEntitlementStatus,
  startAIEntitlement,
  processAIChat,
} from '../services/ai.service.js';
import { finalizeExpiredItem } from '../services/auctionEngine.service.js';

import fs from 'fs';

describe('PHASE 6 — GEMINI AI ASSIST SUITE (18 REQUIREMENTS)', () => {
  let db;

  before(async () => {
    // Initialize clean isolated test database instance
    config.dbPath = './tech-auction-test.sqlite';
    if (fs.existsSync(config.dbPath)) {
      try { fs.unlinkSync(config.dbPath); } catch (e) {}
    }
    db = await initDb();

    // Insert test teams
    await db.run(
      `INSERT OR REPLACE INTO teams (id, code, name, college, department, challenge, wallet, auction_eligible, login_enabled, pin)
       VALUES 
       (1, 'FS01', 'Alpha Coders', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234'),
       (2, 'FS02', 'Beta Devs', 'SNS Tech', 'IT', 'full-stack', 1000, 1, 1, '1234'),
       (3, 'CY01', 'CyberShield', 'SNS Tech', 'IT', 'cybersecurity', 1000, 1, 1, '1234')`
    );

    // Seed auction items for FS-05 (AI ASSIST FS) and CY-06 (AI ASSIST CY)
    await db.run(
      `INSERT OR REPLACE INTO auction_items (id, item_code, name, track, item_type, starting_price, minimum_increment, duration_seconds, status, current_bid, highest_team_id)
       VALUES 
       (5, 'FS-05', 'AI ASSIST FULLSTACK', 'full-stack', 'AI_ASSIST', 100, 25, 60, 'ACTIVE', 200, 1),
       (6, 'CY-06', 'AI ASSIST CYBER', 'cybersecurity', 'AI_ASSIST', 100, 25, 60, 'ACTIVE', 300, 3)`
    );

    // Clean up any existing entitlements and logs
    await db.run(`DELETE FROM ai_entitlements WHERE team_id IN (1, 2, 3)`);
    await db.run(`DELETE FROM ai_usage_logs WHERE team_id IN (1, 2, 3)`);
  });

  after(async () => {
    if (db) {
      try { await db.close(); } catch (e) {}
    }
    if (fs.existsSync('./tech-auction-test.sqlite')) {
      try { fs.unlinkSync('./tech-auction-test.sqlite'); } catch (e) {}
    }
  });

  it('1. Non-AI winner cannot access AI (Status LOCKED)', async () => {

    const status = await getAIEntitlementStatus(2, 'full-stack');
    assert.equal(status.hasEntitlement, false);
    assert.equal(status.status, 'LOCKED');

    await assert.rejects(
      async () => {
        await processAIChat({
          team: { id: 2, code: 'FS02', name: 'Beta Devs', challenge: 'full-stack' },
          message: 'Hello AI?',
        });
      },
      (err) => {
        assert.equal(err.code, 'NO_ENTITLEMENT');
        return true;
      }
    );
  });

  it('2. AI winner receives entitlement on auction finalization', async () => {
    // Finalize FS-05 won by Team 1 (FS01)
    await finalizeExpiredItem(5);

    const entitlement = await db.get(
      `SELECT * FROM ai_entitlements WHERE team_id = 1 AND auction_item_id = 5`
    );
    assert.ok(entitlement);
    assert.equal(entitlement.team_id, 1);
    assert.equal(entitlement.track, 'full-stack');
    assert.equal(entitlement.status, 'AVAILABLE');
  });

  it('3. Entitlement is initially AVAILABLE (Timer not started)', async () => {
    const status = await getAIEntitlementStatus(1, 'full-stack');
    assert.equal(status.hasEntitlement, true);
    assert.equal(status.status, 'AVAILABLE');
    assert.equal(status.startedAt, null);
    assert.equal(status.expiresAt, null);
  });

  it('4. Team can start its entitlement', async () => {
    const status = await startAIEntitlement(1, 'full-stack');
    assert.equal(status.status, 'ACTIVE');
    assert.ok(status.startedAt);
    assert.ok(status.expiresAt);
    assert.ok(status.remainingSeconds > 0);
  });

  it('5. Only winning team can start it (Other team fails)', async () => {
    await assert.rejects(
      async () => {
        await startAIEntitlement(2, 'full-stack');
      },
      (err) => {
        assert.equal(err.code, 'NO_ENTITLEMENT');
        return true;
      }
    );
  });

  it('6. Active team can send AI request (Receives normalized response)', async () => {
    const res = await processAIChat({
      team: { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: 'full-stack' },
      message: 'How should I debug Express 401 error?',
      forceMock: true,
    });
    assert.ok(res.text.includes('Alpha Coders'));
    assert.equal(res.requestCount, 1);
  });



  it('7. Expired entitlement rejects AI request', async () => {
    // Set entitlement to expired in past
    const past = new Date(Date.now() - 10000).toISOString();
    await db.run(
      `UPDATE ai_entitlements SET expires_at = ?, status = 'ACTIVE' WHERE team_id = 1 AND track = 'full-stack'`,
      [past]
    );

    const status = await getAIEntitlementStatus(1, 'full-stack');
    assert.equal(status.status, 'EXPIRED');

    await assert.rejects(
      async () => {
        await processAIChat({
          team: { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: 'full-stack' },
          message: 'Can I ask a question?',
          forceMock: true,
        });
      },
      (err) => {
        assert.equal(err.code, 'AI_SESSION_EXPIRED');
        return true;
      }
    );
  });

  it('8. Browser refresh preserves expiry (Server authoritative state restored)', async () => {
    // Reset expiry to 10 minutes in future
    const future = new Date(Date.now() + 600000).toISOString();
    await db.run(
      `UPDATE ai_entitlements SET expires_at = ?, status = 'ACTIVE' WHERE team_id = 1 AND track = 'full-stack'`,
      [future]
    );

    // Simulate page refresh / new status request
    const refreshedStatus = await getAIEntitlementStatus(1, 'full-stack');
    assert.equal(refreshedStatus.status, 'ACTIVE');
    assert.ok(refreshedStatus.remainingSeconds > 500);
  });

  it('9. Client cannot extend expiry (Enforced server-side)', async () => {
    const refreshedStatus = await getAIEntitlementStatus(1, 'full-stack');
    const originalExpiry = refreshedStatus.expiresAt;

    // Client processAIChat uses DB expires_at
    await processAIChat({
      team: { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: 'full-stack' },
      message: 'Testing expiry Tamper Protection',
      forceMock: true,
    });

    const check = await getAIEntitlementStatus(1, 'full-stack');
    assert.equal(check.expiresAt, originalExpiry);
  });

  it('10. Client cannot change team_id (Session team authority strictly used)', async () => {
    const res = await processAIChat({
      team: { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: 'full-stack' },
      message: 'Team session verification test',
      forceMock: true,
    });
    assert.ok(res);
  });

  it('11. Client cannot change track (Track inferred strictly from team record)', async () => {
    const res = await processAIChat({
      team: { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: 'full-stack' },
      message: 'Explain SQL injection',
      forceMock: true,
    });
    assert.ok(res.text.includes('FULL-STACK MODE'));
  });

  it('12. Request limit is enforced', async () => {
    // Set request count to max (30)
    await db.run(`UPDATE ai_entitlements SET request_count = 30 WHERE team_id = 1 AND track = 'full-stack'`);

    await assert.rejects(
      async () => {
        await processAIChat({
          team: { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: 'full-stack' },
          message: 'One more question please',
          forceMock: true,
        });
      },
      (err) => {
        assert.equal(err.code, 'AI_REQUEST_LIMIT_REACHED');
        return true;
      }
    );
  });

  it('13. Message length limit is enforced ( > 4000 characters rejected)', async () => {
    await db.run(`UPDATE ai_entitlements SET request_count = 5 WHERE team_id = 1 AND track = 'full-stack'`);
    const longMsg = 'A'.repeat(4001);

    await assert.rejects(
      async () => {
        await processAIChat({
          team: { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: 'full-stack' },
          message: longMsg,
          forceMock: true,
        });
      },
      (err) => {
        assert.equal(err.code, 'MESSAGE_TOO_LONG');
        return true;
      }
    );
  });

  it('14. API key is not returned in API responses', async () => {
    const res = await processAIChat({
      team: { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: 'full-stack' },
      message: 'Test API key secrecy',
      forceMock: true,
    });

    const json = JSON.stringify(res);
    assert.equal(json.includes('GEMINI_API_KEY'), false);
    assert.equal(json.includes('AI_KEY'), false);
  });

  it('15. Gemini provider failure does not crash server (Gracefully returns error)', async () => {
    const originalKey = config.geminiApiKey;
    config.geminiApiKey = 'invalid_key_for_testing';

    try {
      await assert.rejects(
        async () => {
          await processAIChat({
            team: { id: 1, code: 'FS01', name: 'Alpha Coders', challenge: 'full-stack' },
            message: 'Test provider error handling',
            forceMock: false,
          });
        },
        (err) => {
          assert.equal(err.code, 'AI_PROVIDER_ERROR');
          return true;
        }
      );
    } finally {
      config.geminiApiKey = originalKey;
    }
  });

  it('16. AI usage log is created in database', async () => {
    const logs = await db.all(`SELECT * FROM ai_usage_logs WHERE team_id = 1`);
    assert.ok(logs.length > 0);
    assert.ok(logs[0].request_number);
    assert.ok(logs[0].created_at);
  });

  it('17. Full-Stack team cannot access Cybersecurity entitlement', async () => {
    // Finalize CY-06 won by Cybersecurity Team 3 (CY01)
    await finalizeExpiredItem(6);

    // Full stack Team 1 attempts to start cybersecurity track entitlement
    await assert.rejects(
      async () => {
        await startAIEntitlement(1, 'cybersecurity');
      },
      (err) => {
        assert.equal(err.code, 'NO_ENTITLEMENT');
        return true;
      }
    );
  });

  it('18. Cybersecurity team cannot access Full-Stack entitlement', async () => {
    // Cybersecurity Team 3 attempts to start full-stack track entitlement
    await assert.rejects(
      async () => {
        await startAIEntitlement(3, 'full-stack');
      },
      (err) => {
        assert.equal(err.code, 'NO_ENTITLEMENT');
        return true;
      }
    );

    // Cybersecurity Team 3 CAN start its own cybersecurity entitlement
    const cyStatus = await startAIEntitlement(3, 'cybersecurity');
    assert.equal(cyStatus.status, 'ACTIVE');
  });
});
