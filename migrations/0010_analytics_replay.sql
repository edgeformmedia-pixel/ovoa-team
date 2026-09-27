-- A visit with a session replay in ovoa-replay-db (migrations-replay/) has
-- replay_bytes > 0, so the admin can list and play it.
--
-- Apply: npm run db:migrate

ALTER TABLE analytics_sessions ADD COLUMN replay_bytes INTEGER NOT NULL DEFAULT 0;
