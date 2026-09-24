import { query } from '../postgres.js';

export const teamRepository = {
  async findById(id) {
    const res = await query('SELECT * FROM teams WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  async findByCode(code) {
    if (!code) return null;
    const res = await query('SELECT * FROM teams WHERE code = $1', [code.trim().toUpperCase()]);
    return res.rows[0] || null;
  },

  async findByName(name) {
    if (!name) return null;
    const res = await query('SELECT * FROM teams WHERE LOWER(name) = LOWER($1)', [name.trim()]);
    return res.rows[0] || null;
  },

  async getMembers(teamId) {
    const res = await query('SELECT id, name, email, phone, role FROM team_members WHERE team_id = $1', [teamId]);
    return res.rows;
  },

  async createTeam(data) {
    const now = new Date().toISOString();
    const res = await query(
      `INSERT INTO teams (code, name, pin, college, department, challenge, wallet, auction_eligible, login_enabled, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
       RETURNING *`,
      [
        data.code,
        data.name,
        data.pin || '1234',
        data.college || 'SNS College of Technology',
        data.department || 'Department of IT',
        data.challenge || null,
        data.wallet !== undefined ? data.wallet : 1000,
        data.auction_eligible !== undefined ? (data.auction_eligible ? 1 : 0) : 0,
        data.login_enabled !== undefined ? (data.login_enabled ? 1 : 0) : 1,
        data.status || 'ACTIVE',
        now,
      ]
    );
    return res.rows[0];
  },

  async addMember(teamId, memberData) {
    const res = await query(
      `INSERT INTO team_members (team_id, name, email, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [teamId, memberData.name, memberData.email || '', memberData.phone || '', memberData.role || 'Member']
    );
    return res.rows[0];
  },

  async updateTeam(id, updates) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return await this.findById(id);

    const setClauses = [];
    const params = [];
    let idx = 1;

    for (const key of keys) {
      setClauses.push(`${key} = $${idx++}`);
      params.push(updates[key]);
    }

    setClauses.push(`updated_at = $${idx++}`);
    params.push(new Date().toISOString());
    params.push(id);

    const res = await query(
      `UPDATE teams SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return res.rows[0] || null;
  },

  async updateChallenge(code, challenge) {
    const res = await query(
      'UPDATE teams SET challenge = $1, updated_at = NOW() WHERE code = $2 RETURNING *',
      [challenge, code]
    );
    return res.rows[0] || null;
  },

  async findAll({ search, challenge } = {}) {
    let sql = 'SELECT * FROM teams WHERE 1=1';
    const params = [];
    let idx = 1;

    if (search) {
      sql += ` AND (code ILIKE $${idx} OR name ILIKE $${idx} OR college ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    if (challenge && ['full-stack', 'cybersecurity'].includes(challenge)) {
      sql += ` AND challenge = $${idx}`;
      params.push(challenge);
      idx++;
    }

    sql += ' ORDER BY id ASC';
    const res = await query(sql, params);
    return res.rows;
  },

  async count() {
    const res = await query('SELECT COUNT(*)::int as count FROM teams');
    return res.rows[0].count;
  },
};
