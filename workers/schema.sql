CREATE TABLE IF NOT EXISTS ai_sessions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT '総合',
  question_text TEXT NOT NULL,
  highlights_json TEXT NOT NULL DEFAULT '[]',
  feedback_json TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_mode ON ai_sessions (mode);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_created_at ON ai_sessions (created_at DESC);
