-- Session replays for ovoa.ai (database ovoa-replay-db, binding REPLAY_DB).
-- src/lib/analytics/replay.ts records the page with rrweb (every field's text
-- masked) and posts gzipped batches of its events; each batch is one row.
-- session_id is analytics_sessions.id in ovoa-site-db. Rows older than 30 days
-- are deleted as new ones arrive. admin.ovoa.ai reads them to play a visit back.
--
-- Apply: npm run db:migrate:replay

CREATE TABLE replay_chunks (
  session_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (session_id, seq)
);

CREATE INDEX replay_chunks_created_idx ON replay_chunks (created_at);
