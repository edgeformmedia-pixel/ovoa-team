-- Paid early access: memberships bought on the website with Stripe, the
-- partners who refer them, and what each partner is owed.
--
-- Every table here is written only by the server (service role), from Stripe
-- webhooks and the admin page. Row level security is on with no policies, so
-- the browser keys can read and write none of it.

CREATE TABLE public.members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  name text,
  -- monthly | annual | lifetime | comp (free access given from the admin page)
  plan text NOT NULL,
  -- Stripe's subscription statuses, plus lifetime and refunded for one-time
  -- purchases and comp for free access
  status text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  stripe_payment_intent_id text,
  checkout_session_id text UNIQUE,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  ref_code text,
  -- off (no automatic invites) | pending | invited | removed | failed
  testflight_state text NOT NULL DEFAULT 'pending',
  testflight_tester_id text,
  testflight_error text,
  testflight_updated_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT members_plan_check CHECK (plan IN ('monthly', 'annual', 'lifetime', 'comp'))
);

CREATE INDEX members_email_idx ON public.members (lower(email));
CREATE INDEX members_customer_idx ON public.members (stripe_customer_id);
CREATE INDEX members_ref_idx ON public.members (ref_code) WHERE ref_code IS NOT NULL;
CREATE INDEX members_created_idx ON public.members (created_at DESC);

CREATE TABLE public.affiliates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  audience text,
  payout_email text,
  -- pending | approved | rejected
  status text NOT NULL DEFAULT 'pending',
  percent numeric NOT NULL DEFAULT 20,
  -- The secret half of the partner's dashboard link.
  dashboard_key text NOT NULL DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliates_code_check CHECK (code ~ '^[a-z0-9-]{3,24}$'),
  CONSTRAINT affiliates_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE public.affiliate_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_code text NOT NULL REFERENCES public.affiliates (code) ON UPDATE CASCADE,
  member_id uuid REFERENCES public.members (id) ON DELETE SET NULL,
  -- The Stripe invoice (subscriptions) or checkout session (lifetime) it came from.
  source_id text NOT NULL UNIQUE,
  payment_intent_id text,
  amount_cents integer NOT NULL,
  commission_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  -- owed | paid | void (the payment was refunded)
  status text NOT NULL DEFAULT 'owed',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  CONSTRAINT affiliate_commissions_status_check CHECK (status IN ('owed', 'paid', 'void'))
);

CREATE INDEX affiliate_commissions_code_idx ON public.affiliate_commissions (affiliate_code, created_at DESC);
CREATE INDEX affiliate_commissions_pi_idx ON public.affiliate_commissions (payment_intent_id);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.members, public.affiliates, public.affiliate_commissions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.members_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER members_set_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.members_set_updated_at();

-- One click on a partner's link. A no-op for codes that aren't approved.
CREATE OR REPLACE FUNCTION public.record_affiliate_click(p_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.affiliates SET clicks = clicks + 1 WHERE code = p_code AND status = 'approved';
$$;

REVOKE ALL ON FUNCTION public.record_affiliate_click(text) FROM PUBLIC, anon, authenticated;
