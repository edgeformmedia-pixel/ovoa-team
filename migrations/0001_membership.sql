-- Paid early access (Cloudflare D1): memberships bought on the website with
-- Stripe, the partners who refer them, and what each partner is owed.
-- Only the site's Worker reads or writes these tables.
--
-- Apply: npm run cf:migrate

CREATE TABLE members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL,
  name TEXT,
  -- monthly | annual | lifetime | comp (free access given from the admin page)
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'annual', 'lifetime', 'comp')),
  -- Stripe's subscription statuses, plus lifetime and refunded for one-time
  -- purchases and comp for free access
  status TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  checkout_session_id TEXT UNIQUE,
  trial_ends_at TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  canceled_at TEXT,
  ref_code TEXT,
  -- off (no automatic invites) | pending | invited | removed | failed
  testflight_state TEXT NOT NULL DEFAULT 'pending',
  testflight_tester_id TEXT,
  testflight_error TEXT,
  testflight_updated_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX members_email_idx ON members (email);
CREATE INDEX members_customer_idx ON members (stripe_customer_id);
CREATE INDEX members_payment_intent_idx ON members (stripe_payment_intent_id);
CREATE INDEX members_ref_idx ON members (ref_code);
CREATE INDEX members_created_idx ON members (created_at);

CREATE TABLE affiliates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  code TEXT NOT NULL UNIQUE CHECK (length(code) BETWEEN 3 AND 24 AND code NOT GLOB '*[^a-z0-9-]*'),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  audience TEXT,
  payout_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  percent REAL NOT NULL DEFAULT 20,
  -- The secret half of the partner's dashboard link.
  dashboard_key TEXT NOT NULL DEFAULT (lower(hex(randomblob(24)))),
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE affiliate_commissions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  affiliate_code TEXT NOT NULL REFERENCES affiliates (code) ON UPDATE CASCADE,
  member_id TEXT REFERENCES members (id) ON DELETE SET NULL,
  -- The Stripe invoice (subscriptions) or checkout session (lifetime) it came from.
  source_id TEXT NOT NULL UNIQUE,
  payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  -- owed | paid | void (the payment was refunded)
  status TEXT NOT NULL DEFAULT 'owed' CHECK (status IN ('owed', 'paid', 'void')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  paid_at TEXT
);

CREATE INDEX affiliate_commissions_code_idx ON affiliate_commissions (affiliate_code, created_at);
CREATE INDEX affiliate_commissions_pi_idx ON affiliate_commissions (payment_intent_id);
