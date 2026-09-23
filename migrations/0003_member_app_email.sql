-- The email of the OVOA app account a membership unlocks, when it isn't the
-- email the member paid with. Same as the Supabase migration
-- 20260923120000_member_app_email.sql.
--
-- Apply: npm run cf:migrate

ALTER TABLE members ADD COLUMN app_email TEXT;

CREATE INDEX members_app_email_idx ON members (app_email);
