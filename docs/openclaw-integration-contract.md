# Ovoa ↔ OpenClaw integration contract

Status: Ovoa backend ready. External gateway: OpenClaw 2026.9.4 installed locally
(local-first, no paid cloud); Gateway startup/API/auth verified. Claude API key entry
script exists; key and network reachability from Ovoa still pending.

Everything below is decided server-side. The browser never sends, chooses or sees a
gateway address, token, agent id, session key, model, or another user's data.

---

## 1. Tenant isolation

Per https://docs.openclaw.ai/gateway/multi-tenant-hosting: one complete, isolated
OpenClaw instance per tenant. Sessions are **routing, not authorisation**, so unrelated
Ovoa users are never placed on one gateway with different session ids.

Mapping: `public.runtime_assignments (user_id → runtime_slug, is_active)`.

- Written only by `service_role`; a user may read only their own row.
- No row / inactive row → `not_provisioned`: the task fails honestly, nothing is sent.
- Row present but env vars missing → `unconfigured`: same, honest failure.
- There is never a fallback to another tenant's gateway, another agent, or another
  model provider (no Gemini/Lovable AI substitution anywhere in this path).

For the first proof exactly one assignment exists, for the designated test user. Every
other account shows "no runtime provisioned for this account yet".

## 2. Authenticated user → runtime

```
Supabase JWT (user id)
  → runtime_assignments.runtime_slug        (server read, service role)
  → OPENCLAW_<SLUG>_* env                   (server-only credentials)
  → POST {BASE_URL}/v1/responses
     header x-openclaw-agent-id: <AGENT_ID, default "main">
     header x-openclaw-session-key: ovoa-u-<user_uuid>-t-<task_uuid>  (server-derived,
                                    PER TASK: unrelated tasks never share a conversation;
                                    clarification turns of one task reuse the same key)
     body   user: ovoa-user-<user_uuid>                     (server-derived)
     body   previous_response_id: <tasks.runtime_response_id>  (same task continues)
```

## 3. Required secret NAMES (values never in code, never logged)

Per runtime slug (slug matches `^[A-Z0-9_]{2,40}$`):

| Name | Required | Default |
| --- | --- | --- |
| `OPENCLAW_<SLUG>_BASE_URL` | yes | — |
| `OPENCLAW_<SLUG>_TOKEN` | yes (bearer shared secret) | — |
| `OPENCLAW_<SLUG>_AGENT_ID` | no | `main` |
| `OPENCLAW_<SLUG>_MODEL` | no | `openclaw/default` |

Global:

| Name | Purpose |
| --- | --- |
| `OPENCLAW_REQUEST_TIMEOUT_MS` | per-attempt deadline, clamped 5 000–100 000, default 95 000 |
| — | readiness: `GET {BASE_URL}/readyz` with the same bearer, 6 s, used only to report readiness |
| `OVOA_WORKER_TOKEN` | bearer for a scheduler or durable worker (optional; `LOVABLE_CRON_SECRET` also accepted) |

### Readiness reporting

Env values existing prove nothing. The Ovoa proxy intentionally does **not**
expose `GET /v1/models`; its authenticated readiness endpoint is
`GET {BASE_URL}/readyz` with the same bearer token. (`GET /healthz` is
unauthenticated process readiness only and proves nothing about auth or agent
readiness.) Only HTTP 200 with JSON `{"ready": true}` reports `ready` /
connected. 401/403 reports `auth_failed`; any other status, a 200 without
`ready: true`, a timeout, or an unreachable host reports
`configured_unverified`.

## 4. Gateway expectations

- `gateway.http.endpoints.responses.enabled = true`
- bearer (shared secret) auth
- `POST /v1/responses`, non-streaming, agent forced to `main`
- honours `user`, `previous_response_id`, `x-openclaw-session-key`
- 90 s agent deadline, 100 s proxy deadline, one concurrent run
- initial tool set: `web_fetch` only

## 5. Request budget and the durable-worker boundary

`POST /api/public/hooks/run-tasks` is an edge request, **not** a long-running process.

- default per-attempt deadline 95 s, hard ceiling 100 s — these are the **gateway's**
  90 s agent / 100 s proxy deadlines. Ovoa's own hosting request limit is **unverified**;
  100 s must not be described as a known host budget
- **every** invocation, signed-in kick or worker token, claims at most **one** task in
  this initial proof, so one invocation can never chain two ~95 s gateway calls
- objectives needing more than one turn continue across invocations through
  `previous_response_id` (clarifications) — they are never restarted from scratch

**Upgrade boundary:** any objective needing a single continuous run longer than the
gateway's 90 s agent deadline cannot be served from the edge. That requires a durable
worker (long-lived process or queue consumer) holding the bearer worker token and
calling the same endpoint / claim functions, plus streaming or webhook completion from
the gateway. Nothing in the schema changes for that: `tasks`, `task_events`,
`claim_next_task`, and `recover_stale_tasks` are already worker-shaped.

### Non-success cases (all `dispatched: true`, never replayed)

