// Thin adapter over ONE OpenClaw Gateway's OpenResponses-compatible endpoint.
// Docs: https://docs.openclaw.ai/gateway/openresponses-http-api
//
// Required on the gateway side:
//   gateway.http.endpoints.responses.enabled = true
//   bearer (shared secret) auth on the gateway
//
// Isolation: one gateway instance per tenant (https://docs.openclaw.ai/gateway/multi-tenant-hosting).
// This module never picks a runtime; it is handed one that server-side routing
// already authorised (see runtime-routing.server.ts). Credentials are read from
// server env only and never leave the server.
//
// Honesty rules encoded here:
//  - a run that reports status failed/incomplete/in_progress is NOT a success
//  - a function_call in the output is a REQUEST to run a client tool, never
//    evidence that a tool ran
//  - internal gateway tools (e.g. web_fetch) usually do not appear in
//    OpenResponses output at all, so tool evidence is reported as unavailable
//  - the caller must be told explicitly whether the request was dispatched, so
//    it can decide between "safe to retry" and "may already have happened"

export type RuntimeConfig = {
  slug: string;
  baseUrl: string;
  token: string;
  agent: string;
  model: string;
};

export type RuntimeFailureReason =
  | "unconfigured"
  | "http"
  | "network"
  | "timeout"
  | "empty"
  | "run_failed"
  | "run_incomplete";

export type RuntimeOutcome =
  | {
      ok: true;
      text: string;
      responseId: string | null;
      runStatus: string | null;
      /** Tool executions the gateway *asked the client* to perform. Not proof of execution. */
      toolRequests: string[];
      /** True when the transport gives no way to know which tools actually ran. */
      toolEvidenceUnavailable: boolean;
      usage: unknown;
    }
  | {
      ok: false;
      reason: RuntimeFailureReason;
      detail: string;
      /** False = never left Ovoa, safe to retry. True = the runtime may already have acted. */
      dispatched: boolean;
      responseId?: string | null;
    };

// Per-attempt wall clock for the HTTP call to the gateway.
//
// Host budget (prepared gateway): 90s agent deadline, 100s proxy deadline.
// Ovoa's edge request budget is smaller than a long agent run, so the default
// stays just inside the proxy deadline and the endpoint does bounded work per
// invocation. Anything that needs longer than one edge request belongs to a
// durable worker calling the same endpoint (see docs/openclaw-integration-contract.md).
const DEFAULT_TIMEOUT_MS = 95_000;
const MAX_TIMEOUT_MS = 100_000;

export function requestTimeoutMs(): number {
  const raw = Number(process.env["OPENCLAW_REQUEST_TIMEOUT_MS"] ?? "");
  return Number.isFinite(raw) && raw >= 5_000 && raw <= MAX_TIMEOUT_MS ? raw : DEFAULT_TIMEOUT_MS;
}

const ENV_PREFIX = "OPENCLAW_";

/**
 * Env var names for one runtime slug, e.g. slug "TEST01":
 *   OPENCLAW_TEST01_BASE_URL   (required)
 *   OPENCLAW_TEST01_TOKEN      (required, bearer shared secret)
 *   OPENCLAW_TEST01_AGENT_ID   (optional, default "main")
 *   OPENCLAW_TEST01_MODEL      (optional, default "openclaw/default")
 */
export function runtimeConfigForSlug(slug: string): RuntimeConfig | null {
  if (!/^[A-Z0-9_]{2,40}$/.test(slug)) return null;
  const baseUrl = process.env[`${ENV_PREFIX}${slug}_BASE_URL`];
  const token = process.env[`${ENV_PREFIX}${slug}_TOKEN`];
  if (!baseUrl || !token) return null;
  return {
    slug,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    token,
    agent: process.env[`${ENV_PREFIX}${slug}_AGENT_ID`] ?? "main",
    model: process.env[`${ENV_PREFIX}${slug}_MODEL`] ?? "openclaw/default",
  };
}

const SYSTEM = `You are Ovoa, a personal agent acting on behalf of one person.

You are given an objective in ordinary language. Work out the steps yourself and use the
tools you actually have to complete it. Continue through multiple steps. If one approach
fails, try another available approach.

Absolute honesty rules:
- Never claim an action happened unless a tool you ran actually did it.
- If you could not complete the objective, say exactly what you did accomplish and what
  blocked you.
- If you lack a capability or account access, say so plainly instead of pretending.

End your reply with EXACTLY ONE of these three lines, and nothing after it:
  NEEDS_INPUT: <one short question>        (essential information is missing)
  OUTCOME: done | <one sentence saying what was actually accomplished>
  OUTCOME: blocked | <one sentence saying what stopped you>

Use "done" when you actually satisfied the objective the person asked for. That includes
read-only objectives: if they asked you to read, find, compare, summarise, list options or
draft something, and you did that from real sources, it is "done". Use "blocked" when the
objective itself was not satisfied — you could not act, could not reach what you needed,
lack the capability or account access, or only produced instructions for someone else to
follow instead of the outcome asked for.

Be terse. This is read on a phone.`;

