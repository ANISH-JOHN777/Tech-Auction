import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, getClient } from './postgres.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  console.log('[MIGRATION] Starting database migrations check...');
  
  // Ensure schema_migrations table exists
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedRes = await query('SELECT version FROM schema_migrations');
  const appliedVersions = new Set(appliedRes.rows.map((r) => r.version));

  const migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('[MIGRATION ERROR] Migrations directory not found:', migrationsDir);
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (appliedVersions.has(file)) {
      console.log(`[MIGRATION] Skipping already applied: ${file}`);
      continue;
    }

    console.log(`[MIGRATION] Executing migration: ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version, applied_at) VALUES ($1, NOW())',
        [file]
      );
      await client.query('COMMIT');
      console.log(`[MIGRATION] Successfully applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[MIGRATION ERROR] Failed to apply ${file}:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('[MIGRATION] All database migrations are up to date.');
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[FATAL MIGRATION FAILURE]', err);
      process.exit(1);
    });
}
