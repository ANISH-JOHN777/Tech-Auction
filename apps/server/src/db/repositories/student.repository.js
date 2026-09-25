import crypto from 'crypto';
import { query } from '../postgres.js';

const DEFAULT_SALT = 'tech_auction_student_salt_2026';

export function hashPin(pin, salt = DEFAULT_SALT) {
  if (!pin) return '';
  return crypto.pbkdf2Sync(pin.toString(), salt, 10000, 64, 'sha512').toString('hex');
}

export function verifyPin(pin, pinHash, salt = DEFAULT_SALT) {
  if (!pin || !pinHash) return false;
  const computedHash = hashPin(pin, salt);
  const hashBuffer = Buffer.from(computedHash, 'hex');
  const targetBuffer = Buffer.from(pinHash, 'hex');
  if (hashBuffer.length !== targetBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, targetBuffer);
}

export const studentRepository = {
  async findByCode(code) {
    if (!code) return null;
    const res = await query('SELECT * FROM students WHERE student_code = $1', [code.trim().toUpperCase()]);
    return res.rows[0] || null;
  },

  async findById(id) {
    if (!id) return null;
    const res = await query('SELECT * FROM students WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  async createStudent({ studentCode, pin, name, teamId = null }) {
    const code = studentCode.trim().toUpperCase();
    const pinHash = hashPin(pin || '1234');
    const studentName = name || `Student ${code}`;
    const res = await query(
      `INSERT INTO students (student_code, pin_hash, name, team_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (student_code) DO UPDATE
       SET name = EXCLUDED.name, pin_hash = EXCLUDED.pin_hash, updated_at = NOW()
       RETURNING *`,
      [code, pinHash, studentName, teamId]
    );
    return res.rows[0];
  },

  async assignTeam(studentId, teamId) {
    const res = await query(
      'UPDATE students SET team_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [teamId, studentId]
    );
    return res.rows[0] || null;
  },

  async findMembersByTeamId(teamId) {
    const res = await query('SELECT id, student_code, name, created_at FROM students WHERE team_id = $1 ORDER BY id ASC', [teamId]);
    return res.rows;
  },

  async countMembersByTeamId(teamId) {
    const res = await query('SELECT COUNT(*)::int as count FROM students WHERE team_id = $1', [teamId]);
    return res.rows[0].count;
  },

  async count() {
    const res = await query('SELECT COUNT(*)::int as count FROM students');
    return res.rows[0].count;
  },
};
