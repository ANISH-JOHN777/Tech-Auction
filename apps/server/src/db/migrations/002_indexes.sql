-- TECH AUCTION 2026 — PostgreSQL Migration 002: Indexes

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
