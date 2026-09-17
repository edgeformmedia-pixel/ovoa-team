import { supabase } from "@/integrations/supabase/client";

// Nudges the server-side runner so a freshly queued task starts immediately.
// Best effort only: the work itself happens on the server, and the scheduled
// backstop picks up anything this call misses.
export async function kickRunner() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  try {
    await fetch("/api/public/hooks/run-tasks", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      keepalive: true,
    });
  } catch {
    // ignored — the task is already saved server-side
  }
}
