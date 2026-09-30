// Stores what src/lib/analytics/track.ts sends (migrations/0009_analytics.sql),
// with the A/B version the browser is on (migrations/0012_ab_test.sql).
// Everything is trimmed and capped here: the browser is not trusted.

import { accountEmail } from "@/lib/account/account.server";
import { AB_TEST, cookieVariant } from "@/lib/ab";
import { now, run } from "@/lib/membership/db.server";

const TYPES = new Set(["pageview", "click", "scroll", "leave", "rage"]);
const MAX_EVENTS = 50;

type Incoming = {
  sid?: unknown;
  vid?: unknown;
  start?: unknown;
  hello?: unknown;
  events?: unknown;
};

type Event = { type: string; path: string; target: string | null; value: number | null; x: number | null; y: number | null; ts: string };

const id = (v: unknown) => (typeof v === "string" && /^[a-z0-9]{8,40}$/i.test(v) ? v : null);
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown, lo: number, hi: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : null;

function cleanEvents(raw: unknown): Event[] {
  if (!Array.isArray(raw)) return [];
  const at = Date.now();
  return raw.slice(0, MAX_EVENTS).flatMap((e): Event[] => {
    if (!e || typeof e !== "object") return [];
    const r = e as Partial<Record<"t" | "p" | "el" | "v" | "x" | "y" | "ago", unknown>>;
    const type = typeof r.t === "string" && TYPES.has(r.t) ? r.t : null;
    const path = text(r.p, 300);
    if (!type || !path?.startsWith("/")) return [];
    // Client clocks drift; keep their order but never a future or ancient time.
    const ago = int(r.ago, 0, 3_600_000) ?? 0;
    return [{
      type, path,
      target: text(r.el, 200),
      value: int(r.v, 0, 86_400),
      x: int(r.x, 0, 100),
      y: int(r.y, 0, 100),
      ts: new Date(at - ago).toISOString(),
    }];
  });
}

function device(ua: string) {
  const d = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|iPhone|Android/i.test(ua) ? "mobile" : "desktop";
  const b = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /CriOS|Chrome\//.test(ua) ? "Chrome"
    : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Other";
  const o = /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Other";
  return { d, b, o };
}

const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly/i;

export async function collect(request: Request, body: Incoming): Promise<void> {
  const sid = id(body.sid);
  const vid = id(body.vid);
  if (!sid || !vid) return;
  const ua = request.headers.get("user-agent") ?? "";
  if (BOTS.test(ua)) return;
  const events = cleanEvents(body.events);
  if (!events.length) return;

  const stamp = now();
  // The version of the front door this browser is on, if it has been given one.
  const variant = cookieVariant(request.headers.get("cookie"));
  const test = variant ? AB_TEST : null;
  const pageviews = events.filter((e) => e.type === "pageview").length;
  const maxScroll = Math.max(0, ...events.filter((e) => e.type === "scroll").map((e) => e.value ?? 0));
  const seconds = events.filter((e) => e.type === "leave").reduce((s, e) => s + (e.value ?? 0), 0);

  // The first batch of a visit opens its row with where it came from.
  const start = body.start && typeof body.start === "object" ? (body.start as Partial<Record<"referrer" | "utm_source" | "utm_medium" | "utm_campaign" | "ref", unknown>>) : null;
  // A page load (hello) also checks who's signed in, so a visit that signs in
  // part-way picks up their email.
  const email = start || body.hello ? await accountEmail(request).catch(() => null) : null;
  if (start) {
    const { d, b, o } = device(ua);
    const cf = (request as Request & { cf?: { country?: string; city?: string } }).cf;
    await run(
      `INSERT INTO analytics_sessions (id, visitor_id, email, started_at, last_seen_at, landing_path, referrer,
         utm_source, utm_medium, utm_campaign, ref, device, browser, os, country, city, ab_test, ab_variant)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
      sid, vid, email, stamp, stamp, events[0]?.path, text(start.referrer, 300),
      text(start.utm_source, 100), text(start.utm_medium, 100), text(start.utm_campaign, 100), text(start.ref, 60),
      d, b, o, cf?.country ?? request.headers.get("cf-ipcountry"), cf?.city ?? null, test, variant,
    );
  }

  await run(
    `UPDATE analytics_sessions SET last_seen_at = ?, pageviews = pageviews + ?, events = events + ?,
       max_scroll = MAX(max_scroll, ?), seconds = seconds + ?, email = COALESCE(email, ?),
       ab_test = COALESCE(ab_test, ?), ab_variant = COALESCE(ab_variant, ?) WHERE id = ?`,
    stamp, pageviews, events.length, maxScroll, seconds, email, test, variant, sid,
  );

  // One statement per batch keeps it to a single D1 round trip.
  const rows = events.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
  await run(
    `INSERT INTO analytics_events (session_id, ts, type, path, target, value, x, y) VALUES ${rows}`,
    ...events.flatMap((e) => [sid, e.ts, e.type, e.path, e.target, e.value, e.x, e.y]),
  );
}
