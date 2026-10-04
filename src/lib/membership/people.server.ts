// The People page's data (src/routes/early-access/people.tsx): every person the
// site has seen, one row each, joined to what they bought. Read-only, and all of
// it comes from tables the site already fills:
//
//   analytics_sessions / analytics_events   (migrations/0009, src/lib/analytics)
//   members, band_orders                    (migrations/0001, 0002)
//
// A person is their email when any of their visits was signed in, otherwise the
// random visitor id the browser keeps. A visitor id that signed in on one visit
// is folded into that email for all of its visits, so a signup carries its
// earlier anonymous history with it.

import { all } from "./db.server";

const DAY_MS = 86_400_000;

type SessionRow = {
  id: string;
  visitor_id: string;
  email: string | null;
  started_at: string;
  last_seen_at: string;
  landing_path: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ref: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  pageviews: number;
  events: number;
  max_scroll: number;
  seconds: number;
};

type MemberRow = {
  email: string;
  app_email: string | null;
  name: string | null;
  plan: string;
  status: string;
  created_at: string;
  ref_code: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
};

type BandRow = {
  email: string;
  amount_cents: number;
  status: string;
  created_at: string;
};

export type PersonStage = "visitor" | "signed-in" | "trial" | "paying" | "free-access" | "ended";

export type Person = {
  // What the detail view asks for: an email, or "v:<visitor id>".
  key: string;
  email: string | null;
  name: string | null;
  firstSeen: string;
  lastSeen: string;
  sessions: number;
  pageviews: number;
  seconds: number;
  maxScroll: number;
  // Where the first visit came from: a utm source, a partner code, a referrer host, or "direct".
  source: string;
  landing: string | null;
  country: string | null;
  device: string | null;
  stage: PersonStage;
  plan: string | null;
  bandOrders: number;
};

export type PeopleOverview = {
  days: number;
  totals: { visitors: number; signedIn: number; trial: number; paying: number; band: number };
  // Pages visitors left from (the last page of each visit), most common first.
  exits: { path: string; visits: number }[];
  // Pages by distinct people who opened them.
  pages: { path: string; people: number }[];
  people: Person[];
};

const lower = (v: string | null | undefined) => (v ? v.trim().toLowerCase() : null);

function hostOf(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer.slice(0, 60);
  }
}

function sourceOf(s: SessionRow): string {
  if (s.utm_source) return s.utm_medium ? `${s.utm_source} / ${s.utm_medium}` : s.utm_source;
  if (s.ref) return `partner ${s.ref}`;
  const host = hostOf(s.referrer);
  return host && !/(^|\.)ovoa\.ai$/.test(host) ? host : "direct";
}

function stageOf(member: MemberRow | undefined, email: string | null): PersonStage {
  if (member) {
    if (member.plan === "comp") return "free-access";
    if (["canceled", "refunded", "incomplete_expired", "unpaid"].includes(member.status)) {
      return "ended";
    }
    return member.status === "trialing" ? "trial" : "paying";
  }
  return email ? "signed-in" : "visitor";
}

