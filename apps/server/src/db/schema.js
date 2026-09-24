export async function initializeSchema(db) {
  // Create tables if they do not exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      pin TEXT DEFAULT '1234',
      college TEXT DEFAULT 'SNS College of Technology',
      department TEXT DEFAULT 'Information Technology',
      challenge TEXT,
      wallet INTEGER DEFAULT 1000,
      auction_eligible INTEGER DEFAULT 0,
      login_enabled INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT DEFAULT 'Member',
      created_at TEXT,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_code TEXT UNIQUE NOT NULL,
      team_id INTEGER,
      source TEXT DEFAULT 'csv_import',
      imported_at TEXT
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER UNIQUE NOT NULL,
      balance INTEGER DEFAULT 1000,
      held_balance INTEGER DEFAULT 0,
      updated_at TEXT,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      reference_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS auction_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'WAITING',
      current_item_id INTEGER,
      started_at TEXT,
      ended_at TEXT
    );

    CREATE TABLE IF NOT EXISTS auction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track TEXT NOT NULL,
      item_code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      item_type TEXT NOT NULL,
      starting_price INTEGER DEFAULT 100,
      minimum_increment INTEGER DEFAULT 25,
      duration_seconds INTEGER DEFAULT 60,
      current_bid INTEGER DEFAULT 0,
      highest_team_id INTEGER,
      status TEXT DEFAULT 'PENDING',
      timer_started_at TEXT,
      timer_ends_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER,
      item_id INTEGER,
      team_id INTEGER,
      team_code TEXT NOT NULL,
      team_name TEXT,
      challenge TEXT,
      amount INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auction_winners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER UNIQUE NOT NULL,
      team_id INTEGER NOT NULL,
      winning_bid INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_entitlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      team_code TEXT NOT NULL,
      track TEXT NOT NULL,
      auction_item_id INTEGER,
      provider TEXT DEFAULT 'gemini',
      duration_seconds INTEGER DEFAULT 900,
      started_at TEXT,
      expires_at TEXT,
      status TEXT DEFAULT 'AVAILABLE', -- AVAILABLE, ACTIVE, EXPIRED, REVOKED
      request_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      entitlement_id INTEGER NOT NULL,
      request_number INTEGER NOT NULL,
      user_message_length INTEGER NOT NULL,
      response_length INTEGER NOT NULL,
      model TEXT NOT NULL,
      success INTEGER DEFAULT 1,
      error_code TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (entitlement_id) REFERENCES ai_entitlements(id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      track TEXT NOT NULL,
      submission_version INTEGER DEFAULT 1,
      submission_type TEXT DEFAULT 'FILE',
      submission_reference TEXT,
      submitted_at TEXT,
      status TEXT DEFAULT 'SUBMITTED',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS workspace_submission_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      track TEXT NOT NULL,
      file_path TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      team_id INTEGER NOT NULL,
      track TEXT NOT NULL,
      bug_points INTEGER DEFAULT 0,
      functional_points INTEGER DEFAULT 0,
      technical_points INTEGER DEFAULT 0,
      fix_points INTEGER DEFAULT 0,
      report_points INTEGER DEFAULT 0,
      presentation_points INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      judge_notes TEXT,
      evaluated_by TEXT,
      evaluated_at TEXT,
      FOREIGN KEY (submission_id) REFERENCES submissions(id),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS evaluation_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id)
    );

    CREATE TABLE IF NOT EXISTS event_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      team_code TEXT,
      user_type TEXT DEFAULT 'student',
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      event_id TEXT DEFAULT 'TECH_AUCTION_2026',
      type TEXT NOT NULL,
      severity TEXT DEFAULT 'WARNING',
      description TEXT,
      metadata TEXT,
      client_timestamp TEXT,
      server_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'OPEN',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS team_event_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_heartbeat TEXT DEFAULT CURRENT_TIMESTAMP,
      last_visibility_state TEXT DEFAULT 'visible',
      fullscreen_enabled INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      client_metadata TEXT,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS event_admin_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_user TEXT NOT NULL,
      team_id INTEGER,
      action TEXT NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_code ON teams(code);
    CREATE INDEX IF NOT EXISTS idx_members_team_id ON team_members(team_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_team_id ON wallets(team_id);
    CREATE INDEX IF NOT EXISTS idx_tx_team_id ON wallet_transactions(team_id);
    CREATE INDEX IF NOT EXISTS idx_items_track_status ON auction_items(track, status);
    CREATE INDEX IF NOT EXISTS idx_bids_item_id ON bids(item_id);
    CREATE INDEX IF NOT EXISTS idx_ai_team_status ON ai_entitlements(team_id, status);
    CREATE INDEX IF NOT EXISTS idx_ai_logs_team ON ai_usage_logs(team_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_team_track ON submissions(team_id, track);
    CREATE INDEX IF NOT EXISTS idx_scores_sub_id ON scores(submission_id);
    CREATE INDEX IF NOT EXISTS idx_scores_team_total ON scores(team_id, total_score);
    CREATE INDEX IF NOT EXISTS idx_eval_events_sub ON evaluation_events(submission_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_violations_team_id ON violations(team_id);
    CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_team_status ON team_event_sessions(team_id, status);
    CREATE INDEX IF NOT EXISTS idx_admin_actions_team ON event_admin_actions(team_id);

  `);

  // Migration helper for teams status column
  const teamColumns = await db.all("PRAGMA table_info(teams)");
  const teamColNames = teamColumns.map((c) => c.name);
  if (!teamColNames.includes('status')) {
    await db.exec("ALTER TABLE teams ADD COLUMN status TEXT DEFAULT 'ACTIVE'");
  }

  // Migration helper for bids & ai_entitlements if table upgraded
  const bidColumns = await db.all("PRAGMA table_info(bids)");
  const bidColNames = bidColumns.map((c) => c.name);
  if (!bidColNames.includes('item_id')) {
    await db.exec("ALTER TABLE bids ADD COLUMN item_id INTEGER");
  }

  const aiColumns = await db.all("PRAGMA table_info(ai_entitlements)");
  const aiColNames = aiColumns.map((c) => c.name);
  if (!aiColNames.includes('team_id')) {
    await db.exec("ALTER TABLE ai_entitlements ADD COLUMN team_id INTEGER");
  }
  if (!aiColNames.includes('track')) {
    await db.exec("ALTER TABLE ai_entitlements ADD COLUMN track TEXT");
  }
  const scoreColumns = await db.all("PRAGMA table_info(scores)");
  const scoreColNames = scoreColumns.map((c) => c.name);
  if (!scoreColNames.includes('fix_points')) {
    await db.exec("ALTER TABLE scores ADD COLUMN fix_points INTEGER DEFAULT 0");
  }

  // Ensure auction rooms exist
  const roomCount = await db.get('SELECT COUNT(*) as count FROM auction_rooms');
  if (roomCount.count === 0) {
    await db.run("INSERT INTO auction_rooms (track, status) VALUES ('full-stack', 'WAITING'), ('cybersecurity', 'WAITING')");
  }

  // Ensure default event settings exist
  await ensureEventSettings(db);

  // Seed catalog and demo teams if empty
  const seedCheck = await db.get('SELECT COUNT(*) as count FROM teams');
  if (seedCheck.count === 0) {
    await seedDemoData(db);
  } else {
    await ensureWalletsAndCatalog(db);
  }
}

export async function ensureEventSettings(db) {
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
    const existing = await db.get('SELECT key FROM event_settings WHERE key = ?', [item.key]);
    if (!existing) {
      await db.run('INSERT INTO event_settings (key, value, updated_at) VALUES (?, ?, ?)', [item.key, item.value, now.toISOString()]);
    }
  }
}


export async function ensureWalletsAndCatalog(db) {
  const now = new Date().toISOString();

  // Create wallets for any team missing a wallet
  const teamsWithoutWallet = await db.all(`
    SELECT t.id, t.wallet FROM teams t 
    LEFT JOIN wallets w ON t.id = w.team_id 
    WHERE w.id IS NULL
  `);

  for (const t of teamsWithoutWallet) {
    await db.run('INSERT INTO wallets (team_id, balance, held_balance, updated_at) VALUES (?, ?, 0, ?)', [t.id, t.wallet || 1000, now]);
    await db.run(
      `INSERT INTO wallet_transactions (team_id, amount, type, description, created_at) VALUES (?, ?, 'INITIAL_BALANCE', 'Starting auction credits', ?)`,
      [t.id, t.wallet || 1000, now]
    );
  }

  // Seed Catalog Items if empty
  const itemCount = await db.get('SELECT COUNT(*) as count FROM auction_items');
  if (itemCount.count === 0) {
    // Full-Stack Items
    await db.run(`
      INSERT INTO auction_items (track, item_code, name, description, item_type, starting_price, minimum_increment, duration_seconds) VALUES
      ('full-stack', 'FS-01', 'API Contract Hint', 'Reveals a controlled technical hint for CampusConnect API parameter mapping', 'HINT', 100, 25, 60),
      ('full-stack', 'FS-02', 'Database Query Hint', 'Reveals a controlled technical hint for database SQL filter bug', 'HINT', 100, 25, 60),
      ('full-stack', 'FS-03', 'Frontend Debug Hint', 'Reveals a controlled technical hint for React state mutation issue', 'HINT', 100, 25, 60),
      ('full-stack', 'FS-04', 'Extra Development Time', 'Provides 15 minutes of additional challenge submission time', 'TIME', 150, 25, 60),
      ('full-stack', 'FS-05', 'AI ASSIST', 'Unlocks Gemini AI assistant access for Full-Stack track', 'AI_ASSIST', 200, 50, 90)
    `);

    // Cybersecurity Items
    await db.run(`
      INSERT INTO auction_items (track, item_code, name, description, item_type, starting_price, minimum_increment, duration_seconds) VALUES
      ('cybersecurity', 'CY-01', 'Authentication Hint', 'Reveals a controlled hint for SecureVault authentication exposure', 'HINT', 100, 25, 60),
      ('cybersecurity', 'CY-02', 'Access Control Hint', 'Reveals a controlled hint for BOPA / IDOR document access vulnerability', 'HINT', 100, 25, 60),
      ('cybersecurity', 'CY-03', 'Web Security Hint', 'Reveals a controlled hint for Reflected XSS parameter vulnerability', 'HINT', 100, 25, 60),
      ('cybersecurity', 'CY-04', 'Log Analysis Hint', 'Reveals a controlled hint for synthetic log brute-force pattern analysis', 'HINT', 100, 25, 60),
      ('cybersecurity', 'CY-05', 'Extra Investigation Time', 'Provides 15 minutes of additional security investigation time', 'TIME', 150, 25, 60),
      ('cybersecurity', 'CY-06', 'AI ASSIST', 'Unlocks Gemini AI assistant access for Cybersecurity track', 'AI_ASSIST', 200, 50, 90)
    `);

    console.log('[DB] Seeded persistent auction catalog items successfully.');
  }
}

export async function seedDemoData(db) {
  const now = new Date().toISOString();
  
  // Clear existing data
  await db.exec(`
    DELETE FROM ai_usage_logs;
    DELETE FROM ai_entitlements;
    DELETE FROM wallet_transactions;
    DELETE FROM wallets;
    DELETE FROM bids;
    DELETE FROM auction_winners;
    DELETE FROM auction_items;
    DELETE FROM team_members;
    DELETE FROM teams;
    DELETE FROM registrations;
    UPDATE auction_rooms SET status = 'WAITING', current_item_id = NULL;
  `);

  // Insert Full-Stack Demo Teams (FS01, FS02, FS03)
  const resFS01 = await db.run(`
    INSERT INTO teams (code, name, pin, college, department, challenge, wallet, auction_eligible, login_enabled, created_at, updated_at)
    VALUES ('FS01', 'Code Warriors', '1234', 'SNS College of Technology', 'Department of IT', 'full-stack', 1000, 1, 1, ?, ?)
  `, [now, now]);

  const resFS02 = await db.run(`
    INSERT INTO teams (code, name, pin, college, department, challenge, wallet, auction_eligible, login_enabled, created_at, updated_at)
    VALUES ('FS02', 'Bug Hunters', '1234', 'SNS College of Technology', 'Department of IT', 'full-stack', 1000, 0, 1, ?, ?)
  `, [now, now]);

  const resFS03 = await db.run(`
    INSERT INTO teams (code, name, pin, college, department, challenge, wallet, auction_eligible, login_enabled, created_at, updated_at)
    VALUES ('FS03', 'Byte Masters', '1234', 'SNS College of Technology', 'Department of IT', 'full-stack', 1000, 1, 1, ?, ?)
  `, [now, now]);

  // Insert Cybersecurity Demo Teams (CY01, CY02, CY03)
  const resCY01 = await db.run(`
    INSERT INTO teams (code, name, pin, college, department, challenge, wallet, auction_eligible, login_enabled, created_at, updated_at)
    VALUES ('CY01', 'Cyber Hawks', '1234', 'SNS College of Technology', 'Department of IT', 'cybersecurity', 1000, 1, 1, ?, ?)
  `, [now, now]);

  const resCY02 = await db.run(`
    INSERT INTO teams (code, name, pin, college, department, challenge, wallet, auction_eligible, login_enabled, created_at, updated_at)
    VALUES ('CY02', 'Net Defenders', '1234', 'SNS College of Technology', 'Department of IT', 'cybersecurity', 1000, 1, 1, ?, ?)
  `, [now, now]);

  const resCY03 = await db.run(`
    INSERT INTO teams (code, name, pin, college, department, challenge, wallet, auction_eligible, login_enabled, created_at, updated_at)
    VALUES ('CY03', 'Shield Force', '1234', 'SNS College of Technology', 'Department of IT', 'cybersecurity', 1000, 0, 1, ?, ?)
  `, [now, now]);

  // Create Wallets
  const allTeams = [
    { id: resFS01.lastID, code: 'FS01' },
    { id: resFS02.lastID, code: 'FS02' },
    { id: resFS03.lastID, code: 'FS03' },
    { id: resCY01.lastID, code: 'CY01' },
    { id: resCY02.lastID, code: 'CY02' },
    { id: resCY03.lastID, code: 'CY03' },
  ];

  for (const t of allTeams) {
    await db.run('INSERT INTO wallets (team_id, balance, held_balance, updated_at) VALUES (?, 1000, 0, ?)', [t.id, now]);
    await db.run(
      `INSERT INTO wallet_transactions (team_id, amount, type, description, created_at) VALUES (?, 1000, 'INITIAL_BALANCE', 'Default starting auction credits (1000)', ?)`,
      [t.id, now]
    );
  }

  // Insert Team Members
  await db.run(`
    INSERT INTO team_members (team_id, name, email, phone, role) VALUES
    (?, 'Alex Rivera', 'alex@snscet.ac.in', '9876543210', 'Team Lead'),
    (?, 'Sarah Chen', 'sarah@snscet.ac.in', '9876543211', 'Developer')
  `, [resFS01.lastID, resFS01.lastID]);

  await db.run(`
    INSERT INTO team_members (team_id, name, email, phone, role) VALUES
    (?, 'David Miller', 'david@snscet.ac.in', '9876543212', 'Team Lead')
  `, [resCY01.lastID]);

  await ensureWalletsAndCatalog(db);
  console.log('[DB] Seeded demo teams, wallets, and auction catalog successfully.');
}
