// A small Stripe client over fetch, so nothing Node-only has to run on the
// Workers host. Only the handful of calls paid early access needs.

const STRIPE_API = "https://api.stripe.com/v1";

// Pinned so field names don't move under us. Webhook payloads use the version
// the endpoint was created with (scripts/stripe-setup.mjs pins the same one);
// the readers in sync.server.ts also accept the newer shapes, in case the
// endpoint was made by hand in the dashboard.
export const STRIPE_API_VERSION = "2024-06-20";

export class MembershipConfigError extends Error {
  constructor(public readonly missing: string) {
    super(`${missing} is not set`);
  }
}

export class StripeError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export function stripeConfigured(): boolean {
  return Boolean(process.env["STRIPE_SECRET_KEY"]);
}

function secretKey(): string {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new MembershipConfigError("STRIPE_SECRET_KEY");
  return key;
}

type FormValue =
  string | number | boolean | null | undefined | FormValue[] | { [key: string]: FormValue };

// Stripe takes nested form fields: a[b]=1, a[0]=x.
export function encodeForm(params: Record<string, FormValue>): string {
  const out = new URLSearchParams();
  const walk = (value: FormValue, key: string) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) value.forEach((item, i) => walk(item, `${key}[${i}]`));
    else if (typeof value === "object")
      for (const [k, v] of Object.entries(value)) walk(v, `${key}[${k}]`);
    else out.append(key, String(value));
  };
  for (const [k, v] of Object.entries(params)) walk(v, k);
  return out.toString();
}

export async function stripe<T = Record<string, unknown>>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  params?: Record<string, FormValue>,
): Promise<T> {
  const form = params ? encodeForm(params) : "";
  const url = method === "POST" || !form ? `${STRIPE_API}${path}` : `${STRIPE_API}${path}?${form}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Stripe-Version": STRIPE_API_VERSION,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(method === "POST" ? { body: form } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: string };
  };
  if (!res.ok) {
    throw new StripeError(
      json.error?.message ?? `Stripe returned ${res.status}`,
      res.status,
      json.error?.code,
    );
  }
  return json as T;
}

// ---------- Webhook signatures ----------
//
// Stripe-Signature: t=<unix seconds>,v1=<hex hmac>[,v1=...]. The HMAC is
// SHA-256 over "<t>.<raw body>" keyed with the whole whsec_... secret.

const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signStripePayload(payload: string, secret: string, timestamp: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${payload}`)));
}

export async function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  { toleranceSeconds = 300, now = Date.now() } = {},
): Promise<boolean> {
  if (!header) return false;
  let timestamp = NaN;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") timestamp = Number(v);
    else if (k === "v1" && v) signatures.push(v);
  }
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(now / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = await signStripePayload(payload, secret, timestamp);
  return signatures.some((s) => sameString(s, expected));
}
