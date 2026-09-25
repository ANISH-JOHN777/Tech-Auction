-- TECH AUCTION 2026 — Migration 005: Student Account Pool & Self-Formation Schema

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  student_code VARCHAR(50) UNIQUE NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Link sessions to students for individual student auth state
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES students(id) ON DELETE CASCADE;

-- Performance index for student team association lookups
CREATE INDEX IF NOT EXISTS idx_students_team_id ON students(team_id);

-- Case-insensitive & trimmed unique index on team name to enforce team-name normalization
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_normalized_name ON teams (LOWER(TRIM(name)));
