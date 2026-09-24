# POSTGRESQL MIGRATION MAPPING — TECH AUCTION 2026

This document details the exact 1:1 schema mapping from the existing SQLite tables to PostgreSQL for the free tier deployment architecture (Supabase Free PostgreSQL + Render Free + Vercel Free).

---

## 1. Table Definitions & Data Types Mapping

| SQLite Table | SQLite Column | SQLite Type & Constraints | PostgreSQL Type | PostgreSQL Constraints | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **teams** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL / BIGSERIAL | PRIMARY KEY | Preserves numeric IDs |
| | `code` | TEXT UNIQUE NOT NULL | VARCHAR(50) | UNIQUE NOT NULL | Team code (e.g. FS01) |
| | `name` | TEXT NOT NULL | VARCHAR(100) | NOT NULL | Team display name |
| | `pin` | TEXT DEFAULT '1234' | VARCHAR(50) | DEFAULT '1234' | Team login PIN |
| | `college` | TEXT DEFAULT '...' | VARCHAR(255) | DEFAULT '...' | College name |
| | `department` | TEXT DEFAULT '...' | VARCHAR(255) | DEFAULT '...' | Department name |
| | `challenge` | TEXT | VARCHAR(50) | NULL | Track selection |
| | `wallet` | INTEGER DEFAULT 1000 | INTEGER | DEFAULT 1000 | Total balance |
| | `auction_eligible` | INTEGER DEFAULT 0 | SMALLINT / BOOLEAN | DEFAULT 0 | 1 = Eligible, 0 = Not |
| | `login_enabled` | INTEGER DEFAULT 1 | SMALLINT / BOOLEAN | DEFAULT 1 | 1 = Enabled, 0 = Disabled |
| | `status` | TEXT DEFAULT 'ACTIVE' | VARCHAR(50) | DEFAULT 'ACTIVE' | ACTIVE, SUSPENDED, DISQUALIFIED |
| | `created_at` | TEXT | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Standardized timestamp |
| | `updated_at` | TEXT | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Standardized timestamp |
| **team_members** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `team_id` | INTEGER NOT NULL | INTEGER | REFERENCES teams(id) ON DELETE CASCADE | Foreign Key |
| | `name` | TEXT NOT NULL | VARCHAR(100) | NOT NULL | Member full name |
| | `email` | TEXT | VARCHAR(255) | NULL | Member email |
| | `phone` | TEXT | VARCHAR(50) | NULL | Member phone |
| | `role` | TEXT DEFAULT 'Member' | VARCHAR(50) | DEFAULT 'Member' | Team Lead / Member |
| | `created_at` | TEXT | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| **registrations** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `registration_code`| TEXT UNIQUE NOT NULL | VARCHAR(100) | UNIQUE NOT NULL | Import code |
| | `team_id` | INTEGER | INTEGER | REFERENCES teams(id) | Foreign key |
| | `source` | TEXT DEFAULT 'csv_import' | VARCHAR(50) | DEFAULT 'csv_import' | Import source |
| | `imported_at` | TEXT | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| **wallets** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `team_id` | INTEGER UNIQUE NOT NULL | INTEGER | UNIQUE REFERENCES teams(id) ON DELETE CASCADE | 1:1 Team Wallet relationship |
| | `balance` | INTEGER DEFAULT 1000 | INTEGER | DEFAULT 1000 | Available + Held |
| | `held_balance` | INTEGER DEFAULT 0 | INTEGER | DEFAULT 0 | Currently tied up in active bids |
| | `updated_at` | TEXT | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| **wallet_transactions** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `team_id` | INTEGER NOT NULL | INTEGER | REFERENCES teams(id) | Foreign Key |
| | `amount` | INTEGER NOT NULL | INTEGER | NOT NULL | Transaction delta |
| | `type` | TEXT NOT NULL | VARCHAR(50) | NOT NULL | INITIAL_BALANCE, BID_HOLD, etc. |
| | `description` | TEXT | TEXT | NULL | Human readable note |
| | `reference_id` | TEXT | VARCHAR(100) | NULL | Item / Bid reference |
| | `created_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| **auction_rooms** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `track` | TEXT UNIQUE NOT NULL | VARCHAR(50) | UNIQUE NOT NULL | full-stack / cybersecurity |
| | `status` | TEXT DEFAULT 'WAITING' | VARCHAR(50) | DEFAULT 'WAITING' | WAITING, ACTIVE, PAUSED, COMPLETED |
| | `current_item_id` | INTEGER | INTEGER | NULL | Currently active item |
| | `started_at` | TEXT | TIMESTAMPTZ | NULL | Track auction start time |
| | `ended_at` | TEXT | TIMESTAMPTZ | NULL | Track auction end time |
| **auction_items** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `track` | TEXT NOT NULL | VARCHAR(50) | NOT NULL | full-stack / cybersecurity |
| | `item_code` | TEXT NOT NULL | VARCHAR(50) | NOT NULL | FS-01, CY-06, etc. |
| | `name` | TEXT NOT NULL | VARCHAR(150) | NOT NULL | Catalog item name |
| | `description` | TEXT | TEXT | NULL | Catalog item details |
| | `item_type` | TEXT NOT NULL | VARCHAR(50) | NOT NULL | HINT, TIME, AI_ASSIST |
| | `starting_price` | INTEGER DEFAULT 100 | INTEGER | DEFAULT 100 | Base price |
| | `minimum_increment`| INTEGER DEFAULT 25 | INTEGER | DEFAULT 25 | Bid increment step |
| | `duration_seconds`| INTEGER DEFAULT 60 | INTEGER | DEFAULT 60 | Timer duration |
| | `current_bid` | INTEGER DEFAULT 0 | INTEGER | DEFAULT 0 | Highest active bid |
| | `highest_team_id` | INTEGER | INTEGER | NULL | Current winning team ID |
| | `status` | TEXT DEFAULT 'PENDING' | VARCHAR(50) | DEFAULT 'PENDING' | PENDING, ACTIVE, SOLD, UNSOLD |
| | `timer_started_at`| TEXT | TIMESTAMPTZ | NULL | |
| | `timer_ends_at` | TEXT | TIMESTAMPTZ | NULL | |
| | `created_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| **bids** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `room_id` | INTEGER | INTEGER | NULL | |
| | `item_id` | INTEGER | INTEGER | NULL | Target item ID |
| | `team_id` | INTEGER | INTEGER | NULL | Bidding team ID |
| | `team_code` | TEXT NOT NULL | VARCHAR(50) | NOT NULL | |
| | `team_name` | TEXT | VARCHAR(100) | NULL | |
| | `challenge` | TEXT | VARCHAR(50) | NULL | Track |
| | `amount` | INTEGER NOT NULL | INTEGER | NOT NULL | Bid amount |
| | `created_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| **auction_winners** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `item_id` | INTEGER UNIQUE NOT NULL | INTEGER | UNIQUE NOT NULL | 1 Winner per Item constraint |
| | `team_id` | INTEGER NOT NULL | INTEGER | NOT NULL | Winner team ID |
| | `winning_bid` | INTEGER NOT NULL | INTEGER | NOT NULL | Final price |
| | `created_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| **ai_entitlements** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `team_id` | INTEGER NOT NULL | INTEGER | REFERENCES teams(id) | Foreign Key |
| | `team_code` | TEXT NOT NULL | VARCHAR(50) | NOT NULL | |
| | `track` | TEXT NOT NULL | VARCHAR(50) | NOT NULL | full-stack / cybersecurity |
| | `auction_item_id` | INTEGER | INTEGER | NULL | Purchased item ID |
| | `provider` | TEXT DEFAULT 'gemini' | VARCHAR(50) | DEFAULT 'gemini' | |
| | `duration_seconds`| INTEGER DEFAULT 900 | INTEGER | DEFAULT 900 | 15 mins (900s) |
| | `started_at` | TEXT | TIMESTAMPTZ | NULL | |
| | `expires_at` | TEXT | TIMESTAMPTZ | NULL | |
| | `status` | TEXT DEFAULT 'AVAILABLE' | VARCHAR(50) | DEFAULT 'AVAILABLE' | AVAILABLE, ACTIVE, EXPIRED, REVOKED |
| | `request_count` | INTEGER DEFAULT 0 | INTEGER | DEFAULT 0 | |
| | `created_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| | `updated_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| **ai_usage_logs** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `team_id` | INTEGER NOT NULL | INTEGER | REFERENCES teams(id) | |
| | `entitlement_id` | INTEGER NOT NULL | INTEGER | REFERENCES ai_entitlements(id) | |
| | `request_number` | INTEGER NOT NULL | INTEGER | NOT NULL | |
| | `user_message_length`| INTEGER NOT NULL | INTEGER | NOT NULL | Prompt character count |
| | `response_length` | INTEGER NOT NULL | INTEGER | NOT NULL | Reply character count |
| | `model` | TEXT NOT NULL | VARCHAR(100) | NOT NULL | gemini-2.5-flash |
| | `success` | INTEGER DEFAULT 1 | SMALLINT | DEFAULT 1 | 1 = Success, 0 = Error |
| | `error_code` | TEXT | VARCHAR(100) | NULL | |
| | `created_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| **submissions** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `team_id` | INTEGER NOT NULL | INTEGER | REFERENCES teams(id) | |
| | `track` | TEXT NOT NULL | VARCHAR(50) | NOT NULL | |
| | `submission_version`| INTEGER DEFAULT 1 | INTEGER | DEFAULT 1 | |
| | `submission_type` | TEXT DEFAULT 'FILE' | VARCHAR(50) | DEFAULT 'FILE' | |
| | `submission_reference`| TEXT | TEXT | NULL | |
| | `submitted_at` | TEXT | TIMESTAMPTZ | NULL | |
| | `status` | TEXT DEFAULT 'SUBMITTED' | VARCHAR(50) | DEFAULT 'SUBMITTED' | SUBMITTED, UNDER_REVIEW, EVALUATED, FINAL |
| | `created_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| | `updated_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| **scores** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `submission_id` | INTEGER NOT NULL | INTEGER | REFERENCES submissions(id) | |
| | `team_id` | INTEGER NOT NULL | INTEGER | REFERENCES teams(id) | |
| | `track` | TEXT NOT NULL | VARCHAR(50) | NOT NULL | |
| | `bug_points` | INTEGER DEFAULT 0 | INTEGER | DEFAULT 0 | |
| | `functional_points`| INTEGER DEFAULT 0 | INTEGER | DEFAULT 0 | |
| | `technical_points` | INTEGER DEFAULT 0 | INTEGER | DEFAULT 0 | |
| | `fix_points` | INTEGER DEFAULT 0 | INTEGER | DEFAULT 0 | |
| | `report_points` | INTEGER DEFAULT 0 | INTEGER | DEFAULT 0 | |
| | `presentation_points`| INTEGER DEFAULT 0 | INTEGER | DEFAULT 0 | |
| | `total_score` | INTEGER DEFAULT 0 | INTEGER | DEFAULT 0 | Calculated total out of 100 |
| | `judge_notes` | TEXT | TEXT | NULL | |
| | `evaluated_by` | TEXT | VARCHAR(100) | NULL | Admin username |
| | `evaluated_at` | TEXT | TIMESTAMPTZ | NULL | |
| **evaluation_events**| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `submission_id` | INTEGER NOT NULL | INTEGER | REFERENCES submissions(id) | |
| | `action` | TEXT NOT NULL | VARCHAR(100) | NOT NULL | Audit event type |
| | `actor` | TEXT NOT NULL | VARCHAR(100) | NOT NULL | Team / Admin identifier |
| | `notes` | TEXT | TEXT | NULL | |
| | `created_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| **event_settings** | `key` | TEXT PRIMARY KEY | VARCHAR(100) | PRIMARY KEY | Key-value settings store |
| | `value` | TEXT NOT NULL | TEXT | NOT NULL | |
| | `updated_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| **sessions** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `token` | TEXT UNIQUE NOT NULL | VARCHAR(255) | UNIQUE NOT NULL | Session token |
| | `team_code` | TEXT | VARCHAR(50) | NULL | Associated team code or ADMIN |
| | `user_type` | TEXT DEFAULT 'student' | VARCHAR(50) | DEFAULT 'student' | student / admin |
| | `created_at` | TEXT NOT NULL | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| | `expires_at` | TEXT NOT NULL | TIMESTAMPTZ | NOT NULL | Expiry date |
| **violations** | `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `team_id` | INTEGER NOT NULL | INTEGER | REFERENCES teams(id) | |
| | `event_id` | TEXT DEFAULT 'TECH_AUCTION_2026'| VARCHAR(100) | DEFAULT 'TECH_AUCTION_2026' | |
| | `type` | TEXT NOT NULL | VARCHAR(100) | NOT NULL | Violation type |
| | `severity` | TEXT DEFAULT 'WARNING' | VARCHAR(50) | DEFAULT 'WARNING' | INFO, WARNING, HIGH, CRITICAL |
| | `description` | TEXT | TEXT | NULL | |
| | `metadata` | TEXT | JSONB / TEXT | NULL | Cleaned event metadata |
| | `client_timestamp` | TEXT | TIMESTAMPTZ | NULL | Client timestamp |
| | `server_timestamp` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Server timestamp |
| | `status` | TEXT DEFAULT 'OPEN' | VARCHAR(50) | DEFAULT 'OPEN' | OPEN, REVIEWED, DISMISSED, ACTION_TAKEN |
| | `created_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| **team_event_sessions**| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `team_id` | INTEGER NOT NULL | INTEGER | REFERENCES teams(id) | |
| | `session_id` | TEXT NOT NULL | VARCHAR(255) | NOT NULL | Browser session ID |
| | `started_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| | `last_heartbeat` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | Heartbeat timestamp |
| | `last_visibility_state`| TEXT DEFAULT 'visible'| VARCHAR(50) | DEFAULT 'visible' | visible / hidden |
| | `fullscreen_enabled`| INTEGER DEFAULT 0 | SMALLINT | DEFAULT 0 | 1 = Yes, 0 = No |
| | `status` | TEXT DEFAULT 'ACTIVE' | VARCHAR(50) | DEFAULT 'ACTIVE' | ACTIVE / CLOSED |
| | `client_metadata` | TEXT | JSONB / TEXT | NULL | |
| **event_admin_actions**| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | SERIAL | PRIMARY KEY | |
| | `admin_user` | TEXT NOT NULL | VARCHAR(100) | NOT NULL | |
| | `team_id` | INTEGER | INTEGER | REFERENCES teams(id) | Nullable for global actions |
| | `action` | TEXT NOT NULL | VARCHAR(100) | NOT NULL | Action code |
| | `reason` | TEXT | TEXT | NULL | Action justification |
| | `created_at` | TEXT DEFAULT CURRENT_TIMESTAMP | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |

