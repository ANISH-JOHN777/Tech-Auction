import { query, getClient } from './postgres.js';
import { runMigrations } from './migrate.js';
import { studentRepository } from './repositories/student.repository.js';

export async function ensureAuctionRooms() {
  const check = await query("SELECT COUNT(*)::int as count FROM auction_rooms");
  if (check.rows[0].count === 0) {
    await query(`
      INSERT INTO auction_rooms (track, status)
      VALUES ('full-stack', 'WAITING'), ('cybersecurity', 'WAITING')
      ON CONFLICT (track) DO NOTHING;
    `);
    console.log('[SEED] Initialized auction rooms.');
  }
}

export async function ensureStudentPool() {
  const defaultPin = process.env.STUDENT_DEFAULT_PIN || '1234';
  for (let i = 1; i <= 40; i++) {
    const code = `STU${i.toString().padStart(3, '0')}`;
    await studentRepository.createStudent({
      studentCode: code,
      pin: defaultPin,
      name: `Student ${code}`,
      teamId: null,
    });
  }
  console.log('[SEED] Ensured 40 student accounts (STU001..STU040) in database.');
}

export async function ensureEventSettings() {
  const now = new Date();
  const defaultDeadline = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();

  const defaults = [
    { key: 'event_status', value: 'SETUP' },
    { key: 'leaderboard_visible', value: 'false' },
    { key: 'event_started_at', value: now.toISOString() },
    { key: 'challenge_started_at', value: now.toISOString() },
    { key: 'challenge_deadline', value: defaultDeadline },
  ];

  for (const item of defaults) {
    await query(
      `INSERT INTO event_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO NOTHING`,
      [item.key, item.value]
    );
  }
}

export async function ensureWalletsAndCatalog() {
  // Ensure every team has a wallet
  const missingWallets = await query(`
    SELECT t.id, t.wallet FROM teams t
    LEFT JOIN wallets w ON t.id = w.team_id
    WHERE w.id IS NULL
  `);

  for (const t of missingWallets.rows) {
    const credits = t.wallet || 1000;
    await query(
      `INSERT INTO wallets (team_id, balance, held_balance, updated_at)
       VALUES ($1, $2, 0, NOW())
       ON CONFLICT (team_id) DO NOTHING`,
      [t.id, credits]
    );
    await query(
      `INSERT INTO wallet_transactions (team_id, amount, type, description, created_at)
       VALUES ($1, $2, 'INITIAL_BALANCE', 'Starting auction credits', NOW())`,
      [t.id, credits]
    );
  }

  // Ensure auction items catalog is populated
  const itemCheck = await query("SELECT COUNT(*)::int as count FROM auction_items");
  if (itemCheck.rows[0].count === 0) {
    // Full-Stack Items
    await query(`
      INSERT INTO auction_items (track, item_code, name, description, item_type, starting_price, minimum_increment, duration_seconds) VALUES
      ('full-stack', 'FS-01', 'API Contract Hint', 'Reveals a controlled technical hint for CampusConnect API parameter mapping', 'HINT', 100, 25, 60),
      ('full-stack', 'FS-02', 'Database Query Hint', 'Reveals a controlled technical hint for database SQL filter bug', 'HINT', 100, 25, 60),
      ('full-stack', 'FS-03', 'Frontend Debug Hint', 'Reveals a controlled technical hint for React state mutation issue', 'HINT', 100, 25, 60),
      ('full-stack', 'FS-04', 'Extra Development Time', 'Provides 15 minutes of additional challenge submission time', 'TIME', 150, 25, 60),
      ('full-stack', 'FS-05', 'AI ASSIST', 'Unlocks Gemini AI assistant access for Full-Stack track', 'AI_ASSIST', 200, 50, 90)
    `);

    // Cybersecurity Items
    await query(`
      INSERT INTO auction_items (track, item_code, name, description, item_type, starting_price, minimum_increment, duration_seconds) VALUES
      ('cybersecurity', 'CY-01', 'Authentication Hint', 'Reveals a controlled hint for SecureVault authentication exposure', 'HINT', 100, 25, 60),
      ('cybersecurity', 'CY-02', 'Access Control Hint', 'Reveals a controlled hint for BOPA / IDOR document access vulnerability', 'HINT', 100, 25, 60),
      ('cybersecurity', 'CY-03', 'Web Security Hint', 'Reveals a controlled hint for Reflected XSS parameter vulnerability', 'HINT', 100, 25, 60),
      ('cybersecurity', 'CY-04', 'Log Analysis Hint', 'Reveals a controlled hint for synthetic log brute-force pattern analysis', 'HINT', 100, 25, 60),
      ('cybersecurity', 'CY-05', 'Extra Investigation Time', 'Provides 15 minutes of additional security investigation time', 'TIME', 150, 25, 60),
      ('cybersecurity', 'CY-06', 'AI ASSIST', 'Unlocks Gemini AI assistant access for Cybersecurity track', 'AI_ASSIST', 200, 50, 90)
    `);

    console.log('[SEED] Seeded persistent auction catalog items successfully.');
  }
}

