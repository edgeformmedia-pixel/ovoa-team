-- Tiers and Band orders (docs/paywall/SPEC.md in ovoa-app).
--
--   - members.tier: which AI tier the membership unlocks. Rows from before
--     this change (the old ovoa_member_* prices) are Base. The plan column
--     keeps the billing period: monthly | annual | lifetime (old) | comp.
--   - band_orders: every Band sold, so the admin page shows what to ship.
--
-- Apply: npm run cf:migrate

ALTER TABLE members ADD COLUMN tier TEXT NOT NULL DEFAULT 'base' CHECK (tier IN ('base', 'pro'));

CREATE TABLE band_orders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  -- The payment the Band was charged in. With AI it's the subscription's first
  -- invoice, so a refund can be matched by either.
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  -- 1 when bought with Base AI (and its free days), 0 for "Band only".
  with_ai INTEGER NOT NULL DEFAULT 0,
  ship_name TEXT,
  ship_line1 TEXT,
  ship_line2 TEXT,
  ship_city TEXT,
  ship_state TEXT,
  ship_postal_code TEXT,
  ship_country TEXT,
  ref_code TEXT,
  -- paid | shipped | refunded
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'shipped', 'refunded')),
  shipped_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX band_orders_email_idx ON band_orders (email);
CREATE INDEX band_orders_pi_idx ON band_orders (stripe_payment_intent_id);
CREATE INDEX band_orders_invoice_idx ON band_orders (stripe_invoice_id);
CREATE INDEX band_orders_created_idx ON band_orders (created_at);
