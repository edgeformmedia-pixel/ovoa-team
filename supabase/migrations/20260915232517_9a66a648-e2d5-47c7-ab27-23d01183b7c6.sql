CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  request text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  result text,
  error text,
  question jsonb,
  answer text,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 2,
  runtime_response_id text,
  usage jsonb,
  is_example boolean NOT NULL DEFAULT false,
  idempotency_key text,
  claimed_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_status_check CHECK (status IN ('queued','working','needs_you','done','failed','cancelled'))
);

CREATE UNIQUE INDEX tasks_user_idempotency_key ON public.tasks (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX tasks_user_created_idx ON public.tasks (user_id, created_at DESC);
CREATE INDEX tasks_queue_idx ON public.tasks (status, created_at) WHERE status = 'queued';

CREATE TABLE public.task_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind text NOT NULL,
  message text NOT NULL,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX task_events_task_idx ON public.task_events (task_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
GRANT SELECT, INSERT ON public.task_events TO authenticated;
GRANT ALL ON public.task_events TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "task_events_select_own" ON public.task_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "task_events_insert_own" ON public.task_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.claim_next_task()
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
  WHERE status = 'queued' AND attempts < max_attempts
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

REVOKE ALL ON FUNCTION public.claim_next_task() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_next_task() FROM anon;
REVOKE ALL ON FUNCTION public.claim_next_task() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_task() TO service_role;