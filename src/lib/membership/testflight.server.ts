// Automatic TestFlight invites through the App Store Connect API.
//
// Optional. With ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY and
// TESTFLIGHT_GROUP_ID set, everyone who gets the app is added to that external
// beta group and Apple emails them the invite: members (sync.server.ts), and
// free accounts and Band buyers (invites.server.ts). The app is free, so
// nobody is taken out again when a plan ends; the app checks the plan itself.
// Without them, the pages show TESTFLIGHT_PUBLIC_URL instead.

import { envVar } from "./db.server";

// ASC_API_BASE exists only so a local test run can point at a fake Apple.
const ascApi = () => envVar("ASC_API_BASE") ?? "https://api.appstoreconnect.apple.com/v1";

export function testflightInvitesConfigured(): boolean {
  return ["ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_PRIVATE_KEY", "TESTFLIGHT_GROUP_ID"].every((name) =>
    Boolean(envVar(name)),
  );
}

export function testflightPublicUrl(): string | null {
  const url = envVar("TESTFLIGHT_PUBLIC_URL")?.trim();
  return url && /^https:\/\/testflight\.apple\.com\//.test(url) ? url : null;
}

export class AscError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

// ---------- JWT (ES256) ----------

const enc = new TextEncoder();

function base64url(bytes: Uint8Array | string): string {
  const raw = typeof bytes === "string" ? enc.encode(bytes) : bytes;
  let bin = "";
  for (const b of raw) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Accepts the .p8 file as pasted: with or without its BEGIN/END lines, with real
// newlines, escaped "\n", or everything run together on one line.
export function p8ToDer(p8: string): Uint8Array<ArrayBuffer> {
  const body = p8
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const der = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return der;
}

export async function ascToken(
  { keyId, issuerId, privateKey }: { keyId: string; issuerId: string; privateKey: string },
  now = Date.now(),
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    p8ToDer(privateKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const iat = Math.floor(now / 1000);
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ iss: issuerId, iat, exp: iat + 15 * 60, aud: "appstoreconnect-v1" }),
  );
  // WebCrypto's ECDSA signature is already the raw r||s form JWT wants.
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${base64url(new Uint8Array(sig))}`;
}

let cachedToken: { token: string; until: number } | null = null;

async function token(): Promise<string> {
  if (cachedToken && cachedToken.until > Date.now()) return cachedToken.token;
  const keyId = envVar("ASC_KEY_ID");
  const issuerId = envVar("ASC_ISSUER_ID");
  const privateKey = envVar("ASC_PRIVATE_KEY");
  if (!keyId || !issuerId || !privateKey) throw new AscError("App Store Connect key is not set", 0);
  const value = await ascToken({ keyId: keyId.trim(), issuerId: issuerId.trim(), privateKey });
  cachedToken = { token: value, until: Date.now() + 10 * 60 * 1000 };
  return value;
}

async function asc<T = { data?: unknown }>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${ascApi()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await token()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 204) return {} as T;
  const json = (await res.json().catch(() => ({}))) as {
    errors?: { detail?: string; title?: string }[];
  };
  if (!res.ok) {
    const first = json.errors?.[0];
    throw new AscError(
      first?.detail ?? first?.title ?? `App Store Connect returned ${res.status}`,
      res.status,
    );
  }
  return json as T;
}

function groupId(): string {
  const id = envVar("TESTFLIGHT_GROUP_ID")?.trim();
  if (!id) throw new AscError("TESTFLIGHT_GROUP_ID is not set", 0);
  return id;
}

async function findTester(email: string, inGroup = false): Promise<string | null> {
  const group = inGroup ? `&filter[betaGroups]=${encodeURIComponent(groupId())}` : "";
  const res = await asc<{ data: { id: string }[] }>(
    "GET",
    `/betaTesters?filter[email]=${encodeURIComponent(email)}${group}&limit=1`,
  );
  return res.data[0]?.id ?? null;
}

function splitName(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "OVOA", lastName: parts.slice(1).join(" ") || "Member" };
}

export type Invited = { testerId: string; emailed: boolean };

// Puts the person in the beta group; Apple emails the invite. Someone already
// in it (a free account who then bought a plan, say) isn't emailed again
// unless `resend` asks for it.
export async function inviteTester(
  email: string,
  name?: string | null,
  { resend = false } = {},
): Promise<Invited> {
  const group = groupId();
  const already = await findTester(email, true);
  if (already) {
    if (resend) await resendInvite(already);
    return { testerId: already, emailed: resend };
  }
  try {
    const created = await asc<{ data: { id: string } }>("POST", "/betaTesters", {
      data: {
        type: "betaTesters",
        attributes: { email, ...splitName(name) },
        relationships: { betaGroups: { data: [{ type: "betaGroups", id: group }] } },
      },
    });
    return { testerId: created.data.id, emailed: true };
  } catch (error) {
    // Already a tester of this team (another group, or removed earlier):
    // find them and put them back in the group.
    if (!(error instanceof AscError) || error.status !== 409) throw error;
    const existing = await findTester(email);
    if (!existing) throw error;
    await asc("POST", `/betaGroups/${group}/relationships/betaTesters`, {
      data: [{ type: "betaTesters", id: existing }],
    });
    await resendInvite(existing).catch(() => undefined);
    return { testerId: existing, emailed: true };
  }
}

async function resendInvite(testerId: string) {
  const app = await asc<{ data: { id: string } }>("GET", `/betaGroups/${groupId()}/app`);
  await asc("POST", "/betaTesterInvitations", {
    data: {
      type: "betaTesterInvitations",
      relationships: {
        app: { data: { type: "apps", id: app.data.id } },
        betaTester: { data: { type: "betaTesters", id: testerId } },
      },
    },
  });
}

export type BetaGroup = {
  id: string;
  name: string;
  internal: boolean;
  publicLink: string | null;
  app: string | null;
};

// For the admin page, so the group id never has to be dug out of a URL.
export async function listBetaGroups(): Promise<BetaGroup[]> {
  const res = await asc<{
    data: {
      id: string;
      attributes: { name: string; isInternalGroup: boolean; publicLink?: string | null };
      relationships?: { app?: { data?: { id: string } } };
    }[];
    included?: { id: string; attributes: { name?: string; bundleId?: string } }[];
  }>(
    "GET",
    "/betaGroups?limit=50&fields[betaGroups]=name,isInternalGroup,publicLink,app&include=app&fields[apps]=name,bundleId",
  );
  const apps = new Map((res.included ?? []).map((a) => [a.id, a.attributes]));
  return res.data.map((g) => {
    const app = apps.get(g.relationships?.app?.data?.id ?? "");
    return {
      id: g.id,
      name: g.attributes.name,
      internal: g.attributes.isInternalGroup,
      publicLink: g.attributes.publicLink ?? null,
      app: app ? `${app.name ?? "App"} (${app.bundleId ?? "?"})` : null,
    };
  });
}
