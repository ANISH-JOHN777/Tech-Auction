import test from 'node:test';
import assert from 'node:assert/strict';
import { runMigrations } from '../db/migrate.js';
import { ensureStudentPool, seedDemoData } from '../db/seed.js';
import { studentRepository, hashPin, verifyPin } from '../db/repositories/student.repository.js';
import { teamRepository } from '../db/repositories/team.repository.js';
import { query } from '../db/postgres.js';

test('PHASE 1 — STUDENT ACCOUNT POOL & SELF-FORMATION DATABASE SUITE', async (t) => {
  await t.test('1. 005 migration applies successfully', async () => {
    await runMigrations();
    const res = await query("SELECT version FROM schema_migrations WHERE version = '005_student_self_formation.sql'");
    assert.equal(res.rows.length, 1, 'Migration 005 must be recorded in schema_migrations');
  });

  await t.test('2. Migration is idempotent', async () => {
    // Running migrations a second time should complete with zero errors
    await assert.doesNotReject(async () => {
      await runMigrations();
    }, 'Re-running runMigrations() must be idempotent');
  });

  await t.test('3. 40 student accounts can be seeded and ensureStudentPool is idempotent', async () => {
    await seedDemoData();
    const count = await studentRepository.count();
    assert.equal(count, 40, 'Database must contain exactly 40 student accounts');

    // Re-run ensureStudentPool to verify idempotency
    await ensureStudentPool();
    const countAfter = await studentRepository.count();
    assert.equal(countAfter, 40, 'Re-running ensureStudentPool must not duplicate accounts');
  });

  await t.test('4. STU001-STU040 student codes are unique and present', async () => {
    for (let i = 1; i <= 40; i++) {
      const code = `STU${i.toString().padStart(3, '0')}`;
      const student = await studentRepository.findByCode(code);
      assert.ok(student, `Student ${code} must exist in database`);
      assert.equal(student.student_code, code, `Student code must match ${code}`);
    }
  });

  await t.test('5. Student PINs are stored hashed, not in plaintext', async () => {
    const student = await studentRepository.findByCode('STU001');
    assert.ok(student.pin_hash, 'pin_hash column must be populated');
    assert.notEqual(student.pin_hash, '1234', 'PIN must not be stored as plaintext');
    assert.equal(student.pin_hash.length, 128, 'SHA-512 hex hash should be 128 characters long');
    assert.ok(verifyPin('1234', student.pin_hash), 'verifyPin must match raw PIN against stored hash');
  });

  await t.test('6. Duplicate student_code is rejected or handled by UNIQUE constraint', async () => {
    await assert.rejects(async () => {
      await query(
        "INSERT INTO students (student_code, pin_hash, name) VALUES ('STU001', 'hash', 'Duplicate')"
      );
    }, /unique constraint|duplicate key/i, 'Database must enforce UNIQUE constraint on student_code');
  });

  await t.test('7. Student team_id can be NULL', async () => {
    const student = await studentRepository.findByCode('STU001');
    assert.equal(student.team_id, null, 'Unassigned student team_id must default to NULL');
  });

  await t.test('8. Student can reference an existing team', async () => {
    const team = await teamRepository.findByCode('FS01');
    assert.ok(team, 'Demo team FS01 should exist');

    const updated = await studentRepository.assignTeam(1, team.id);
    assert.equal(updated.team_id, team.id, 'Student must be successfully linked to existing team ID');
  });

  await t.test('9. Existing team_members table remains intact', async () => {
    const team = await teamRepository.findByCode('FS01');
    const members = await teamRepository.getMembers(team.id);
    assert.ok(members.length > 0, 'team_members records must still exist');
    assert.equal(members[0].name, 'Alex Rivera', 'Existing team member details preserved');
  });

  await t.test('10. Existing teams and normalized team-name index remain intact', async () => {
    const teams = await teamRepository.findAll();
    assert.ok(teams.length >= 6, 'Demo teams must remain intact in database');

    // Verify case-insensitive unique index works on teams
    await assert.rejects(async () => {
      await query(
        "INSERT INTO teams (code, name) VALUES ('DUP01', '  code warriors  ')"
      );
    }, /unique constraint|duplicate key|idx_teams_normalized_name/i, 'Unique index on LOWER(TRIM(name)) must prevent case/whitespace duplicate team names');
  });

  await t.test('11. Sessions table with optional student_id column remains functional', async () => {
    const sessionRes = await query(`
      INSERT INTO sessions (token, team_code, user_type, expires_at)
      VALUES ('test_token_phase1', 'FS01', 'student', NOW() + INTERVAL '1 hour')
      RETURNING *
    `);
    assert.ok(sessionRes.rows[0].token, 'sessions insert must succeed');
    assert.equal(sessionRes.rows[0].student_id, null, 'student_id in sessions defaults to NULL for legacy sessions');
  });
});
