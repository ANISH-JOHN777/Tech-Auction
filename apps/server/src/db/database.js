import { query, getClient, checkHealth } from './postgres.js';
import { runMigrations } from './migrate.js';
import { seedDemoData } from './seed.js';

let initialized = false;

export async function initDb() {
  if (!initialized) {
    await runMigrations();
    try {
      const checkTeams = await query("SELECT COUNT(*)::int as count FROM teams");
      const isTest = process.env.NODE_ENV === 'test' || process.argv.some((arg) => arg.includes('test'));
      if (!isTest && checkTeams.rows[0].count === 0) {
        console.log('[DB] Seeding default demo data & catalog...');
        await seedDemoData();
      }
    } catch (e) {
      console.warn('[DB SEED CHECK WARNING]', e.message);
    }
    initialized = true;
  }
  return getDb();
}

export function getDb() {
  return {
    async get(sql, params = []) {
      const res = await query(sql, params);
      return res.rows[0] || null;
    },
    async all(sql, params = []) {
      const res = await query(sql, params);
      return res.rows;
    },
    async run(sql, params = []) {
      // If query does not include RETURNING id, append RETURNING id for INSERT queries if appropriate
      let targetSql = sql;
      if (sql.trim().toUpperCase().startsWith('INSERT INTO') && !sql.toUpperCase().includes('RETURNING')) {
        targetSql = `${sql} RETURNING id`;
      }
      const res = await query(targetSql, params);
      return {
        lastID: res.rows[0]?.id || 0,
        changes: res.rowCount,
        rowCount: res.rowCount,
        rows: res.rows,
      };
    },
    async exec(sql) {
      if (sql.trim().toUpperCase() === 'BEGIN IMMEDIATE' || sql.trim().toUpperCase() === 'BEGIN') {
        return; // Handled transactionally inside services via getClient()
      }
      if (sql.trim().toUpperCase() === 'COMMIT' || sql.trim().toUpperCase() === 'ROLLBACK') {
        return;
      }
      return await query(sql);
    },
  };
}

export { query, getClient, checkHealth };