type ResponsesPayload = {
  id?: string;
  status?: string;
  output_text?: string;
  usage?: unknown;
  incomplete_details?: { reason?: string };
  output?: Array<{
    type?: string;
    name?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string } | string | null;
};

function errorText(error: ResponsesPayload["error"]): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  return error.message ?? JSON.stringify(error);
}

function collectText(payload: ResponsesPayload): { text: string; toolRequests: string[] } {
  const parts: string[] = [];
  const toolRequests: string[] = [];

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    parts.push(payload.output_text.trim());
  }

  for (const item of payload.output ?? []) {
    // A function_call is the gateway ASKING for a client-side tool run. It is a
    // request, not a receipt, so it is never counted as work performed.
    if (item.type === "function_call" || item.type === "tool_call") {
      if (item.name) toolRequests.push(item.name);
      continue;
    }
    for (const chunk of item.content ?? []) {
      if (chunk.type === "output_text" && chunk.text?.trim()) parts.push(chunk.text.trim());
    }
  }

  return { text: [...new Set(parts)].join("\n\n").trim(), toolRequests };
}

export async function runOnRuntime(input: {
  config: RuntimeConfig;
  objective: string;
  answer?: string | null;
  /** Continues the same agent task/thread on the gateway. */
  priorResponseId?: string | null;
  /** Server-derived session key: routing inside the tenant's own gateway, never authorisation. */
  sessionId: string;
  /** Server-derived stable per-user identifier passed as `user`. */
  userKey: string;
}): Promise<RuntimeOutcome> {
  const { config } = input;
  const timeout = requestTimeoutMs();

  const userText = input.answer
    ? `Objective: ${input.objective}\n\nThe person answered your question: ${input.answer}\n\nContinue the same task and finish the objective.`
    : `Objective: ${input.objective}`;

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/v1/responses`, {
      method: "POST",
      signal: AbortSignal.timeout(timeout),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.token}`,
        "x-openclaw-agent-id": config.agent,
        "x-openclaw-session-key": input.sessionId,
      },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        instructions: SYSTEM,
        user: input.userKey,
        // Continue the same conversation/task rather than starting a new one.
        ...(input.priorResponseId ? { previous_response_id: input.priorResponseId } : {}),
        input: [{ role: "user", content: [{ type: "input_text", text: userText }] }],
      }),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    // The request WAS sent, so the agent may already have acted: dispatched=true
    // and the caller must not replay it.
    if (name === "TimeoutError" || name === "AbortError") {
      return {
        ok: false,
        reason: "timeout",
        dispatched: true,
        detail: `The agent runtime did not answer within ${Math.round(timeout / 1000)}s. The objective had already been sent, so Ovoa cannot tell whether anything was carried out.`,
      };
    }
    return {
      ok: false,
      reason: "network",
      dispatched: true,
      detail: `The connection to the agent runtime broke: ${error instanceof Error ? error.message : String(error)}. The objective may already have been received.`,
    };
  }

  // Reading the body can itself time out or the connection can drop AFTER headers
  // arrived. The run was already dispatched at that point, so this must never be
  // allowed to throw out of here and strand the task.
  let raw: string;
  try {
    raw = await response.text();
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    return {
      ok: false,
      reason: name === "TimeoutError" || name === "AbortError" ? "timeout" : "network",
      dispatched: true,
      detail: `The agent runtime accepted the objective but the reply was cut off while being read (${error instanceof Error ? error.message : String(error)}). Ovoa cannot tell whether anything was carried out.`,
    };
  }

  if (!response.ok) {
    // 401/403/404/5xx before a run starts are refusals: nothing was executed.
    const preRun = response.status === 401 || response.status === 403 || response.status === 404;
    return {
      ok: false,
      reason: "http",
      dispatched: !preRun,
      detail: `The agent runtime refused the run (HTTP ${response.status}): ${raw.slice(0, 400)}`,
    };
  }

  let payload: ResponsesPayload;
  try {
    payload = JSON.parse(raw) as ResponsesPayload;
  } catch {
    return {
      ok: false,
      reason: "empty",
      dispatched: true,
      detail: `Unreadable runtime response: ${raw.slice(0, 300)}`,
    };
  }

  const runStatus = typeof payload.status === "string" ? payload.status : null;
  const err = errorText(payload.error);
  const { text, toolRequests } = collectText(payload);

  if (err || runStatus === "failed" || runStatus === "cancelled") {
    return {
      ok: false,
      reason: "run_failed",
      dispatched: true,
      responseId: payload.id ?? null,
      detail: `The run ended without finishing (status ${runStatus ?? "failed"})${err ? `: ${err}` : ""}.`,
    };
  }

  // Only an explicit status of "completed" counts. A missing status is NOT
  // completion: incomplete / in_progress / queued / absent all mean unverified.
  if (runStatus !== "completed") {
    const why = payload.incomplete_details?.reason;
    return {
      ok: false,
      reason: "run_incomplete",
      dispatched: true,
      responseId: payload.id ?? null,
      detail: runStatus
        ? `The run did not complete (status ${runStatus}${why ? `, ${why}` : ""}), so there is no verified outcome.`
        : "The runtime did not report a completed run status, so there is no verified outcome.",
    };
  }

  if (!text) {
    return {
      ok: false,
      reason: "empty",
      dispatched: true,
      responseId: payload.id ?? null,
      detail: "The runtime returned a run with no text output, so there is no verified outcome.",
    };
  }

  return {
    ok: true,
    text,
    responseId: payload.id ?? null,
    runStatus,
    toolRequests,
    // OpenResponses does not surface the gateway's internal tool runs (web_fetch
    // and friends), so Ovoa cannot prove which tools executed.
    toolEvidenceUnavailable: true,
    usage: payload.usage ?? null,
  };
}

