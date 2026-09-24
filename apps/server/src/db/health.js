import { query, checkHealth } from './postgres.js';
import { runMigrations } from './migrate.js';

export async function runHealthCheck() {
  console.log('[DB HEALTH] Verifying PostgreSQL connection & schema health...');
  
  await runMigrations();

  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.error('[DB HEALTH ERROR] Database ping (SELECT 1) failed.');
    process.exit(1);
  }

  const tables = [
    'teams', 'team_members', 'registrations', 'wallets', 'wallet_transactions',
    'auction_rooms', 'auction_items', 'bids', 'auction_winners', 'ai_entitlements',
    'ai_usage_logs', 'submissions', 'scores', 'evaluation_events', 'event_settings',
    'sessions', 'violations', 'team_event_sessions', 'event_admin_actions', 'schema_migrations'
  ];

  for (const table of tables) {
    const res = await query(`SELECT COUNT(*)::int as count FROM ${table}`);
    console.log(`[DB HEALTH] Table '${table}' verified (${res.rows[0].count} rows).`);
  }

  console.log('[DB HEALTH] All PostgreSQL health checks PASSED.');
}

if (process.argv[1] && process.argv[1].endsWith('health.js')) {
  runHealthCheck()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[FATAL DB HEALTH FAILURE]', err.message);
      process.exit(1);
    });
}
