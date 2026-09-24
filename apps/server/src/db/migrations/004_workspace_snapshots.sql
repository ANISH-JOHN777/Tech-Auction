-- Migration 004: Workspace Submission Snapshots Table
CREATE TABLE IF NOT EXISTS workspace_submission_snapshots (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  track VARCHAR(50) NOT NULL CHECK (track IN ('full-stack', 'cybersecurity')),
  file_path VARCHAR(255) NOT NULL CHECK (file_path <> ''),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_sub_id ON workspace_submission_snapshots(submission_id);
CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_team_id ON workspace_submission_snapshots(team_id);