---

## 2. PostgreSQL Indexes Mapping

```sql
CREATE UNIQUE INDEX idx_teams_code ON teams(code);
CREATE INDEX idx_members_team_id ON team_members(team_id);
CREATE UNIQUE INDEX idx_wallets_team_id ON wallets(team_id);
CREATE INDEX idx_tx_team_id ON wallet_transactions(team_id);
CREATE INDEX idx_items_track_status ON auction_items(track, status);
CREATE INDEX idx_bids_item_id ON bids(item_id);
CREATE INDEX idx_ai_team_status ON ai_entitlements(team_id, status);
CREATE INDEX idx_ai_logs_team ON ai_usage_logs(team_id);
CREATE INDEX idx_submissions_team_track ON submissions(team_id, track);
CREATE INDEX idx_scores_sub_id ON scores(submission_id);
CREATE INDEX idx_scores_team_total ON scores(team_id, total_score);
CREATE INDEX idx_eval_events_sub ON evaluation_events(submission_id);
CREATE UNIQUE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_violations_team_id ON violations(team_id);
CREATE INDEX idx_violations_status ON violations(status);
CREATE INDEX idx_sessions_team_status ON team_event_sessions(team_id, status);
CREATE INDEX idx_admin_actions_team ON event_admin_actions(team_id);
```

---

## 3. Transaction & Row Locking Equivalences

| SQLite Lock Syntax | PostgreSQL Lock Syntax | Use Case |
| :--- | :--- | :--- |
| `BEGIN IMMEDIATE` | `BEGIN; SELECT ... FOR UPDATE;` | Concurrency-safe atomic bidding in `auctionEngine.service.js` |
| `result.lastID` | `RETURNING id` | Insert statements to return generated primary keys |
| `datetime('now')` | `NOW()` / `CURRENT_TIMESTAMP` | Expiry comparison and updated_at timestamps |
| `ON CONFLICT(key) DO UPDATE` | `ON CONFLICT(key) DO UPDATE` | Event setting upserts in `event.service.js` and `submission.service.js` |
