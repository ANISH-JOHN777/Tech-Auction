-- TECH AUCTION 2026 — PostgreSQL Migration 001: Initial Schema

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100),
  applied_at TIMESTAMPTZ,
  PRIMARY KEY (version)
);

CREATE TABLE IF NOT EXISTS teams (
  id SERIAL,
  code VARCHAR(50),
  name VARCHAR(100),
  pin VARCHAR(50) DEFAULT '1234',
  college VARCHAR(255) DEFAULT 'SNS College of Technology',
  department VARCHAR(255) DEFAULT 'Information Technology',
  challenge VARCHAR(50),
  wallet INTEGER DEFAULT 1000,
  auction_eligible SMALLINT DEFAULT 0,
  login_enabled SMALLINT DEFAULT 1,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL,
  team_id INTEGER,
  name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'Member',
  created_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL,
  registration_code VARCHAR(100),
  team_id INTEGER,
  source VARCHAR(50) DEFAULT 'csv_import',
  imported_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  UNIQUE (registration_code),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL,
  team_id INTEGER,
  balance INTEGER DEFAULT 1000,
  held_balance INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  UNIQUE (team_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id SERIAL,
  team_id INTEGER,
  amount INTEGER,
  type VARCHAR(50),
  description TEXT,
  reference_id VARCHAR(100),
  created_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auction_rooms (
  id SERIAL,
  track VARCHAR(50),
  status VARCHAR(50) DEFAULT 'WAITING',
  current_item_id INTEGER,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  UNIQUE (track)
);

CREATE TABLE IF NOT EXISTS auction_items (
  id SERIAL,
  track VARCHAR(50),
  item_code VARCHAR(50),
  name VARCHAR(150),
  description TEXT,
  item_type VARCHAR(50),
  starting_price INTEGER DEFAULT 100,
  minimum_increment INTEGER DEFAULT 25,
  duration_seconds INTEGER DEFAULT 60,
  current_bid INTEGER DEFAULT 0,
  highest_team_id INTEGER,
  status VARCHAR(50) DEFAULT 'PENDING',
  timer_started_at TIMESTAMPTZ,
  timer_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS bids (
  id SERIAL,
  room_id INTEGER,
  item_id INTEGER,
  team_id INTEGER,
  team_code VARCHAR(50),
  team_name VARCHAR(100),
  challenge VARCHAR(50),
  amount INTEGER,
  created_at TIMESTAMPTZ,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS auction_winners (
  id SERIAL,
  item_id INTEGER,
  team_id INTEGER,
  winning_bid INTEGER,
  created_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  UNIQUE (item_id)
);

CREATE TABLE IF NOT EXISTS ai_entitlements (
  id SERIAL,
  team_id INTEGER,
  team_code VARCHAR(50),
  track VARCHAR(50),
  auction_item_id INTEGER,
  provider VARCHAR(50) DEFAULT 'gemini',
  duration_seconds INTEGER DEFAULT 900,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'AVAILABLE',
  request_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id SERIAL,
  team_id INTEGER,
  entitlement_id INTEGER,
  request_number INTEGER,
  user_message_length INTEGER,
  response_length INTEGER,
  model VARCHAR(100),
  success SMALLINT DEFAULT 1,
  error_code VARCHAR(100),
  created_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (entitlement_id) REFERENCES ai_entitlements(id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL,
  team_id INTEGER,
  track VARCHAR(50),
  submission_version INTEGER DEFAULT 1,
  submission_type VARCHAR(50) DEFAULT 'FILE',
  submission_reference TEXT,
  submitted_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'SUBMITTED',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scores (
  id SERIAL,
  submission_id INTEGER,
  team_id INTEGER,
  track VARCHAR(50),
  bug_points INTEGER DEFAULT 0,
  functional_points INTEGER DEFAULT 0,
  technical_points INTEGER DEFAULT 0,
  fix_points INTEGER DEFAULT 0,
  report_points INTEGER DEFAULT 0,
  presentation_points INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  judge_notes TEXT,
  evaluated_by VARCHAR(100),
  evaluated_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (submission_id) REFERENCES submissions(id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evaluation_events (
  id SERIAL,
  submission_id INTEGER,
  action VARCHAR(100),
  actor VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (submission_id) REFERENCES submissions(id)
);

CREATE TABLE IF NOT EXISTS event_settings (
  key VARCHAR(100),
  value TEXT,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (key)
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL,
  token VARCHAR(255),
  team_code VARCHAR(50),
  user_type VARCHAR(50) DEFAULT 'student',
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  UNIQUE (token)
);

CREATE TABLE IF NOT EXISTS violations (
  id SERIAL,
  team_id INTEGER,
  event_id VARCHAR(100) DEFAULT 'TECH_AUCTION_2026',
  type VARCHAR(100),
  severity VARCHAR(50) DEFAULT 'WARNING',
  description TEXT,
  metadata TEXT,
  client_timestamp TIMESTAMPTZ,
  server_timestamp TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'OPEN',
  created_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_event_sessions (
  id SERIAL,
  team_id INTEGER,
  session_id VARCHAR(255),
  started_at TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ,
  last_visibility_state VARCHAR(50) DEFAULT 'visible',
  fullscreen_enabled SMALLINT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  client_metadata TEXT,
  PRIMARY KEY (id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_admin_actions (
  id SERIAL,
  admin_user VARCHAR(100),
  team_id INTEGER,
  action VARCHAR(100),
  reason TEXT,
  created_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);
