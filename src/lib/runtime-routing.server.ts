// Server-controlled routing from an authenticated user to the runtime they are
// authorised to use.
//
// Rules (per https://docs.openclaw.ai/gateway/multi-tenant-hosting):
//  - One isolated OpenClaw instance per tenant. Unrelated users NEVER share a
//    gateway with only different session ids; sessions are routing, not auth.
//  - The client never sends a base URL, agent id, session id or token. The only
//    thing a request carries is the user's Supabase identity.
//  - The mapping lives in public.runtime_assignments (service-role writes only).
//    Credentials live in server env, keyed by the assigned slug.
//  - No assignment => "not_provisioned". Assignment whose env vars are missing
//    => "unconfigured". Neither ever falls back to another user's runtime or to
//    a different model provider.

import type { SupabaseClient } from "@supabase/supabase-js";
import { runtimeConfigForSlug, type RuntimeConfig } from "./openclaw.server";

export type RuntimeResolution =
  | { state: "ready"; config: RuntimeConfig; userKey: string }
  | { state: "not_provisioned"; message: string }
  | { state: "unconfigured"; slug: string; message: string };

/**
 * Session keys are TASK-scoped, never user-scoped: two unrelated objectives from
 * the same person must not share one conversation on the gateway. Derived
 * server-side from the authenticated owner plus the claimed task id; clarification
 * turns of the same task reuse this key (together with previous_response_id).
 */
export function sessionKeyForTask(userId: string, taskId: string): string {
  return `ovoa-u-${userId}-t-${taskId}`;
}

const NOT_PROVISIONED =
  "No agent runtime is provisioned for this account yet, so nothing was executed. Each account gets its own isolated runtime; yours has not been created.";

/**
 * @param db a service-role client (assignments are not client-readable beyond own row)
 */
export async function resolveRuntimeForUser(
  db: SupabaseClient<never, never, never>,
  userId: string,
): Promise<RuntimeResolution> {
  const { data, error } = await (db as unknown as SupabaseClient)
    .from("runtime_assignments")
    .select("runtime_slug, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { state: "not_provisioned", message: NOT_PROVISIONED };
  if (!data || data.is_active !== true) return { state: "not_provisioned", message: NOT_PROVISIONED };

  const slug = String(data.runtime_slug);
  const config = runtimeConfigForSlug(slug);
  if (!config) {
    return {
      state: "unconfigured",
      slug,
      message:
        "This account's agent runtime is assigned but not reachable yet: its address and access token are not set on the server, so nothing was executed.",
    };
  }

  // The user key is derived server-side and is never accepted from the client.
  // The session key is derived per task by the runner (sessionKeyForTask).
  return { state: "ready", config, userKey: `ovoa-user-${userId}` };
}
