-- First-party analytics for ovoa.ai (src/lib/analytics.ts sends, the route
-- /api/public/t stores). No third party sees it. admin.ovoa.ai reads these
-- tables through its SITE_DB binding for its Analytics page.
--
--   analytics_sessions: one row per visit (a tab's session; 30 minutes idle
--     starts a new one). visitor_id is a random id kept in localStorage, so
--     returning visitors can be counted. email is filled in when the visitor
--     is signed in to ovoa.ai.
--   analytics_events: what happened in the visit.
--     type: pageview | click | scroll | leave | rage
--     path: the page, target: what was clicked (link/button text or href),
--     value: the page's height in px (pageview), scroll depth reached (scroll: 25/50/75/100) or seconds on the
--     page while visible (leave, whose y is the deepest scroll %),
--     x/y: click position as % of the page width / height.
--
-- Apply: npm run db:migrate

CREATE TABLE analytics_sessions (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  email TEXT,
  started_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  landing_path TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ref TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  pageviews INTEGER NOT NULL DEFAULT 0,
  events INTEGER NOT NULL DEFAULT 0,
  max_scroll INTEGER NOT NULL DEFAULT 0,
  seconds INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX analytics_sessions_started_idx ON analytics_sessions (started_at);
CREATE INDEX analytics_sessions_visitor_idx ON analytics_sessions (visitor_id);
CREATE INDEX analytics_sessions_email_idx ON analytics_sessions (email);

CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  type TEXT NOT NULL,
  path TEXT NOT NULL,
  target TEXT,
  value INTEGER,
  x INTEGER,
  y INTEGER
);

CREATE INDEX analytics_events_session_idx ON analytics_events (session_id, id);
CREATE INDEX analytics_events_ts_idx ON analytics_events (ts, type);
CREATE INDEX analytics_events_path_idx ON analytics_events (path, type);
