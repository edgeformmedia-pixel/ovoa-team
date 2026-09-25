-- The affiliate application (ovoa.ai/affiliates) asks where someone's audience
-- is, links to it and roughly how big it is, so applications can be sorted at a
-- glance in the affiliate inbox on admin.ovoa.ai. That Worker binds this
-- database as SITE_DB: it reads applications and sets status, percent and
-- cpm_cents. Its notes and history stay in its own database.
--
--   - platform: youtube | tiktok | instagram | x | linkedin | newsletter |
--     podcast | website | community | other (AFFILIATE_PLATFORMS in plans.ts)
--   - links: the channel, profile or site they gave, one per line
--   - audience_size: under-1k | 1k-10k | 10k-100k | 100k-1m | over-1m
--   - reviewed_at: when it was last approved or rejected
--
-- Rows from before this change have none of them.
--
-- Apply: npm run db:migrate

ALTER TABLE affiliates ADD COLUMN platform TEXT;

ALTER TABLE affiliates ADD COLUMN links TEXT;

ALTER TABLE affiliates ADD COLUMN audience_size TEXT;

ALTER TABLE affiliates ADD COLUMN reviewed_at TEXT;

CREATE INDEX affiliates_status_idx ON affiliates (status, created_at);

CREATE INDEX affiliates_email_idx ON affiliates (email);
