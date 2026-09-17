import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TaskStatus = "queued" | "working" | "needs_you" | "done" | "failed" | "cancelled";

export type TaskEvent = {
  id: string;
  kind: string;
  message: string;
  created_at: string;
};

export type TaskOutcome = "completed" | "blocked" | "uncertain" | null;

export type TaskRecord = {
  id: string;
  request: string;
  status: TaskStatus;
  outcome: TaskOutcome;
  needs_reconciliation: boolean;
  result: string | null;
  error: string | null;
  question: { text: string } | null;
  answer: string | null;
  is_example: boolean;
  created_at: string;
  finished_at: string | null;
  events?: TaskEvent[];
};

const TASK_COLUMNS =
  "id, request, status, outcome, needs_reconciliation, result, error, question, answer, is_example, created_at, finished_at";

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TaskRecord[]> => {
    const { data, error } = await context.supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as TaskRecord[];
  });

export const getTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing task id");
    return { id: input.id };
  })
  .handler(async ({ data, context }): Promise<TaskRecord | null> => {
    const { data: task, error } = await context.supabase
      .from("tasks")
      .select(TASK_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!task) return null;

    const { data: events } = await context.supabase
      .from("task_events")
      .select("id, kind, message, created_at")
      .eq("task_id", data.id)
      .order("created_at", { ascending: true });

    return { ...(task as unknown as TaskRecord), events: (events ?? []) as TaskEvent[] };
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// All three mutations below go through narrow SECURITY DEFINER database
// functions. Signed-in clients hold no INSERT/UPDATE grant on tasks or
// task_events, so status, result, usage, attempts and limits are worker-owned
// and cannot be forged, and an activity entry can only ever be written against
// the caller's own task.

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { request: string; idempotencyKey: string }) => {
    const request = (input?.request ?? "").trim();
    if (!request) throw new Error("Say what you want done.");
    if (request.length > 2000) throw new Error("That request is too long.");
    if (!input?.idempotencyKey) throw new Error("Missing submission key");
    return { request, idempotencyKey: input.idempotencyKey.slice(0, 100) };
  })
  .handler(async ({ data, context }): Promise<{ id: string; duplicate: boolean }> => {
    // Same submission key = same task, enforced inside the database function.
    const { data: rows, error } = await context.supabase.rpc("create_task", {
      p_request: data.request,
      p_idempotency_key: data.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    const row = (rows as unknown as Array<{ id: string; duplicate: boolean }> | null)?.[0];
    if (!row) throw new Error("The request could not be saved.");
    return { id: row.id, duplicate: row.duplicate };
  });

export const answerTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; answer: string }) => {
    const answer = (input?.answer ?? "").trim();
    if (!input?.id || !UUID.test(input.id)) throw new Error("Missing task id");
    if (!answer) throw new Error("Missing answer");
    return { id: input.id, answer: answer.slice(0, 2000) };
  })
  .handler(async ({ data, context }) => {
    // The answer goes back to the agent: the same task continues with the
    // original objective plus this answer, and is not marked done.
    const { data: ok, error } = await context.supabase.rpc("answer_task", {
      p_task_id: data.id,
      p_answer: data.answer,
    });
    if (error) throw new Error(error.message);
    if (ok !== true) throw new Error("That request is no longer waiting on an answer.");
    return { ok: true };
  });

export const cancelTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id || !UUID.test(input.id)) throw new Error("Missing task id");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { data: ok, error } = await context.supabase.rpc("cancel_task", {
      p_task_id: data.id,
    });
    if (error) throw new Error(error.message);
    // A task already sent to the runtime cannot be cancelled after the fact.
    return { ok: ok === true };
  });

// Whether THIS account has its own provisioned, reachable runtime. Nothing about
// the runtime (address, token, agent, session) is ever returned to the browser.
export const runtimeStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ connected: boolean; state: string; message: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveRuntimeForUser } = await import("./runtime-routing.server");
    const { checkRuntimeReadiness } = await import("./openclaw.server");
    const routed = await resolveRuntimeForUser(supabaseAdmin as never, context.userId);
    if (routed.state !== "ready") {
      return { connected: false, state: routed.state, message: routed.message };
    }

    // Having an address and a token on the server is NOT a connection. Only a
    // successful live check may be reported as connected.
    const probe = await checkRuntimeReadiness(routed.config);
    if (probe.state === "verified") {
      return { connected: true, state: "ready", message: "Your agent runtime answered and is ready." };
    }
    return {
      connected: false,
      state: probe.state === "auth_failed" ? "auth_failed" : "configured_unverified",
      message:
        probe.state === "auth_failed"
          ? `Your agent runtime is set up but Ovoa is not allowed in yet. ${probe.detail}`
          : `Your agent runtime is set up but not confirmed working yet. ${probe.detail}`,
    };
  });
