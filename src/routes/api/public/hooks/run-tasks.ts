import { createFileRoute } from "@tanstack/react-router";

// Background runner. Claims queued tasks (FOR UPDATE SKIP LOCKED), routes each
// one to the runtime its OWNER is authorised to use, and records the real
// outcome. Runs server-side, so work continues after the app is closed.
//
// Callers (all bearer-authenticated, all routing decided server-side):
//   - the app, right after saving a task: a signed-in Supabase token, which
//     claims ONLY that user's own queued tasks (claim_next_task_for_user)
//   - a scheduler backstop or a separate durable worker: LOVABLE_CRON_SECRET or
//     OVOA_WORKER_TOKEN, which may process the cross-user queue
//
// This HTTP handler is explicitly NOT a long-running process. For this initial
// proof EVERY invocation, worker or user, processes at most ONE claimed task, so
// a single invocation can never chain multiple ~95s gateway calls.
//
// The 90s agent / 100s proxy deadlines are the PREPARED GATEWAY's own limits.
// Ovoa's actual hosting request limit is UNVERIFIED; do not treat 100s as a
// known host budget. Objectives needing longer than one turn require the durable
// worker upgrade documented in docs/openclaw-integration-contract.md.
//
// Recovery never replays a dispatched run: see recover_stale_tasks.

const LEASE_SECONDS = 300;
// Gateway-side proxy deadline, used only to bound one attempt. NOT a verified
// limit of the platform hosting this handler.
const GATEWAY_PROXY_DEADLINE_MS = 100_000;
const MAX_TASKS_PER_INVOCATION = 1;