// People with at least one visit in the last `days`, newest activity first.
export async function loadPeople(days: number): Promise<PeopleOverview> {
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const sessions = await all<SessionRow>(
    `SELECT id, visitor_id, email, started_at, last_seen_at, landing_path, referrer, utm_source, utm_medium,
            utm_campaign, ref, device, browser, os, country, city, pageviews, events, max_scroll, seconds
       FROM analytics_sessions WHERE started_at >= ? ORDER BY started_at ASC LIMIT 20000`,
    since,
  );

  // A visitor id seen signed in on any visit belongs to that email.
  const emailOfVisitor = new Map<string, string>();
  for (const s of sessions) {
    const e = lower(s.email);
    if (e) emailOfVisitor.set(s.visitor_id, e);
  }
  const personKey = (s: SessionRow) => emailOfVisitor.get(s.visitor_id) ?? `v:${s.visitor_id}`;

  const [members, bands] = await Promise.all([
    all<MemberRow>(
      `SELECT email, app_email, name, plan, status, created_at, ref_code, trial_ends_at, canceled_at
         FROM members ORDER BY created_at DESC LIMIT 5000`,
    ),
    all<BandRow>(
      "SELECT email, amount_cents, status, created_at FROM band_orders ORDER BY created_at DESC LIMIT 2000",
    ),
  ]);
  // The newest membership wins; a membership is found by the email it was bought
  // with or the app email it was moved to.
  const memberByEmail = new Map<string, MemberRow>();
  for (const m of [...members].reverse()) {
    memberByEmail.set(lower(m.email)!, m);
    const app = lower(m.app_email);
    if (app) memberByEmail.set(app, m);
  }
  const bandsByEmail = new Map<string, number>();
  for (const b of bands) {
    if (b.status === "refunded") continue;
    const e = lower(b.email)!;
    bandsByEmail.set(e, (bandsByEmail.get(e) ?? 0) + 1);
  }

  const byPerson = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const k = personKey(s);
    const list = byPerson.get(k);
    if (list) list.push(s);
    else byPerson.set(k, [s]);
  }

  const people: Person[] = [];
  for (const [key, list] of byPerson) {
    const first = list[0];
    const last = list[list.length - 1];
    if (!first || !last) continue;
    const email = key.startsWith("v:") ? null : key;
    const member = email ? memberByEmail.get(email) : undefined;
    people.push({
      key,
      email,
      name: member?.name ?? null,
      firstSeen: first.started_at,
      lastSeen: last.last_seen_at,
      sessions: list.length,
      pageviews: list.reduce((n, s) => n + s.pageviews, 0),
      seconds: list.reduce((n, s) => n + s.seconds, 0),
      maxScroll: Math.max(...list.map((s) => s.max_scroll)),
      source: sourceOf(first),
      landing: first.landing_path,
      country: last.country ?? first.country,
      device: [last.device, last.os].filter(Boolean).join(" / ") || null,
      stage: stageOf(member, email),
      plan: member?.plan ?? null,
      bandOrders: email ? (bandsByEmail.get(email) ?? 0) : 0,
    });
  }
  people.sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));

  // Where visits end: the last pageview of each visit. A visit with one pageview
  // and one exit is a bounce, which is the number worth watching on the front door.
  const exits = await all<{ path: string; visits: number }>(
    `SELECT path, COUNT(*) AS visits FROM (
       SELECT e.session_id, e.path,
              ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.id DESC) AS n
         FROM analytics_events e
         JOIN analytics_sessions s ON s.id = e.session_id
        WHERE e.type = 'pageview' AND s.started_at >= ?
     ) WHERE n = 1 GROUP BY path ORDER BY visits DESC LIMIT 12`,
    since,
  );
  const pageRows = await all<{ path: string; visitor_id: string; email: string | null }>(
    `SELECT DISTINCT e.path AS path, s.visitor_id AS visitor_id, s.email AS email
       FROM analytics_events e JOIN analytics_sessions s ON s.id = e.session_id
      WHERE e.type = 'pageview' AND s.started_at >= ? LIMIT 40000`,
    since,
  );
  const peopleOnPage = new Map<string, Set<string>>();
  for (const r of pageRows) {
    const k = emailOfVisitor.get(r.visitor_id) ?? `v:${r.visitor_id}`;
    const set = peopleOnPage.get(r.path);
    if (set) set.add(k);
    else peopleOnPage.set(r.path, new Set([k]));
  }
  const pages = [...peopleOnPage]
    .map(([path, set]) => ({ path, people: set.size }))
    .sort((a, b) => b.people - a.people)
    .slice(0, 12);

  const count = (stage: PersonStage[]) => people.filter((p) => stage.includes(p.stage)).length;
  return {
    days,
    totals: {
      visitors: people.length,
      signedIn: people.filter((p) => p.email).length,
      trial: count(["trial"]),
      paying: count(["paying"]),
      band: people.filter((p) => p.bandOrders > 0).length,
    },
    exits,
    pages,
    people: people.slice(0, 500),
  };
}

