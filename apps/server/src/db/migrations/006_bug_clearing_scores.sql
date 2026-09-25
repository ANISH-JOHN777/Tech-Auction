-- TECH AUCTION 2026 — Migration 006: Bug Clearing Scores Schema

CREATE TABLE IF NOT EXISTS team_cleared_bugs (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  track VARCHAR(50) NOT NULL CHECK (track IN ('full-stack', 'cybersecurity')),
  assertion_key VARCHAR(100) NOT NULL,
  cleared_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_team_assertion UNIQUE(team_id, assertion_key)
);

-- Index for fast team cleared bugs lookup
CREATE INDEX IF NOT EXISTS idx_team_cleared_bugs_team_id ON team_cleared_bugs(team_id);
