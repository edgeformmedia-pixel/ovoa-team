-- A/B testing the front door (src/lib/ab.ts, ab.functions.ts). New visitors
-- are counted: odd ones see version A, even ones version B, and a cookie keeps
-- each of them on theirs.
--
--   ab_tests: one row per test. n is how many visitors it has been given to.
--     name_a / name_b say what each version is. hello_a / hello_b are the
--     texts each version's button puts in Messages, so admin.ovoa.ai can tell
--     which version a first text came from.
--   analytics_sessions.ab_test / ab_variant: the test and version ('a' | 'b')
--     the visit's browser was on, for admin.ovoa.ai's A/B test tab.
--
-- Apply: npm run db:migrate

CREATE TABLE ab_tests (
  test TEXT PRIMARY KEY,
  n INTEGER NOT NULL DEFAULT 0,
  name_a TEXT,
  name_b TEXT,
  hello_a TEXT,
  hello_b TEXT,
  started_at TEXT NOT NULL
);

ALTER TABLE analytics_sessions ADD COLUMN ab_test TEXT;
ALTER TABLE analytics_sessions ADD COLUMN ab_variant TEXT;

CREATE INDEX analytics_sessions_ab_idx ON analytics_sessions (ab_test, ab_variant);
