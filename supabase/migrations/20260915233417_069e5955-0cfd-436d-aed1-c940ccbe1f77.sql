REVOKE ALL ON FUNCTION public.requeue_stale_tasks(INTEGER) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_next_task() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.requeue_stale_tasks(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_next_task() TO service_role;