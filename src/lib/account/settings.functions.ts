import { createServerFn } from "@tanstack/react-start";

// Everything the OVOA app's Settings does that isn't about the phone itself,
// on /account: the number you text from, how OVOA behaves, agreeing to AI,
// Google, your @username, what it remembers, your websites, and deleting the
// account. So someone who only ever texts OVOA never needs the app.
//
// Each of these asks the app's server (jarvis-api in ovoa-app) with the
// visitor's session from this site's cookie, and only from this site's pages.
// Server-only modules are imported inside the handlers: this file also ships
// to the browser, where each handler is swapped for an RPC call.

// The wording of the AI screen that <AiConsent> shows (components/account):
// the same as the app's (ovoa-app app/consent.tsx CONSENT_VERSION). The app's
// server keeps the lower of this and its own newest.
const CONSENT_VERSION = 2;

export type Autonomy = "off" | "suggest" | "act";

export type AssistantSettings = {
  assistantName: string;
  personality: string;
  memoryEnabled: boolean;
  autoApprove: boolean;
  agentEnabled: boolean;
  agentAutonomy: Autonomy;
  // Minutes past local midnight.
  quietStart: number;
  quietEnd: number;
};

export type TextingState = {
  // False while texting isn't switched on at the app's server.
  available: boolean;
  number: string | null;
  // textingFirst: OVOA may text them first (reminders, heads-ups).
  linked: { phone: string; linkedAt: number; textingFirst: boolean } | null;
};

export type UsernameState = {
  username: string | null;
  address: string | null;
  // Set while it can't be changed yet (once every 30 days).
  changeableAt: number | null;
  suggestion: string | null;
};

export type GoogleAccount = { id: string; email: string; name: string | null; isDefault: boolean };
export type Memory = { id: string; content: string };
export type Website = { id: string; name: string; address: string; link: string; status: string };

export type Usage = {
  // The assistant's daily credits; null on Free, and for accounts with no limit.
  creditsLeftToday: number | null;
  creditsPerDay: number | null;
  resetsAt: string | null;
  // Background work comes with Plus and Pro.
  agent: boolean;
};

// Each part is null when the app's server didn't give it just now; the page
// shows the rest.
export type AccountSettings = {
  name: string;
  consent: { given: boolean; at: number | null };
  assistant: AssistantSettings;
  usage: Usage | null;
  texting: TextingState | null;
  username: UsernameState | null;
  google: GoogleAccount[] | null;
  memories: Memory[] | null;
  websites: Website[] | null;
};

export type Done<T = object> = ({ ok: true } & T) | { ok: false; error: string };

type Me = {
  user: {
    name: string;
    settings: AssistantSettings;
    aiConsent?: { given: boolean; at: number | null };
  };
  plan?: {
    limits?: {
      creditsLeftToday: number | null;
      creditsPerDay: number | null;
      resetsAt: string | null;
    };
    features?: { agent?: boolean };
  };
};

const assistantOf = (s: AssistantSettings): AssistantSettings => ({
  assistantName: s.assistantName,
  personality: s.personality,
  memoryEnabled: s.memoryEnabled,
  autoApprove: s.autoApprove,
  agentEnabled: s.agentEnabled,
  agentAutonomy: s.agentAutonomy,
  quietStart: s.quietStart,
  quietEnd: s.quietEnd,
});

// This visitor's session, for a change: only from this site's own pages.
async function session(): Promise<{ token: string } | { error: string }> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { sameOrigin, sessionToken } = await import("./account.server");
  const request = getRequest();
  if (!sameOrigin(request)) return { error: "Start again from ovoa.ai/account." };
  const token = sessionToken(request);
  return token ? { token } : { error: "You're signed out. Sign in again." };
}

// One change, answered with the app's server's own sentence when it fails.
async function change<T>(
  path: string,
  init: { method?: string; body?: unknown },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const s = await session();
  if ("error" in s) return { ok: false, error: s.error };
  const { appApi } = await import("./account.server");
  const res = await appApi<T>(s.token, path, init);
  return res.ok ? res : { ok: false, error: res.error };
}

