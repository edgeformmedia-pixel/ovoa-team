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
  v_new UUID;
  v_existing UUID;
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

  -- Race-safe: two concurrent submissions with the same key cannot both insert,
  -- and the loser gets the winner's row instead of a unique-violation error.
  INSERT INTO public.tasks (user_id, request, status, idempotency_key)
  VALUES (v_user, v_request, 'queued', v_key)
  ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
  DO NOTHING
  RETURNING tasks.id INTO v_new;

  IF v_new IS NOT NULL THEN
    INSERT INTO public.task_events (task_id, user_id, kind, message)
    VALUES (v_new, v_user, 'received', 'Ovoa received the request and queued it.');
    RETURN QUERY SELECT v_new, false;
    RETURN;
  END IF;

  SELECT t.id INTO v_existing
  FROM public.tasks t
  WHERE t.user_id = v_user AND t.idempotency_key = v_key
  LIMIT 1;

  IF v_existing IS NULL THEN
    RAISE EXCEPTION 'Could not save the request, please try again';
  END IF;

  RETURN QUERY SELECT v_existing, true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_task(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_task(TEXT, TEXT) TO authenticated, service_role;