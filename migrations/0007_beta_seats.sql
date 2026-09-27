-- Seats in the public TestFlight beta (src/lib/membership/beta.server.ts): the
-- join link is only shown on /account, after an email is proven, and only to
-- the first 10,000 emails (Apple's cap on external testers).
--
-- Apply: npm run db:migrate

CREATE TABLE beta_seats (
  email TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