/** What the signed-in account page shows under the account itself; null when signed out. */
export const getAccountSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<AccountSettings | null> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { appApi, sessionToken } = await import("./account.server");
    const token = sessionToken(getRequest());
    if (!token) return null;

    const part = async <T>(path: string): Promise<T | null> => {
      const res = await appApi<T>(token, path, {}, 6000);
      return res.ok ? res.data : null;
    };
    const [me, texting, username, google, memories, sites] = await Promise.all([
      part<Me>("/me"),
      part<TextingState>("/texting"),
      part<UsernameState>("/me/username"),
      part<{ accounts: GoogleAccount[] }>("/google/status"),
      part<{ memories: Memory[] }>("/memories"),
      part<{ sites: Website[] }>("/sites"),
    ]);
    if (!me?.user) return null;

    const limits = me.plan?.limits;
    return {
      name: me.user.name,
      consent: { given: Boolean(me.user.aiConsent?.given), at: me.user.aiConsent?.at ?? null },
      assistant: assistantOf(me.user.settings),
      usage: me.plan
        ? {
            creditsLeftToday: limits?.creditsLeftToday ?? null,
            creditsPerDay: limits?.creditsPerDay ?? null,
            resetsAt: limits?.resetsAt ?? null,
            agent: Boolean(me.plan.features?.agent),
          }
        : null,
      texting: texting
        ? { available: texting.available, number: texting.number, linked: texting.linked }
        : null,
      username: username
        ? {
            username: username.username,
            address: username.address,
            changeableAt: username.changeableAt,
            suggestion: username.suggestion,
          }
        : null,
      google:
        google?.accounts.map((a) => ({
          id: a.id,
          email: a.email,
          name: a.name,
          isDefault: a.isDefault,
        })) ?? null,
      memories: memories?.memories.map((m) => ({ id: m.id, content: m.content })) ?? null,
      websites:
        sites?.sites.map((s) => ({
          id: s.id,
          name: s.name,
          address: s.address,
          link: s.link,
          status: s.status,
        })) ?? null,
    };
  },
);

// ---------- You and the assistant ----------

type SettingsChange = Partial<AssistantSettings> & { name?: string; timeZone?: string };

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : undefined;
const flag = (value: unknown) => (typeof value === "boolean" ? value : undefined);
const minutes = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1439
    ? value
    : undefined;

/** Your name, the assistant's name and personality, and its switches (PATCH /me). */
export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((input: Record<string, unknown>): SettingsChange => {
    const autonomy = input?.["agentAutonomy"];
    const picked: { [K in keyof SettingsChange]: SettingsChange[K] | undefined } = {
      name: text(input?.["name"], 80) || undefined,
      assistantName: text(input?.["assistantName"], 40) || undefined,
      personality: text(input?.["personality"], 500),
      memoryEnabled: flag(input?.["memoryEnabled"]),
      autoApprove: flag(input?.["autoApprove"]),
      agentEnabled: flag(input?.["agentEnabled"]),
      agentAutonomy: autonomy === "suggest" || autonomy === "act" ? autonomy : undefined,
      quietStart: minutes(input?.["quietStart"]),
      quietEnd: minutes(input?.["quietEnd"]),
      // The browser's zone, so reminders and quiet hours are in their time.
      timeZone: text(input?.["timeZone"], 64) || undefined,
    };
    return Object.fromEntries(
      Object.entries(picked).filter(([, v]) => v !== undefined),
    ) as SettingsChange;
  })
  .handler(async ({ data }): Promise<Done<{ name: string; assistant: AssistantSettings }>> => {
    const res = await change<Me>("/me", { method: "PATCH", body: data });
    if (!res.ok) return res;
    return { ok: true, name: res.data.user.name, assistant: assistantOf(res.data.user.settings) };
  });

// ---------- AI and your data ----------

/** They pressed Agree under where their words go. */
export const agreeToAi = createServerFn({ method: "POST" }).handler(
  async (): Promise<Done<{ at: number | null }>> => {
    const res = await change<{ aiConsent?: { at: number | null } }>("/me/consent", {
      body: { version: CONSENT_VERSION },
    });
    return res.ok ? { ok: true, at: res.data.aiConsent?.at ?? Date.now() } : res;
  },
);

/** They took it back: OVOA stops answering until they agree again. */
export const withdrawAi = createServerFn({ method: "POST" }).handler(async (): Promise<Done> => {
  const res = await change("/me/consent", { method: "DELETE" });
  return res.ok ? { ok: true } : res;
});

const memoryId = (input: { id?: unknown }) => {
  const id = typeof input?.id === "string" ? input.id : "";
  if (!/^[\w-]{1,64}$/.test(id)) throw new Error("No such thing.");
  return { id };
};

export const forgetMemory = createServerFn({ method: "POST" })
  .inputValidator(memoryId)
  .handler(async ({ data }): Promise<Done> => {
    const res = await change(`/memories/${data.id}`, { method: "DELETE" });
    return res.ok ? { ok: true } : res;
  });

