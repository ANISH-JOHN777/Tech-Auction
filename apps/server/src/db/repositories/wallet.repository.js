import { query } from '../postgres.js';

export const walletRepository = {
  async findByTeamId(teamId) {
    const res = await query('SELECT * FROM wallets WHERE team_id = $1', [teamId]);
    return res.rows[0] || null;
  },

  async createWallet(teamId, balance = 1000) {
    const now = new Date().toISOString();
    const res = await query(
      'INSERT INTO wallets (team_id, balance, held_balance, updated_at) VALUES ($1, $2, 0, $3) RETURNING *',
      [teamId, balance, now]
    );
    await query(
      `INSERT INTO wallet_transactions (team_id, amount, type, description, created_at) VALUES ($1, $2, 'INITIAL_BALANCE', 'Default starting auction credits', $3)`,
      [teamId, balance, now]
    );
    return res.rows[0];
  },

  async getTransactions(teamId) {
    const res = await query('SELECT * FROM wallet_transactions WHERE team_id = $1 ORDER BY id DESC', [teamId]);
    return res.rows;
  },

  async recordTransaction({ teamId, amount, type, description, referenceId = null, client = null }) {
    const q = client ? client.query.bind(client) : query;
    const res = await q(
      `INSERT INTO wallet_transactions (team_id, amount, type, description, reference_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [teamId, amount, type, description, referenceId ? referenceId.toString() : null]
    );
    return res.rows[0];
  },

  async adjustBalance({ teamId, amount, description }) {
    const now = new Date().toISOString();
    const res = await query(
      'UPDATE wallets SET balance = balance + $1, updated_at = $2 WHERE team_id = $3 RETURNING *',
      [amount, now, teamId]
    );
    await query(
      `INSERT INTO wallet_transactions (team_id, amount, type, description, created_at)
       VALUES ($1, $2, 'ADMIN_ADJUSTMENT', $3, $4)`,
      [teamId, amount, description || 'Admin balance adjustment', now]
    );
    return res.rows[0];
  },
};
