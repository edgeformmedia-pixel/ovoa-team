-- Partner CPM. Same as the Supabase migration 20260923180000_partner_cpm.sql.
--
--   - affiliates.cpm_cents: what 1,000 views of a partner's posts earn them,
--     in cents. Set per partner on the admin page; 0 means no CPM.
--   - affiliate_commissions.views: the views a CPM payout was logged for
--     (source_id views:<id>). Null on payment commissions.
--
-- Apply: npm run cf:migrate

ALTER TABLE affiliates ADD COLUMN cpm_cents INTEGER NOT NULL DEFAULT 0 CHECK (cpm_cents >= 0);

ALTER TABLE affiliate_commissions ADD COLUMN views INTEGER CHECK (views IS NULL OR views > 0);
