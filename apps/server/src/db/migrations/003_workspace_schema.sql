-- Migration 003: Workspace Schema for In-Portal Debug Workspace
CREATE TABLE IF NOT EXISTS team_workspace_files (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  track VARCHAR(50) NOT NULL CHECK (track IN ('full-stack', 'cybersecurity')),
  file_path VARCHAR(255) NOT NULL CHECK (file_path <> ''),
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_team_file UNIQUE(team_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_team_workspace_team_id ON team_workspace_files(team_id);