- header timeout/network failure, **and** a body-read timeout/disconnect after headers
- `status` anything other than `completed` — a **missing** status is not completion
- `error` set, `failed`, `cancelled`, empty text
- a pending `function_call` / `tool_call` request: the gateway asked for a client-side
  tool Ovoa did not run, so the task is `blocked` even if the text says `OUTCOME: done`

### Outcome semantics

`done` means the objective the person actually asked for was satisfied — including
read-only objectives (read, find, compare, summarise, list options, draft). `blocked`
means the objective was not satisfied. No outcome line → `uncertain`.

## 6. Who may write what

Signed-in clients hold **no** INSERT/UPDATE/DELETE grant on `tasks` or `task_events`.
Status, result, error, outcome, usage, attempts, max_attempts, response id and
timestamps are worker-owned. Users act through three `SECURITY DEFINER` functions that
resolve identity from `auth.uid()` and verify ownership:

| Function | Rule |
| --- | --- |
| `create_task(request, idempotency_key)` | validates length; same key + same user = same task (`duplicate: true`) |
| `answer_task(task_id, answer)` | only own task, only from `needs_you`; re-queues the same task with the answer |
| `cancel_task(task_id)` | only own task, only from `queued`/`needs_you` (a dispatched run cannot be un-dispatched) |

Worker-only (`service_role` EXECUTE, revoked from `anon`/`authenticated`):
`claim_next_task()`, `claim_next_task_for_user(user_id)`, `recover_stale_tasks(lease_seconds)`.

`claim_next_task_for_user` exists so a signed-in kick can never claim, start or learn
about another user's task; cross-user queue draining is worker-token only.

## 7. Outcome semantics (no optimistic success)

`tasks.status` ∈ `queued | working | needs_you | done | failed | cancelled`
`tasks.outcome` ∈ `completed | blocked | uncertain | null`, plus
`tasks.needs_reconciliation boolean`.

The agent must end its reply with exactly one of:

```
NEEDS_INPUT: <question>
OUTCOME: done | <what was actually carried out>
OUTCOME: blocked | <what stopped it>
```

Mapping:

| Runtime result | status | outcome | reconcile |
| --- | --- | --- | --- |
| `OUTCOME: done` | `done` | `completed` | no |
| `OUTCOME: blocked` ("I could not book it") | `failed` | `blocked` | no |
| no outcome line, only prose | `failed` | `uncertain` | yes |
| payload `status: failed`/`cancelled` or `error` set | `failed` | `uncertain` | yes |
| payload `status: incomplete`/`in_progress` | `failed` | `uncertain` | yes |
| empty/unreadable body | `failed` | `uncertain` | yes |
| timeout or network break after dispatch | `failed` | `uncertain` | yes |
| routing `not_provisioned` / `unconfigured` | `failed` | `blocked` | no |
| pre-run refusal (401/403/404) | requeued, or `failed`+`blocked` on last attempt | | |

Text alone never produces success. "RESULT: I could not book it" is not done.

## 8. Retry and recovery — never blind replay

- Failures **before** dispatch (routing, 401/403/404) never reached the gateway, so they
  are safe to requeue until `attempts >= max_attempts`.
- Failures **after** dispatch (timeout, dropped connection, unreadable or failed run)
  are never requeued: the agent may already have acted. The task is closed as
  `failed` / `uncertain` with `needs_reconciliation = true` and text telling the person
  to check the place the action would have happened before asking again.
- `recover_stale_tasks(lease_seconds = 300)` closes rows stuck in `working` the same
  way and logs an `uncertain` event. It does not re-send them.

## 9. Tool evidence

An OpenResponses `function_call` output is a **request** for a client-side tool run, not
a receipt. It is recorded as `tool_request` ("a request, not proof it ran"). The
gateway's internal tools (`web_fetch`) do not appear in OpenResponses output at all, so
each run also records that tool-by-tool evidence is unavailable rather than implying
tools ran.

## 10. Privacy of the public MCP endpoint

`/mcp` is unauthenticated and therefore exposes only static product information
(`about_ovoa`). No task, note, signal or account data, and no task-creating tool.

## 11. Verified by negative tests

Direct client INSERT on `tasks` → 403. Client PATCH forging
`status`/`result`/`attempts`/`max_attempts`/`usage` → 403. Client INSERT into
`task_events`, own or cross-user → 403. Reading another user's task → empty.
`answer_task` / `cancel_task` on another user's task → `false`. `claim_next_task`,
`claim_next_task_for_user`, `recover_stale_tasks` as a signed-in user → 403. Runner
without a bearer token → 401. Runner as user B with user A's task queued → nothing
processed. Runner as user A → honest `not_provisioned` failure, no fabricated result.
Adapter unit tests cover `previous_response_id` continuation, session/user/agent
headers, `status: failed`, `status: incomplete`, timeout marked dispatched, 401 marked
not dispatched, `function_call` treated as a request only, empty output, and
`blocked` vs `done` parsing.
