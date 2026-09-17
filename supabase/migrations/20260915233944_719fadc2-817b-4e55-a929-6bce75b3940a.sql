-- 1. Worker-owned data is no longer client-writable ------------------------
REVOKE INSERT, UPDATE, DELETE ON public.tasks FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.task_events FROM authenticated;

DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
DROP POLICY IF EXISTS "task_events_insert_own" ON public.task_events;

-- 2. Explicit outcome semantics -------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS needs_reconciliation BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_outcome_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_outcome_check
  CHECK (outcome IS NULL OR outcome IN ('completed', 'blocked', 'uncertain'));

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('queued', 'working', 'needs_you', 'done', 'failed', 'cancelled'));

-- 3. Narrow, ownership-verified user operations ----------------------------
CREATE OR REPLACE FUNCTION public.create_task(p_request TEXT, p_idempotency_key TEXT)
RETURNS TABLE (id UUID, duplicate BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_request TEXT := btrim(coalesce(p_request, ''));
  v_key TEXT := btrim(coalesce(p_idempotency_key, ''));
  v_existing UUID;
  v_new UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF v_request = '' OR length(v_request) > 2000 THEN
    RAISE EXCEPTION 'Request must be between 1 and 2000 characters';
  END IF;
  IF v_key = '' OR length(v_key) > 100 THEN
    RAISE EXCEPTION 'Missing or invalid submission key';
  END IF;

  SELECT t.id INTO v_existing
  FROM public.tasks t
  WHERE t.user_id = v_user AND t.idempotency_key = v_key
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT v_existing, true;
    RETURN;
  END IF;

  INSERT INTO public.tasks (user_id, request, status, idempotency_key)
  VALUES (v_user, v_request, 'queued', v_key)
  RETURNING tasks.id INTO v_new;

  INSERT INTO public.task_events (task_id, user_id, kind, message)
  VALUES (v_new, v_user, 'received', 'Ovoa received the request and queued it.');

  RETURN QUERY SELECT v_new, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.answer_task(p_task_id UUID, p_answer TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_answer TEXT := btrim(coalesce(p_answer, ''));
  v_updated UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF v_answer = '' OR length(v_answer) > 2000 THEN
    RAISE EXCEPTION 'Answer must be between 1 and 2000 characters';
  END IF;

  UPDATE public.tasks t
  SET answer = v_answer,
      status = 'queued',
      question = NULL,
      error = NULL,
      outcome = NULL,
      claimed_at = NULL,
      max_attempts = LEAST(t.max_attempts + 1, 6)
  WHERE t.id = p_task_id
    AND t.user_id = v_user
    AND t.status = 'needs_you'
  RETURNING t.id INTO v_updated;

  IF v_updated IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.task_events (task_id, user_id, kind, message)
  VALUES (v_updated, v_user, 'answered', 'You answered: ' || v_answer);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_updated UUID;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  UPDATE public.tasks t
  SET status = 'cancelled',
      finished_at = now(),
      question = NULL
  WHERE t.id = p_task_id
    AND t.user_id = v_user
    AND t.status IN ('queued', 'needs_you')
  RETURNING t.id INTO v_updated;

  IF v_updated IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.task_events (task_id, user_id, kind, message)
  VALUES (v_updated, v_user, 'cancelled', 'You cancelled this request.');

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_task(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.answer_task(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_task(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_task(TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.answer_task(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_task(UUID) TO authenticated, service_role;

-- 4. Per-user claim so a user kick can never touch another user's queue ----
CREATE OR REPLACE FUNCTION public.claim_next_task_for_user(p_user_id UUID)
RETURNS public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed public.tasks;
BEGIN
  SELECT * INTO claimed
  FROM public.tasks
  WHERE user_id = p_user_id
    AND status = 'queued'
    AND attempts < max_attempts
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF claimed.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.tasks
  SET status = 'working',
      attempts = attempts + 1,
      claimed_at = now(),
      started_at = COALESCE(started_at, now())
  WHERE id = claimed.id
  RETURNING * INTO claimed;

  RETURN claimed;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_next_task_for_user(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_task_for_user(UUID) TO service_role;

-- 5. Stale recovery WITHOUT blind replay -----------------------------------
-- A row stuck in 'working' was already dispatched to the agent runtime, so the
-- action may have happened. It is never silently re-run: it is closed as
-- uncertain and flagged for reconciliation.
DROP FUNCTION IF EXISTS public.requeue_stale_tasks(INTEGER);

CREATE OR REPLACE FUNCTION public.recover_stale_tasks(lease_seconds INTEGER DEFAULT 300)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  WITH stale AS (
    SELECT id
    FROM public.tasks
    WHERE status = 'working'
      AND claimed_at < now() - make_interval(secs => lease_seconds)
    FOR UPDATE SKIP LOCKED
  ), updated AS (
    UPDATE public.tasks t
    SET status = 'failed',
        outcome = 'uncertain',
        needs_reconciliation = true,
        error = 'This run was cut off after the objective had already been sent to the agent, so Ovoa cannot tell whether anything was carried out. It was not repeated, because repeating it could duplicate a real action. Check the place the action would have happened before asking again.',
        finished_at = now(),
        claimed_at = NULL
    FROM stale s
    WHERE t.id = s.id
    RETURNING t.id, t.user_id
  ), logged AS (
    INSERT INTO public.task_events (task_id, user_id, kind, message)
    SELECT u.id, u.user_id, 'uncertain',
           'The run was interrupted after dispatch. Ovoa did not repeat it, to avoid doing something twice.'
    FROM updated u
    RETURNING 1
  )
  SELECT count(*) INTO affected FROM logged;

  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.recover_stale_tasks(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_stale_tasks(INTEGER) TO service_role;