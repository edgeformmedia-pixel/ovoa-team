-- The Plus tier (2026-09-27): between Base and Pro. members.tier's CHECK
-- allowed only base and pro, and SQLite can't change a CHECK in place, so the
-- column is remade: add the new one, copy, drop the old, rename.
--
-- Apply: npm run db:migrate

ALTER TABLE members ADD COLUMN tier_next TEXT NOT NULL DEFAULT 'base' CHECK (tier_next IN ('base', 'plus', 'pro'));
UPDATE members SET tier_next = tier;
ALTER TABLE members DROP COLUMN tier;
ALTER TABLE members RENAME COLUMN tier_next TO tier;