export type AgentOutcome = "done" | "blocked" | "unstated";

export function parseAgentText(text: string): {
  question: string | null;
  outcome: AgentOutcome;
  summary: string | null;
  body: string;
} {
  let question: string | null = null;
  let outcome: AgentOutcome = "unstated";
  let summary: string | null = null;
  const rest: string[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const needs = /^NEEDS_INPUT:\s*(.+)$/i.exec(trimmed);
    const marked = /^OUTCOME:\s*(done|blocked)\s*(?:\|\s*(.*))?$/i.exec(trimmed);

    if (needs?.[1]) {
      question = needs[1].trim();
      continue;
    }
    if (marked?.[1]) {
      outcome = marked[1].toLowerCase() === "done" ? "done" : "blocked";
      const tail = marked[2]?.trim();
      summary = tail ? tail : null;
      continue;
    }
    rest.push(line);
  }

  return { question, outcome, summary, body: rest.join("\n").trim() };
}

export type ReadinessResult =
  | { state: "verified"; detail: string }
  | { state: "unverified"; detail: string }
  | { state: "auth_failed"; detail: string };

/**
 * A real reachability + auth check against the assigned gateway. Existing env
 * values prove NOTHING about the runtime being up, so nothing may be called
 * "connected" until this returns "verified".
 */
export async function checkRuntimeReadiness(config: RuntimeConfig): Promise<ReadinessResult> {
  try {
    // The Ovoa proxy intentionally does NOT expose /v1/models; its
    // authenticated readiness endpoint is GET /readyz. (/healthz is
    // unauthenticated process readiness only and proves nothing about auth.)
    const res = await fetch(`${config.baseUrl}/readyz`, {
      method: "GET",
      signal: AbortSignal.timeout(6_000),
      headers: { authorization: `Bearer ${config.token}`, accept: "application/json" },
    });
    if (res.status === 401 || res.status === 403) {
      return { state: "auth_failed", detail: "The runtime answered but rejected Ovoa's access token." };
    }
    if (res.status === 200) {
      const body = (await res.json().catch(() => null)) as { ready?: unknown } | null;
      if (body?.ready === true) {
        return { state: "verified", detail: "The runtime answered and accepted Ovoa's access token." };
      }
      return { state: "unverified", detail: "The runtime answered but did not report itself ready." };
    }
    return { state: "unverified", detail: `The runtime answered with HTTP ${res.status}, so it is not confirmed ready.` };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    return {
      state: "unverified",
      detail:
        name === "TimeoutError" || name === "AbortError"
          ? "The runtime did not answer in time, so it is not confirmed ready."
          : `The runtime could not be reached: ${error instanceof Error ? error.message : String(error)}.`,
    };
  }
}
