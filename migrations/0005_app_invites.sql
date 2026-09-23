-- TestFlight invites for the free app (src/lib/membership/invites.server.ts):
-- one row per email that Apple was asked to invite because they made or signed
-- in to an OVOA account on ovoa.ai, or bought a Band. Members' invites stay on
-- members.testflight_state.
--
--   - state: invited | failed (error says why; retried after a few minutes)
--   - sends: how many invite emails Apple was asked for, to cap "Send it again"
--
-- Apply: npm run db:migrate

CREATE TABLE app_invites (
  email TEXT PRIMARY KEY,
  name TEXT,
  -- account | band
  source TEXT NOT NULL CHECK (source IN ('account', 'band')),
  state TEXT NOT NULL CHECK (state IN ('invited', 'failed')),
  tester_id TEXT,
  error TEXT,
  sends INTEGER NOT NULL DEFAULT 0,
  last_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX app_invites_created_idx ON app_invites (created_at);
