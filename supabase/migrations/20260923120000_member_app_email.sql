-- The email of the OVOA app account a membership unlocks, when it isn't the
-- email the member paid with (Apple Pay or Link filled in another address, or
-- they already had an app account). Set from the welcome page, or by support
-- on the admin page. Null: the app account with the paying email gets it.
--
-- /api/public/membership answers for coalesce(app_email, email), so a
-- membership moved to another app account no longer counts for the payer's.

ALTER TABLE public.members ADD COLUMN IF NOT EXISTS app_email text;

CREATE INDEX IF NOT EXISTS members_app_email_idx ON public.members (app_email)
  WHERE app_email IS NOT NULL;