export const forgetEverything = createServerFn({ method: "POST" }).handler(
  async (): Promise<Done> => {
    const res = await change("/memories", { method: "DELETE" });
    return res.ok ? { ok: true } : res;
  },
);

/** The conversation itself, in the app and by text: gone. */
export const clearChat = createServerFn({ method: "POST" }).handler(async (): Promise<Done> => {
  const res = await change("/chat/messages", { method: "DELETE" });
  return res.ok ? { ok: true } : res;
});

// ---------- The number they text from ----------

/** Whether OVOA may text them first. */
export const setTextingFirst = createServerFn({ method: "POST" })
  .inputValidator((input: { on?: unknown }) => ({ on: input?.on === true }))
  .handler(async ({ data }): Promise<Done> => {
    const res = await change("/texting", { method: "PUT", body: { textingFirst: data.on } });
    return res.ok ? { ok: true } : res;
  });

export const unlinkNumber = createServerFn({ method: "POST" }).handler(async (): Promise<Done> => {
  const res = await change("/texting/link", { method: "DELETE" });
  return res.ok ? { ok: true } : res;
});

// ---------- @username ----------

const wanted = (input: { username?: unknown }) => ({
  username: typeof input?.username === "string" ? input.username.trim().slice(0, 60) : "",
});

/** Whether a username is free, as they type. */
export const checkUsername = createServerFn({ method: "GET" })
  .inputValidator(wanted)
  .handler(async ({ data }): Promise<{ available: boolean; problem: string | null }> => {
    const res = await change<{ available: boolean; problem?: string }>(
      `/me/username/check?name=${encodeURIComponent(data.username)}`,
      {},
    );
    if (!res.ok) return { available: false, problem: res.error };
    return { available: res.data.available, problem: res.data.problem ?? null };
  });

export const setUsername = createServerFn({ method: "POST" })
  .inputValidator(wanted)
  .handler(async ({ data }): Promise<Done<{ username: UsernameState }>> => {
    const res = await change<{ username: string; address: string; changeableAt: number | null }>(
      "/me/username",
      { method: "PUT", body: { username: data.username } },
    );
    if (!res.ok) return res;
    return {
      ok: true,
      username: {
        username: res.data.username,
        address: res.data.address,
        changeableAt: res.data.changeableAt,
        suggestion: null,
      },
    };
  });

// ---------- Google ----------

/**
 * Google's consent page for Gmail, Calendar and the rest, which comes back to
 * /account?google=connected. The app's server only sends people back to
 * https://ovoa.ai/account; from anywhere else (a test site, this PC) its own
 * "connected, you can close this page" is shown instead.
 */
export const connectGoogle = createServerFn({ method: "POST" }).handler(
  async (): Promise<Done<{ url: string }>> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const returnUrl = `${new URL(getRequest().url).origin}/account`;
    const res = await change<{ url?: string }>("/google/connect", { body: { returnUrl } });
    if (!res.ok) return res;
    return res.data.url?.startsWith("https://accounts.google.com/")
      ? { ok: true, url: res.data.url }
      : { ok: false, error: "Google didn't open. Try again." };
  },
);

export const disconnectGoogle = createServerFn({ method: "POST" })
  .inputValidator(memoryId)
  .handler(async ({ data }): Promise<Done> => {
    const res = await change(`/google/accounts/${data.id}`, { method: "DELETE" });
    return res.ok ? { ok: true } : res;
  });

// ---------- Websites ----------

/** Offline at once; it can be put back for 30 days by asking OVOA. */
export const deleteWebsite = createServerFn({ method: "POST" })
  .inputValidator(memoryId)
  .handler(async ({ data }): Promise<Done> => {
    const res = await change(`/sites/${data.id}`, { method: "DELETE" });
    return res.ok ? { ok: true } : res;
  });

// ---------- The way out ----------

/** Deletes the account and everything OVOA has with it, and signs this browser out. */
export const deleteAccount = createServerFn({ method: "POST" }).handler(async (): Promise<Done> => {
  const res = await change("/me", { method: "DELETE" });
  if (!res.ok) return res;
  const { getRequest, setResponseHeader } = await import("@tanstack/react-start/server");
  const { SESSION_COOKIE, clearCookie } = await import("./account.server");
  setResponseHeader("set-cookie", clearCookie(getRequest(), SESSION_COOKIE));
  return { ok: true };
});
