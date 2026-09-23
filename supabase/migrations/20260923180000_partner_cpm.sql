-- Partner CPM.
--
--   - affiliates.cpm_cents: what 1,000 views of a partner's posts earn them,
--     in cents. Set per partner on the admin page; 0 means no CPM.
--   - affiliate_commissions.views: the views a CPM payout was logged for
--     (source_id views:<id>). Null on payment commissions, which also cover
--     Bands now (source_id band:<checkout session>).
--
-- New partners start at 15% (AFFILIATE_PERCENT in src/lib/membership/plans.ts,
-- which the apply form writes); the column default follows it.

ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS cpm_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.affiliates DROP CONSTRAINT IF EXISTS affiliates_cpm_check;
ALTER TABLE public.affiliates ADD CONSTRAINT affiliates_cpm_check CHECK (cpm_cents >= 0);
ALTER TABLE public.affiliates ALTER COLUMN percent SET DEFAULT 15;

ALTER TABLE public.affiliate_commissions ADD COLUMN IF NOT EXISTS views integer;
ALTER TABLE public.affiliate_commissions DROP CONSTRAINT IF EXISTS affiliate_commissions_views_check;
ALTER TABLE public.affiliate_commissions
  ADD CONSTRAINT affiliate_commissions_views_check CHECK (views IS NULL OR views > 0);
