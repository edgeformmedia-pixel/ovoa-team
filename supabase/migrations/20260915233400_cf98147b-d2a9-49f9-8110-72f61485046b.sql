-- Which runtime a given user is authorised to use. One runtime per tenant, per
-- OpenClaw multi-tenant guidance: sessions are routing, not authorization.
CREATE TABLE public.runtime_assignments (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  runtime_slug TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  provisioned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT runtime_assignments_slug_shape CHECK (runtime_slug ~ '^[A-Z0-9_]{2,40}$')
);

-- Read-own only. Assignments are created and revoked by the operator through
-- the service role, never from the app.
GRANT SELECT ON public.runtime_assignments TO authenticated;
GRANT ALL ON public.runtime_assignments TO service_role;

ALTER TABLE public.runtime_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY runtime_assignments_select_own
  ON public.runtime_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER runtime_assignments_set_updated_at
  BEFORE UPDATE ON public.runtime_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_runtime_assignments_slug ON public.runtime_assignments (runtime_slug);

-- Recovery: a runner that dies, times out, or is cut off mid-request leaves a
-- task in 'working'. Anything past its lease goes back to the queue, or fails
-- once attempts are exhausted.
CREATE OR REPLACE FUNCTION public.requeue_stale_tasks(lease_seconds INTEGER DEFAULT 900)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  WITH stale AS (
    SELECT id, attempts, max_attempts
    FROM public.tasks
    WHERE status = 'working'
      AND claimed_at < now() - make_interval(secs => lease_seconds)
    FOR UPDATE SKIP LOCKED
  ), updated AS (
    UPDATE public.tasks t
    SET status = CASE WHEN s.attempts >= s.max_attempts THEN 'failed' ELSE 'queued' END,
        error = CASE
          WHEN s.attempts >= s.max_attempts
          THEN 'The run stopped partway through and ran out of attempts, so nothing was completed.'
          ELSE t.error
        END,
        finished_at = CASE WHEN s.attempts >= s.max_attempts THEN now() ELSE t.finished_at END,
        claimed_at = NULL
    FROM stale s
    WHERE t.id = s.id
    RETURNING t.id
  )
  SELECT count(*) INTO affected FROM updated;

  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.requeue_stale_tasks(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.requeue_stale_tasks(INTEGER) TO service_role;