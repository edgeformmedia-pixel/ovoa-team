-- Tiers and Band orders (docs/paywall/SPEC.md in ovoa-app).
--
--   - members.tier: which AI tier the membership unlocks. Rows from before
--     this change (the old ovoa_member_* prices) are Base. The plan column
--     keeps the billing period: monthly | annual | lifetime (old) | comp.
--   - band_orders: every Band sold, so the admin page shows what to ship.
--
-- Like the other membership tables, only the server (service role) reads or
-- writes these. Row level security is on with no policies.

ALTER TABLE public.members
  ADD COLUMN tier text NOT NULL DEFAULT 'base',
  ADD CONSTRAINT members_tier_check CHECK (tier IN ('base', 'pro'));

CREATE TABLE public.band_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  name text,
  phone text,
  checkout_session_id text NOT NULL UNIQUE,
  stripe_customer_id text,
  -- The payment the Band was charged in. With AI it's the subscription's first
  -- invoice, so a refund can be matched by either.
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  -- true when bought with Base AI (and its free days), false for "Band only".
  with_ai boolean NOT NULL DEFAULT false,
  ship_name text,
  ship_line1 text,
  ship_line2 text,
  ship_city text,
  ship_state text,
  ship_postal_code text,
  ship_country text,
  ref_code text,
  -- paid | shipped | refunded
  status text NOT NULL DEFAULT 'paid',
  shipped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT band_orders_status_check CHECK (status IN ('paid', 'shipped', 'refunded'))
);

CREATE INDEX band_orders_email_idx ON public.band_orders (lower(email));
CREATE INDEX band_orders_pi_idx ON public.band_orders (stripe_payment_intent_id);
CREATE INDEX band_orders_invoice_idx ON public.band_orders (stripe_invoice_id);
CREATE INDEX band_orders_created_idx ON public.band_orders (created_at DESC);

ALTER TABLE public.band_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.band_orders FROM anon, authenticated;

CREATE TRIGGER band_orders_set_updated_at BEFORE UPDATE ON public.band_orders
  FOR EACH ROW EXECUTE FUNCTION public.members_set_updated_at();
