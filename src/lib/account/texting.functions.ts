import { createServerFn } from "@tanstack/react-start";

// /text: sign in, give your number, text OVOA a code. The code, the number to
// text and whether it has arrived all come from the app's server (jarvis-api
// texting.ts), asked with this visitor's session from the site's cookie.

export type Linked = { phone: string; linkedAt: number } | null;

export type TextPage =
  | { state: "out"; google: boolean; apple: boolean }
  | {
      state: "in";
      name: string;
      email: string;
      // False while texting isn't switched on at the app's server.
      available: boolean;
      number: string | null;
      linked: Linked;
    }
  | { state: "down" };

type Status = { available?: boolean; number?: string | null; linked?: Linked };

async function texting(token: string): Promise<Status | null> {
  const { accountApiUrl } = await import("./account.server");
  try {
    const res = await fetch(`${accountApiUrl()}/texting`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Status;
  } catch (error) {
    console.error("[text] GET /texting", error);
    return null;
  }
}

export const getTextPage = createServerFn({ method: "GET" }).handler(
  async (): Promise<TextPage> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { appleConfigured, googleConfigured, lookupAccount, sessionToken } = await import(
      "./account.server"
    );
    const request = getRequest();
    const out = { state: "out" as const, google: googleConfigured(), apple: appleConfigured() };
    const token = sessionToken(request);
    if (!token) return out;
    const found = await lookupAccount(token);
    if (found.state === "out") return out;
    if (found.state === "down") return { state: "down" };
    const status = await texting(token);
    return {
      state: "in",
      name: found.user.name,
      email: found.user.email,
      available: Boolean(status?.available),
      number: status?.number ?? null,
      linked: status?.linked ?? null,
    };
  },
);

/** Whether the code has come in yet: polled while the QR code is up. */
export const getLinked = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ linked: Linked }> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { sessionToken } = await import("./account.server");
    const token = sessionToken(getRequest());
    const status = token ? await texting(token) : null;
    return { linked: status?.linked ?? null };
  },
);

export type LinkCode =
  | { ok: true; number: string; body: string; expiresAt: number }
  | { ok: false; error: string };

/** A fresh code (15 minutes, one use) and the message that carries it. */
export const startTextLink = createServerFn({ method: "POST" }).handler(
  async (): Promise<LinkCode> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { accountApiUrl, sameOrigin, sessionToken } = await import("./account.server");
    const request = getRequest();
    if (!sameOrigin(request)) return { ok: false, error: "Start again from ovoa.ai/text." };
    const token = sessionToken(request);
    if (!token) return { ok: false, error: "You're signed out. Sign in again." };
    try {
      const res = await fetch(`${accountApiUrl()}/texting/link`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      const body = (await res.json().catch(() => ({}))) as Partial<{
        number: string;
        body: string;
        expiresAt: number;
        error: string;
      }>;
      if (res.status === 503) return { ok: false, error: "Texting OVOA opens soon. Check back shortly." };
      if (res.status === 429) return { ok: false, error: "Too many codes. Wait a few minutes and try again." };
      if (!res.ok || !body.number || !body.body)
        return { ok: false, error: body.error ?? "That didn't work. Try again." };
      return { ok: true, number: body.number, body: body.body, expiresAt: body.expiresAt ?? 0 };
    } catch (error) {
      console.error("[text] POST /texting/link", error);
      return { ok: false, error: "Can't reach OVOA right now. Try again in a minute." };
    }
  },
);
