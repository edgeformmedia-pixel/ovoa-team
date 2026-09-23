// Signing in on ovoa.ai (/account). The accounts are the OVOA app's own: they
// live on the app's server (jarvis-api, in ovoa-app), which proves the email
// (a code from no-reply@ovoa.ai, or Google) and then finds the account or
// makes it (src/emailauth.ts there). So an account made in the app signs in
// here, and one made here signs in to the app with the same email and password.
//
// The visitor's browser does the code steps with the app's server itself, so
// its sign-in limits count each visitor rather than this site. This side keeps
// the session that comes back in an HttpOnly cookie, and does the Google round
// trip, which needs the client secret.
//
//   OVOA_API_URL          the app's server (default below). Never the old
//                          workers.dev address: it only forwards to api.ovoa.ai
//                          until it's deleted, and everyone coming through it
//                          counts as one address for those sign-in limits.
//   GOOGLE_CLIENT_ID      "Continue with Google": a Web client in Google Cloud,
//   GOOGLE_CLIENT_SECRET   redirect URI <site>/api/public/account/google-callback.
//                          Without both, the button is shown switched off.

import { envVar } from "@/lib/membership/db.server";

export const DEFAULT_API_URL = "https://api.ovoa.ai";

export const accountApiUrl = () => (envVar("OVOA_API_URL") ?? DEFAULT_API_URL).replace(/\/+$/, "");

export const SESSION_COOKIE = "ovoa_session";
export const GOOGLE_STATE_COOKIE = "ovoa_google_state";
// The app's server ends a site session after 30 days (auth.ts SESSION_TTL_MS).
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

// A session token from the app's server: 32 random bytes in hex.
const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
export const isToken = (value: unknown): value is string =>
  typeof value === "string" && TOKEN_PATTERN.test(value);

// ---------- Cookies ----------

export function readCookie(request: Request, name: string): string | null {
  const match = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(request.headers.get("cookie") ?? "");
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return null;
  }
}

// Secure everywhere but plain http on this PC.
const secure = (request: Request) => (new URL(request.url).protocol === "https:" ? "; Secure" : "");

export const setCookie = (request: Request, name: string, value: string, maxAge: number) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure(request)}`;

export const clearCookie = (request: Request, name: string) => setCookie(request, name, "", 0);

export const sessionCookie = (request: Request, token: string) =>
  setCookie(request, SESSION_COOKIE, token, SESSION_MAX_AGE);

export const sessionToken = (request: Request) => {
  const token = readCookie(request, SESSION_COOKIE);
  return isToken(token) ? token : null;
};

// Sign-in and sign-out come from this site's own pages, never another's: a
// page elsewhere mustn't be able to sign a visitor in to someone else's
// account (and then have them buy a plan for it).
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

// ---------- The app's server ----------

export type AccountUser = { id: string; email: string; name: string };

export type Lookup =
  | { state: "in"; user: AccountUser }
  | { state: "out" }
  // The app's server didn't answer: keep the cookie and say so.
  | { state: "down" };

/** Whose session this is, asked of the app's server (GET /me). */
export async function lookupAccount(token: string, timeoutMs = 6000): Promise<Lookup> {
  try {
    const res = await fetch(`${accountApiUrl()}/me`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 401) return { state: "out" };
    if (!res.ok) return { state: "down" };
    const body = (await res.json()) as { user?: Partial<AccountUser> | null };
    const user = body.user;
    if (!user?.id || !user.email) return { state: "out" };
    return { state: "in", user: { id: user.id, email: user.email, name: user.name ?? "" } };
  } catch (error) {
    console.error("[account] /me", error);
    return { state: "down" };
  }
}

/**
 * The signed-in account's email, for checkout: a plan bought while signed in
 * goes to that account. Null when signed out, or when the app's server is slow
 * (checkout then asks for an email as it always has).
 */
export async function accountEmail(request: Request): Promise<string | null> {
  const token = sessionToken(request);
  if (!token) return null;
  const found = await lookupAccount(token, 3000);
  return found.state === "in" ? found.user.email : null;
}

export async function logoutAccount(token: string): Promise<void> {
  try {
    await fetch(`${accountApiUrl()}/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    // The cookie goes anyway; the session runs out on its own.
    console.error("[account] logout", error);
  }
}

// ---------- Google ----------

export function googleConfigured(): boolean {
  return Boolean(envVar("GOOGLE_CLIENT_ID") && envVar("GOOGLE_CLIENT_SECRET"));
}

const googleRedirectUri = (origin: string) => `${origin}/api/public/account/google-callback`;

export function googleAuthUrl(origin: string, state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: envVar("GOOGLE_CLIENT_ID") ?? "",
    redirect_uri: googleRedirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  return url.toString();
}

/** Google's code for an ID token, which the app's server checks with Google itself. */
export async function googleIdToken(origin: string, code: string): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: envVar("GOOGLE_CLIENT_ID") ?? "",
        client_secret: envVar("GOOGLE_CLIENT_SECRET") ?? "",
        redirect_uri: googleRedirectUri(origin),
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error("[account] google token", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const body = (await res.json()) as { id_token?: string };
    return body.id_token ?? null;
  } catch (error) {
    console.error("[account] google token", error);
    return null;
  }
}

export type Proven =
  | { token: string }
  // A proven address with no account yet: the page finishes it with a name
  // and a password.
  | { ticket: string; email: string; name: string | null };

export async function signInWithGoogle(idToken: string): Promise<Proven | null> {
  try {
    const res = await fetch(`${accountApiUrl()}/auth/google`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error("[account] /auth/google", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const body = (await res.json()) as Partial<{
      token: string;
      ticket: string;
      email: string;
      name: string | null;
    }>;
    if (isToken(body.token)) return { token: body.token };
    if (body.ticket && body.email)
      return { ticket: body.ticket, email: body.email, name: body.name ?? null };
    return null;
  } catch (error) {
    console.error("[account] /auth/google", error);
    return null;
  }
}
