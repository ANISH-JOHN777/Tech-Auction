import { query } from '../postgres.js';

export const bidRepository = {
  async getBidsForItem(itemId, limit = 20) {
    const res = await query(
      'SELECT id, amount, team_code, team_name, created_at FROM bids WHERE item_id = $1 ORDER BY id DESC LIMIT $2',
      [itemId, limit]
    );
    return res.rows;
  },

  async recordBid({ roomId, itemId, teamId, teamCode, teamName, amount }, client = null) {
    const q = client ? client.query.bind(client) : query;
    const res = await q(
      `INSERT INTO bids (room_id, item_id, team_id, team_code, team_name, amount, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [roomId, itemId, teamId, teamCode, teamName, amount]
    );
    return res.rows[0];
  },
};
