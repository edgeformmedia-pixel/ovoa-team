import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { startReplay } from "./replay";

// First-party site analytics: page views, clicks (what and where), scroll
// depth, time on page and rage clicks, sent in batches to /api/public/t
// (collect.server.ts) and read on admin.ovoa.ai's Analytics page (the session
// replay is replay.ts). Nothing
// typed into a field is ever recorded. Browsers that send Global Privacy
// Control are left alone.

const ENDPOINT = "/api/public/t";
const SESSION_IDLE_MS = 30 * 60_000;
const FLUSH_MS = 5_000;
const SCROLL_MARKS = [25, 50, 75, 100];

type Queued = { t: string; p: string; el?: string; v?: number; x?: number; y?: number; at: number };

const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 20);

function stored(store: Storage | undefined, key: string): string | null {
  try { return store?.getItem(key) ?? null; } catch { return null; }
}
function keep(store: Storage | undefined, key: string, value: string) {
  try { store?.setItem(key, value); } catch { /* private mode */ }
}

let state: {
  vid: string;
  sid: string;
  start: Record<string, string> | null;
  hello: boolean;
  queue: Queued[];
  path: string;
  pageAt: number;
  depth: number;
  marks: Set<number>;
  ready: boolean;
  clicks: { at: number; x: number; y: number }[];
} | null = null;

function session() {
  const local = typeof localStorage === "undefined" ? undefined : localStorage;
  const tab = typeof sessionStorage === "undefined" ? undefined : sessionStorage;
  let vid = stored(local, "ovoa_vid");
  if (!vid) { vid = randomId(); keep(local, "ovoa_vid", vid); }
  const last = Number(stored(tab, "ovoa_seen") ?? 0);
  let sid = stored(tab, "ovoa_sid");
  let start: Record<string, string> | null = null;
  if (!sid || Date.now() - last > SESSION_IDLE_MS) {
    sid = randomId();
    keep(tab, "ovoa_sid", sid);
    const q = new URLSearchParams(location.search);
    const referrer = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : "";
    start = { referrer };
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "ref"]) start[k] = q.get(k) ?? "";
  }
  keep(tab, "ovoa_seen", String(Date.now()));
  return { vid, sid, start };
}

function push(e: Omit<Queued, "at" | "p"> & { p?: string }) {
  if (!state) return;
  state.queue.push({ p: state.path, ...e, at: Date.now() });
  keep(typeof sessionStorage === "undefined" ? undefined : sessionStorage, "ovoa_seen", String(Date.now()));
  if (state.queue.length >= 40) flush();
}

function flush() {
  if (!state || !state.queue.length) return;
  const at = Date.now();
  const body = JSON.stringify({
    sid: state.sid,
    vid: state.vid,
    start: state.start ?? undefined,
    hello: state.hello || undefined,
    events: state.queue.map(({ at: t, ...e }) => ({ ...e, ago: at - t })),
  });
  state.queue = [];
  state.start = null;
  state.hello = false;
  const blob = new Blob([body], { type: "application/json" });
  if (!navigator.sendBeacon?.(ENDPOINT, blob)) {
    fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
  }
}

function scrollDepth() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - innerHeight;
  return max <= 0 ? 100 : Math.min(100, Math.round((scrollY / max) * 100));
}

function leavePage() {
  if (!state) return;
  const seconds = Math.round((Date.now() - state.pageAt) / 1000);
  push({ t: "leave", v: seconds, y: state.depth });
}

function enterPage(path: string) {
  if (!state) return;
  if (state.path) leavePage();
  state.path = path;
  state.pageAt = Date.now();
  state.depth = 0;
  state.marks = new Set();
  // Until the new page has drawn, the scroll position is still the old page's.
  state.ready = false;
  // Sent once the page has drawn, with its height (the admin's click map uses it).
  setTimeout(() => {
    if (!state || state.path !== path) return;
    state.ready = true;
    push({ t: "pageview", el: document.title.slice(0, 200), v: document.documentElement.scrollHeight });
    onScroll();
  }, 400);
}

/** A short, human name for what was clicked: its text, label or link. */
function describe(el: Element): string {
  const hit = el.closest("a,button,[role=button],[role=tab],[role=link],summary,label,input[type=submit],input[type=button],select") ?? el;
  const tag = hit.tagName.toLowerCase();
  if (hit instanceof HTMLInputElement || hit instanceof HTMLSelectElement) {
    return `${tag}: ${hit.getAttribute("aria-label") ?? hit.name ?? hit.id ?? ""}`.slice(0, 200);
  }
  const label = hit.getAttribute("data-track") ?? hit.getAttribute("aria-label") ?? (hit.textContent ?? "").replace(/\s+/g, " ").trim();
  const href = hit instanceof HTMLAnchorElement ? hit.getAttribute("href") : null;
  const name = label.slice(0, 80) || (hit.id ? `#${hit.id}` : tag);
  return `${hit === el && !/^(a|button)$/.test(tag) ? `${tag}: ` : ""}${name}${href ? ` → ${href}` : ""}`.slice(0, 200);
}

function onClick(e: MouseEvent) {
  if (!state || !(e.target instanceof Element)) return;
  const doc = document.documentElement;
  const x = Math.round((e.pageX / Math.max(1, doc.scrollWidth)) * 100);
  const y = Math.round((e.pageY / Math.max(1, doc.scrollHeight)) * 100);
  const el = describe(e.target);
  push({ t: "click", el, x, y });

  // Three clicks in under a second in the same spot: something looks clickable and isn't.
  const now = Date.now();
  state.clicks = [...state.clicks.filter((c) => now - c.at < 1000), { at: now, x: e.clientX, y: e.clientY }];
  const near = state.clicks.filter((c) => Math.abs(c.x - e.clientX) < 30 && Math.abs(c.y - e.clientY) < 30);
  if (near.length === 3) push({ t: "rage", el, x, y });
}

function onScroll() {
  if (!state?.ready) return;
  const d = scrollDepth();
  if (d > state.depth) state.depth = d;
  for (const m of SCROLL_MARKS) {
    if (d >= m && !state.marks.has(m)) {
      state.marks.add(m);
      push({ t: "scroll", v: m });
    }
  }
}

function onHide() {
  if (document.visibilityState === "hidden") {
    leavePage();
    flush();
  } else if (state) {
    state.pageAt = Date.now();
  }
}

export function useAnalytics() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    // The admin's click map shows pages in a frame; those views aren't visits.
    if (window.top !== window) return;
    if (!state) {
      state = { ...session(), hello: true, queue: [], path: "", pageAt: Date.now(), depth: 0, marks: new Set(), ready: false, clicks: [] };
    }
    void startReplay(state.sid).catch(() => undefined);
    addEventListener("click", onClick, { capture: true, passive: true });
    addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    const timer = setInterval(flush, FLUSH_MS);
    return () => {
      removeEventListener("click", onClick, { capture: true });
      removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!state || state.path === path) return;
    enterPage(path);
  }, [path]);
}
