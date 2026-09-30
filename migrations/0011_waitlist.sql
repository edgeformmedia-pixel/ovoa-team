-- People who can't text OVOA yet (no iPhone) and left an email on the
-- homepage or /text to be told when they can (src/lib/waitlist.functions.ts).
-- device / os / country are what the browser and Cloudflare say, so it's
-- clear which phones and places are waiting.
--
-- Apply: npm run db:migrate

CREATE TABLE waitlist (
  email TEXT PRIMARY KEY,
  device TEXT,
  os TEXT,
  country TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX waitlist_created_idx ON waitlist (created_at);