export type PersonVisit = {
  id: string;
  startedAt: string;
  source: string;
  landing: string | null;
  device: string | null;
  place: string | null;
  seconds: number;
  maxScroll: number;
  steps: { ts: string; type: string; path: string; target: string | null; value: number | null }[];
};

export type PersonDetail = {
  key: string;
  email: string | null;
  member: {
    plan: string;
    status: string;
    since: string;
    trialEndsAt: string | null;
    canceledAt: string | null;
    ref: string | null;
  } | null;
  bands: { amountCents: number; status: string; at: string }[];
  visits: PersonVisit[];
};

// One person's visits, newest first, each with what they did step by step.
export async function loadPerson(key: string): Promise<PersonDetail> {
  const email = key.startsWith("v:") ? null : lower(key);
  const visitorIds = new Set<string>();
  if (key.startsWith("v:")) visitorIds.add(key.slice(2));
  if (email) {
    const own = await all<{ visitor_id: string }>(
      "SELECT DISTINCT visitor_id FROM analytics_sessions WHERE lower(email) = ? LIMIT 50",
      email,
    );
    for (const r of own) visitorIds.add(r.visitor_id);
  }
  const ids = [...visitorIds];
  const visits: PersonVisit[] = [];
  if (ids.length) {
    const marks = ids.map(() => "?").join(", ");
    const sessions = await all<SessionRow>(
      `SELECT id, visitor_id, email, started_at, last_seen_at, landing_path, referrer, utm_source, utm_medium,
              utm_campaign, ref, device, browser, os, country, city, pageviews, events, max_scroll, seconds
         FROM analytics_sessions WHERE visitor_id IN (${marks}) ORDER BY started_at DESC LIMIT 40`,
      ...ids,
    );
    if (sessions.length) {
      const sm = sessions.map(() => "?").join(", ");
      const events = await all<{
        session_id: string;
        ts: string;
        type: string;
        path: string;
        target: string | null;
        value: number | null;
      }>(
        `SELECT session_id, ts, type, path, target, value FROM analytics_events
          WHERE session_id IN (${sm}) AND type IN ('pageview', 'click', 'rage', 'leave')
          ORDER BY id ASC LIMIT 1500`,
        ...sessions.map((s) => s.id),
      );
      const bySession = new Map<string, PersonVisit["steps"]>();
      for (const e of events) {
        const steps = bySession.get(e.session_id);
        const step = { ts: e.ts, type: e.type, path: e.path, target: e.target, value: e.value };
        if (steps) steps.push(step);
        else bySession.set(e.session_id, [step]);
      }
      for (const s of sessions) {
        visits.push({
          id: s.id,
          startedAt: s.started_at,
          source: sourceOf(s),
          landing: s.landing_path,
          device: [s.device, s.browser, s.os].filter(Boolean).join(" / ") || null,
          place: [s.city, s.country].filter(Boolean).join(", ") || null,
          seconds: s.seconds,
          maxScroll: s.max_scroll,
          steps: bySession.get(s.id) ?? [],
        });
      }
    }
  }

  let member: PersonDetail["member"] = null;
  let bands: PersonDetail["bands"] = [];
  if (email) {
    const m = await all<MemberRow>(
      `SELECT email, app_email, name, plan, status, created_at, ref_code, trial_ends_at, canceled_at
         FROM members WHERE lower(email) = ? OR lower(app_email) = ? ORDER BY created_at DESC LIMIT 1`,
      email,
      email,
    );
    if (m[0]) {
      member = {
        plan: m[0].plan,
        status: m[0].status,
        since: m[0].created_at,
        trialEndsAt: m[0].trial_ends_at,
        canceledAt: m[0].canceled_at,
        ref: m[0].ref_code,
      };
    }
    bands = (
      await all<BandRow>(
        "SELECT email, amount_cents, status, created_at FROM band_orders WHERE lower(email) = ? ORDER BY created_at DESC LIMIT 20",
        email,
      )
    ).map((b) => ({ amountCents: b.amount_cents, status: b.status, at: b.created_at }));
  }
  return { key, email, member, bands, visits };
}