type ClaimedTask = {
  id: string;
  user_id: string;
  request: string;
  answer: string | null;
  attempts: number;
  max_attempts: number;
  runtime_response_id: string | null;
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type Auth =
  | { ok: false }
  | { ok: true; worker: true }
  | { ok: true; worker: false; userId: string };

async function authorize(request: Request): Promise<Auth> {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return { ok: false };

  for (const name of ["LOVABLE_CRON_SECRET", "OVOA_WORKER_TOKEN"]) {
    const secret = process.env[name];
    if (secret && timingSafeEqual(token, secret)) return { ok: true, worker: true };
  }

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { ok: false };

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { ok: false };
  const user = (await res.json()) as { id?: string };
  if (!user?.id) return { ok: false };
  return { ok: true, worker: false, userId: user.id };
}

export const Route = createFileRoute("/api/public/hooks/run-tasks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorize(request);
        if (!auth.ok) return new Response("Unauthorized", { status: 401 });

        const startedAt = Date.now();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runOnRuntime, parseAgentText } = await import("@/lib/openclaw.server");
        const { resolveRuntimeForUser, sessionKeyForTask } = await import(
          "@/lib/runtime-routing.server"
        );

        // Recovery is queue-wide bookkeeping, so only the worker performs it.
        // It closes interrupted runs as uncertain; it never re-sends them.
        let recovered = 0;
        if (auth.worker) {
          const { data } = await supabaseAdmin.rpc("recover_stale_tasks", {
            lease_seconds: LEASE_SECONDS,
          });
          recovered = Number(data ?? 0);
        }

        const processed: string[] = [];

        for (let i = 0; i < MAX_TASKS_PER_INVOCATION; i++) {
          // A signed-in kick can only ever claim its own queued work.
          const claim = auth.worker
            ? await supabaseAdmin.rpc("claim_next_task")
            : await supabaseAdmin.rpc("claim_next_task_for_user", { p_user_id: auth.userId });

          if (claim.error) return Response.json({ error: claim.error.message }, { status: 500 });
          const task = claim.data as unknown as ClaimedTask | null;
          if (!task?.id) break;

          const event = (kind: string, message: string, data?: unknown) =>
            supabaseAdmin.from("task_events").insert({
              task_id: task.id,
              user_id: task.user_id,
              kind,
              message,
              data: data === undefined ? null : (data as never),
            });

          const finish = (patch: Record<string, unknown>) =>
            supabaseAdmin.from("tasks").update(patch as never).eq("id", task.id);

          // Routing decided here, server-side, from the task owner's identity.
          const routed = await resolveRuntimeForUser(supabaseAdmin as never, task.user_id);
          if (routed.state !== "ready") {
            await event("failed", routed.message);
            await finish({
              status: "failed",
              outcome: "blocked",
              error: routed.message,
              finished_at: new Date().toISOString(),
            });
            processed.push(`${task.id}:${routed.state}`);
            continue;
          }

          await event("working", "Sent the objective to this account's agent runtime.");

          const outcome = await runOnRuntime({
            config: routed.config,
            // Session key is derived per TASK from the authenticated owner and the
            // claimed task id, so unrelated tasks never share one conversation.
            // Clarification turns of this task reuse it with previous_response_id.
            sessionId: sessionKeyForTask(task.user_id, task.id),
            userKey: routed.userKey,
            objective: task.request,
            answer: task.answer,
            // Continue the same agent task/thread across turns.
            priorResponseId: task.runtime_response_id,
          });

          if (!outcome.ok) {
            // A dispatched attempt is NEVER auto-requeued: the agent may already
            // have acted, and replaying could do it twice. It is closed as
            // uncertain with reconciliation guidance instead.
            if (outcome.dispatched) {
              const detail = `${outcome.detail} Ovoa did not repeat it, because repeating it could carry out the same action twice. Check the place the action would have happened before asking again.`;
              await event("uncertain", detail);
              await finish({
                status: "failed",
                outcome: "uncertain",
                needs_reconciliation: true,
                error: detail,
                claimed_at: null,
                ...(outcome.responseId ? { runtime_response_id: outcome.responseId } : {}),
                finished_at: new Date().toISOString(),
              });
              processed.push(`${task.id}:uncertain:${outcome.reason}`);
              continue;
            }

            // Nothing left Ovoa, so retrying is safe.
            const lastTry = task.attempts >= task.max_attempts;
            await event("failed", outcome.detail);
            await finish({
              status: lastTry ? "failed" : "queued",
              ...(lastTry ? { outcome: "blocked", finished_at: new Date().toISOString() } : {}),
              error: outcome.detail,
              claimed_at: null,
            });
            processed.push(`${task.id}:${lastTry ? "failed" : "requeued"}:${outcome.reason}`);
            continue;
          }

          // A function_call is a REQUEST to run a client tool, never a receipt.
          for (const name of outcome.toolRequests) {
            await event("tool_request", `Runtime asked to run the tool "${name}" (a request, not proof it ran).`);
          }
          if (outcome.toolEvidenceUnavailable) {
            await event(
              "note",
              "The runtime does not report which of its own tools ran, so Ovoa cannot show tool-by-tool evidence for this run.",
            );
          }

          const parsed = parseAgentText(outcome.text);
          const shared = {
            runtime_response_id: outcome.responseId,
            usage: (outcome.usage ?? null) as never,
          };

          if (parsed.question) {
            await event("needs_you", parsed.question);
            await finish({
              ...shared,
              status: "needs_you",
              question: { text: parsed.question },
              outcome: null,
              claimed_at: null,
            });
            processed.push(`${task.id}:needs_you`);
            continue;
          }

          const body = parsed.body;
          if (body) await event("progress", body.slice(0, 4000));

          // A pending tool REQUEST means the gateway asked for a client-side tool
          // run that Ovoa did not perform, so the objective cannot be complete —
          // whatever the text claims.
          if (outcome.toolRequests.length > 0) {
            const pending = `The runtime asked Ovoa to run tools it cannot run (${outcome.toolRequests.join(", ")}), so the objective was not carried through.`;
            await event("blocked", pending);
            await finish({
              ...shared,
              status: "failed",
              outcome: "blocked",
              result: null,
              error: `${pending}\n\nWhat it said:\n${body.slice(0, 3000)}`,
              finished_at: new Date().toISOString(),
            });
            processed.push(`${task.id}:tool_request_pending`);
            continue;
          }

          if (parsed.outcome === "done") {
            await finish({
              ...shared,
              status: "done",
              outcome: "completed",
              result: (parsed.summary ?? body).slice(0, 4000),
              error: null,
              needs_reconciliation: false,
              finished_at: new Date().toISOString(),
            });
            processed.push(`${task.id}:done`);
            continue;
          }

          if (parsed.outcome === "blocked") {
            // Text exists, but the objective was NOT carried out.
            const why = (parsed.summary ?? body ?? "The agent could not carry this out.").slice(0, 4000);
            await event("blocked", why);
            await finish({
              ...shared,
              status: "failed",
              outcome: "blocked",
              result: null,
              error: why,
              finished_at: new Date().toISOString(),
            });
            processed.push(`${task.id}:blocked`);
            continue;
          }

          // No explicit outcome line: Ovoa will not guess that it succeeded.
          const unstated =
            "The agent replied but did not state whether the objective was actually carried out, so Ovoa cannot confirm it. Check before treating it as done.";
          await event("uncertain", unstated);
          await finish({
            ...shared,
            status: "failed",
            outcome: "uncertain",
            needs_reconciliation: true,
            result: null,
            error: `${unstated}\n\nWhat it said:\n${body.slice(0, 3000)}`,
            finished_at: new Date().toISOString(),
          });
          processed.push(`${task.id}:unstated`);
        }

        return Response.json({
          processed,
          recovered,
          worker: auth.worker,
          gateway_proxy_deadline_ms: GATEWAY_PROXY_DEADLINE_MS,
          host_request_budget_ms: null,
          elapsed_ms: Date.now() - startedAt,
        });
      },
    },
  },
});
