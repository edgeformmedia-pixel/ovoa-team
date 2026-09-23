// TestFlight invites for the free app. The app is free, so anyone who wants it
// gets Apple's invite email without asking for it: whoever makes or signs in to
// an OVOA account on ovoa.ai (which proves the email), and whoever buys a Band.
// Members get theirs through sync.server.ts.
//
// Each invite is kept in D1 (app_invites, migrations/0005_app_invites.sql), so
// it's asked for once, a failed one is retried at most every few minutes, and
// "Send it again" is spaced out. Without the table Apple's own list is the
// record: someone already in the beta group isn't emailed twice, and there's no
// "Send it again".

import { DatabaseMissingError, all, isMissingTable, now, one } from "./db.server";
import { inviteTester, testflightInvitesConfigured } from "./testflight.server";

export type InviteSource = "account" | "band";

type Row = {
  email: string;
  name: string | null;
  source: InviteSource;
  state: "invited" | "failed";
  tester_id: string | null;
  error: string | null;
  sends: number;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

// What the pages show. `off`: invites aren't set up, so the page offers the
// public link or support instead.
export type AppInvite = {
  state: "off" | "invited" | "failed";
  // "Send it again" is offered.
  resend: boolean;
};

const RETRY_GAP_MS = 10 * 60 * 1000;
const RESEND_GAP_MS = 10 * 60 * 1000;
const MAX_SENDS = 5;

const OFF: AppInvite = { state: "off", resend: false };

const age = (iso: string | null) => (iso ? Date.now() - Date.parse(iso) : Infinity);

// undefined: there's no table to keep invites in (no D1, or not migrated).
async function stored<T>(work: () => Promise<T>): Promise<T | undefined> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof DatabaseMissingError || isMissingTable(error)) return undefined;
    throw error;
  }
}

const load = (email: string) =>
  stored(() => one<Row>("SELECT * FROM app_invites WHERE email = ?", email));

const save = (r: Omit<Row, "created_at" | "updated_at">) =>
  stored(() =>
    one<Row>(
      `INSERT INTO app_invites (email, name, source, state, tester_id, error, sends, last_sent_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (email) DO UPDATE SET
         name = coalesce(excluded.name, app_invites.name),
         state = excluded.state,
         tester_id = coalesce(excluded.tester_id, app_invites.tester_id),
         error = excluded.error,
         sends = excluded.sends,
         last_sent_at = excluded.last_sent_at,
         updated_at = excluded.updated_at
       RETURNING *`,
      r.email,
      r.name,
      r.source,
      r.state,
      r.tester_id,
      r.error,
      r.sends,
      r.last_sent_at,
      now(),
    ),
  );

function view(row: Row | null | undefined, state: "invited" | "failed"): AppInvite {
  if (!row) return { state, resend: false };
  return { state: row.state, resend: row.sends < MAX_SENDS };
}

async function send(
  email: string,
  name: string | null,
  source: InviteSource,
  row: Row | null | undefined,
  resend: boolean,
): Promise<AppInvite> {
  const kept = {
    email,
    name,
    source: row?.source ?? source,
    sends: row?.sends ?? 0,
    last_sent_at: row?.last_sent_at ?? null,
  };
  try {
    const { testerId, emailed } = await inviteTester(email, name, { resend });
    const saved = await save({
      ...kept,
      state: "invited",
      tester_id: testerId,
      error: null,
      ...(emailed ? { sends: kept.sends + 1, last_sent_at: now() } : {}),
    });
    return view(saved, "invited");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[invites]", email, message);
    const saved = await save({
      ...kept,
      state: "failed",
      tester_id: null,
      error: message.slice(0, 500),
    });
    return view(saved, "failed");
  }
}

const clean = (email: string) => email.trim().toLowerCase();

/** Invites this email to the beta once. Cheap to call on every page load. */
export async function ensureInvite(
  email: string,
  name: string | null,
  source: InviteSource,
): Promise<AppInvite> {
  if (!testflightInvitesConfigured()) return OFF;
  const address = clean(email);
  const row = await load(address);
  if (row?.state === "invited") return view(row, "invited");
  if (row?.state === "failed" && age(row.updated_at) < RETRY_GAP_MS) return view(row, "failed");
  return send(address, name, source, row, false);
}

/** "Send it again" on the account page: at most every 10 minutes, 5 in all. */
export async function sendInviteAgain(
  email: string,
  name: string | null,
): Promise<{ invite: AppInvite; message: string }> {
  if (!testflightInvitesConfigured()) {
    return { invite: OFF, message: "Invites aren't set up yet. Write to support@ovoa.ai." };
  }
  const address = clean(email);
  const row = await load(address);
  if (!row) {
    const invite = await ensureInvite(address, name, "account");
    return { invite, message: "If it hasn't come in an hour, write to support@ovoa.ai." };
  }
  if (row.sends >= MAX_SENDS) {
    return {
      invite: view(row, row.state),
      message: "We've sent it a few times now. Write to support@ovoa.ai and we'll sort it out.",
    };
  }
  if (age(row.last_sent_at) < RESEND_GAP_MS) {
    return {
      invite: view(row, row.state),
      message:
        "It went out a few minutes ago. Give it a little longer, and check your spam folder.",
    };
  }
  const invite = await send(address, name, row.source, row, true);
  return {
    invite,
    message:
      invite.state === "invited"
        ? "Sent again. It comes from TestFlight."
        : "That didn't go through. Try again in a few minutes, or write to support@ovoa.ai.",
  };
}

// ---------- Admin ----------

export type AdminInvite = {
  email: string;
  name: string | null;
  source: InviteSource;
  state: "invited" | "failed";
  error: string | null;
  sends: number;
  lastSentAt: string | null;
  createdAt: string;
};

/** Null when there's no table to read. */
export async function listInvites(limit: number): Promise<AdminInvite[] | null> {
  const rows = await stored(() =>
    all<Row>("SELECT * FROM app_invites ORDER BY created_at DESC LIMIT ?", limit),
  );
  if (!rows) return null;
  return rows.map((r) => ({
    email: r.email,
    name: r.name,
    source: r.source,
    state: r.state,
    error: r.error,
    sends: Number(r.sends),
    lastSentAt: r.last_sent_at,
    createdAt: r.created_at,
  }));
}

/** The admin page's Retry: asks Apple again now, whatever the spacing. */
export async function retryInvite(email: string): Promise<AppInvite> {
  if (!testflightInvitesConfigured()) throw new Error("TestFlight invites aren't set up.");
  const row = await load(clean(email));
  if (!row) throw new Error("No invite for that email.");
  return send(row.email, row.name, row.source, row, true);
}
