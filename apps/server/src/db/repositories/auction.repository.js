import { query } from '../postgres.js';

export const auctionRepository = {
  async getRoomByTrack(track) {
    const res = await query('SELECT * FROM auction_rooms WHERE track = $1', [track]);
    return res.rows[0] || null;
  },

  async getItemById(itemId) {
    const res = await query('SELECT * FROM auction_items WHERE id = $1', [itemId]);
    return res.rows[0] || null;
  },

  async getCatalog(track) {
    const res = await query('SELECT * FROM auction_items WHERE track = $1 ORDER BY id ASC', [track]);
    return res.rows;
  },

  async getActiveItems() {
    const res = await query("SELECT * FROM auction_items WHERE status = 'ACTIVE'");
    return res.rows;
  },

  async getNextPendingItem(track) {
    const res = await query("SELECT * FROM auction_items WHERE track = $1 AND status = 'PENDING' ORDER BY id ASC LIMIT 1", [track]);
    return res.rows[0] || null;
  },

  async createItem(data) {
    const res = await query(
      `INSERT INTO auction_items (track, item_code, name, description, item_type, starting_price, minimum_increment, duration_seconds, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')
       RETURNING *`,
      [
        data.track,
        data.item_code.trim().toUpperCase(),
        data.name.trim(),
        data.description || '',
        data.item_type || 'HINT',
        Number(data.starting_price) || 100,
        Number(data.minimum_increment) || 25,
        Number(data.duration_seconds) || 60,
      ]
    );
    return res.rows[0];
  },

  async updateItem(id, updates) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return await this.getItemById(id);

    const setClauses = [];
    const params = [];
    let idx = 1;

    for (const key of keys) {
      setClauses.push(`${key} = $${idx++}`);
      params.push(updates[key]);
    }
    params.push(id);

    const res = await query(
      `UPDATE auction_items SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return res.rows[0] || null;
  },

  async updateRoomStatus(track, status, currentItemId = null) {
    const res = await query(
      'UPDATE auction_rooms SET status = $1, current_item_id = $2 WHERE track = $3 RETURNING *',
      [status, currentItemId, track]
    );
    return res.rows[0] || null;
  },

  async getWinners() {
    const res = await query(`
      SELECT w.id, w.winning_bid, w.created_at, i.item_code, i.name as item_name, i.track, t.name as team_name, t.code as team_code
      FROM auction_winners w
      JOIN auction_items i ON w.item_id = i.id
      JOIN teams t ON w.team_id = t.id
      ORDER BY w.id DESC
    `);
    return res.rows;
  },
};