export async function seedDemoData() {
  await runMigrations();

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Clean tables using DELETE FROM
    const tablesToClean = [
      'team_cleared_bugs', 'students', 'ai_usage_logs', 'ai_entitlements', 'wallet_transactions', 'wallets', 'bids',
      'auction_winners', 'team_members', 'registrations', 'evaluation_events',
      'scores', 'submissions', 'violations', 'team_event_sessions', 'event_admin_actions',
      'teams', 'auction_items'
    ];
    for (const t of tablesToClean) {
      await client.query(`DELETE FROM ${t}`);
    }

    await client.query("UPDATE auction_rooms SET status = 'WAITING', current_item_id = NULL");

    const now = new Date().toISOString();

    // Insert FS01, FS02, FS03
    const fsTeams = [
      { code: 'FS01', name: 'Code Warriors', eligible: 1 },
      { code: 'FS02', name: 'Bug Hunters', eligible: 0 },
      { code: 'FS03', name: 'Byte Masters', eligible: 1 },
    ];

    for (const t of fsTeams) {
      const res = await client.query(
        `INSERT INTO teams (code, name, pin, college, department, challenge, wallet, auction_eligible, login_enabled, created_at, updated_at)
         VALUES ($1, $2, '1234', 'SNS College of Technology', 'Department of IT', 'full-stack', 1000, $3, 1, $4, $4)
         RETURNING id`,
        [t.code, t.name, t.eligible, now]
      );
      const teamId = res.rows[0].id;
      await client.query(
        'INSERT INTO wallets (team_id, balance, held_balance, updated_at) VALUES ($1, 1000, 0, $2)',
        [teamId, now]
      );
      await client.query(
        `INSERT INTO wallet_transactions (team_id, amount, type, description, created_at) VALUES ($1, 1000, 'INITIAL_BALANCE', 'Default starting auction credits (1000)', $2)`,
        [teamId, now]
      );
      if (t.code === 'FS01') {
        await client.query(
          `INSERT INTO team_members (team_id, name, email, phone, role) VALUES ($1, 'Alex Rivera', 'alex@snscet.ac.in', '9876543210', 'Team Lead'), ($1, 'Sarah Chen', 'sarah@snscet.ac.in', '9876543211', 'Developer')`,
          [teamId]
        );
      }
    }

    // Insert CY01, CY02, CY03
    const cyTeams = [
      { code: 'CY01', name: 'Cyber Hawks', eligible: 1 },
      { code: 'CY02', name: 'Net Defenders', eligible: 1 },
      { code: 'CY03', name: 'Shield Force', eligible: 0 },
    ];

    for (const t of cyTeams) {
      const res = await client.query(
        `INSERT INTO teams (code, name, pin, college, department, challenge, wallet, auction_eligible, login_enabled, created_at, updated_at)
         VALUES ($1, $2, '1234', 'SNS College of Technology', 'Department of IT', 'cybersecurity', 1000, $3, 1, $4, $4)
         RETURNING id`,
        [t.code, t.name, t.eligible, now]
      );
      const teamId = res.rows[0].id;
      await client.query(
        'INSERT INTO wallets (team_id, balance, held_balance, updated_at) VALUES ($1, 1000, 0, $2)',
        [teamId, now]
      );
      await client.query(
        `INSERT INTO wallet_transactions (team_id, amount, type, description, created_at) VALUES ($1, 1000, 'INITIAL_BALANCE', 'Default starting auction credits (1000)', $2)`,
        [teamId, now]
      );
      if (t.code === 'CY01') {
        await client.query(
          `INSERT INTO team_members (team_id, name, email, phone, role) VALUES ($1, 'David Miller', 'david@snscet.ac.in', '9876543212', 'Team Lead')`,
          [teamId]
        );
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[SEED ERROR] Seed transaction failed:', err.message);
    throw err;
  } finally {
    client.release();
  }

  await ensureAuctionRooms();
  await ensureEventSettings();
  await ensureWalletsAndCatalog();
  await ensureStudentPool();

  console.log('[SEED] PostgreSQL database seeded successfully with demo teams and catalog.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[FATAL SEED FAILURE]', err);
      process.exit(1);
    });
}
