// Where members, partners and commissions are kept. Two backends, same shape:
//
//   - Lovable (the real site): Lovable Cloud's Supabase, tables from
//     supabase/migrations/20260922150000_membership.sql,
//     20260922200000_tiers_and_band_orders.sql and 20260923120000_member_app_email.sql
//   - The Cloudflare test Worker: D1 bound as SITE_DB, tables from
//     migrations/ (Lovable's Supabase service key can't be used outside Lovable)
//
// store() picks D1 whenever the SITE_DB binding exists.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { MemberPlan, PaidTier } from "./plans";
import {
  all,
  databaseConnected,
  isMissingTable,
  isUniqueViolation,
  now,
  one,
  run,
} from "./db.server";

export type Member = {
  id: string;
  email: string;
  // The OVOA app account this membership unlocks, when it isn't `email`.
  app_email: string | null;
  name: string | null;
  plan: MemberPlan;
  tier: PaidTier;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  checkout_session_id: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  ref_code: string | null;
  testflight_state: string;
  testflight_tester_id: string | null;
  testflight_error: string | null;
  note: string | null;
  created_at: string;
};

export type MemberPatch = Partial<Omit<Member, "id" | "created_at">> & {
  testflight_updated_at?: string;
};

export type Affiliate = {
  id: string;
  code: string;
  name: string;
  email: string;
  audience: string | null;
  payout_email: string | null;
  status: string;
  percent: number;
  dashboard_key: string;
  clicks: number;
  created_at: string;
};

export type NewAffiliate = Pick<
  Affiliate,
  "code" | "name" | "email" | "audience" | "payout_email" | "percent"
>;

export type Commission = {
  affiliate_code: string;
  member_id: string | null;
  source_id: string;
  payment_intent_id: string | null;
  amount_cents: number;
  commission_cents: number;
  currency: string;
  status: string;
  created_at: string;
};

export type NewCommission = Omit<Commission, "status" | "created_at">;

export type BandOrderStatus = "paid" | "shipped" | "refunded";

export type BandOrder = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  checkout_session_id: string;
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  amount_cents: number;
  currency: string;
  with_ai: boolean;
  ship_name: string | null;
  ship_line1: string | null;
  ship_line2: string | null;
  ship_city: string | null;
  ship_state: string | null;
  ship_postal_code: string | null;
  ship_country: string | null;
  ref_code: string | null;
  status: BandOrderStatus;
  shipped_at: string | null;
  created_at: string;
};

export type NewBandOrder = Omit<BandOrder, "id" | "status" | "shipped_at" | "created_at">;

export class DuplicateError extends Error {}

// The tables aren't there yet: the migration hasn't been applied.
export class StoreNotReadyError extends Error {}

type MemberKey = "id" | "stripe_subscription_id" | "checkout_session_id";

export interface Store {
  kind: "d1" | "supabase";
  findMember(column: MemberKey, value: string): Promise<Member | null>;
  insertMember(patch: MemberPatch): Promise<Member>;
  updateMember(id: string, patch: MemberPatch): Promise<Member>;
  membersByEmail(email: string): Promise<Member[]>;
  // The memberships that unlock the app account with this email: its own
  // (unless moved to another app account) and any moved to it.
  membersForApp(email: string): Promise<Member[]>;
  membersByRef(code: string): Promise<Member[]>;
  lifetimeByPaymentIntent(paymentIntentId: string): Promise<Member[]>;
  listMembers(limit: number): Promise<Member[]>;
  getAffiliate(code: string): Promise<Affiliate | null>;
  insertAffiliate(row: NewAffiliate): Promise<void>;
  setAffiliateStatus(id: string, status: "approved" | "rejected"): Promise<void>;
  listAffiliates(): Promise<Affiliate[]>;
  recordClick(code: string): Promise<void>;
  insertCommission(row: NewCommission): Promise<void>;
  voidCommissions(paymentIntentId: string | null, sourceId: string | null): Promise<void>;
  markCommissionsPaid(code: string): Promise<void>;
  listCommissions(code?: string): Promise<Commission[]>;
  // Records a paid Band once per checkout; later calls fill in payment ids
  // that weren't known yet and leave the status alone.
  recordBandOrder(row: NewBandOrder): Promise<BandOrder>;
  // Marks the Band orders paid through this payment intent or invoice.
  bandOrdersByPayment(
    paymentIntentId: string | null,
    invoiceId: string | null,
  ): Promise<BandOrder[]>;
  setBandOrderStatus(id: string, status: BandOrderStatus): Promise<void>;
  listBandOrders(limit: number): Promise<BandOrder[]>;
}

export function store(): Store {
  return databaseConnected() ? d1Store : supabaseStore;
}

const MEMBER_COLUMNS = new Set([
  "email",
  "app_email",
  "name",
  "plan",
  "tier",
  "status",
  "stripe_customer_id",
  "stripe_subscription_id",
  "stripe_payment_intent_id",
  "checkout_session_id",
  "trial_ends_at",
  "current_period_end",
  "cancel_at_period_end",
  "canceled_at",
  "ref_code",
  "testflight_state",
  "testflight_tester_id",
  "testflight_error",
  "testflight_updated_at",
  "note",
]);

function patchEntries(patch: MemberPatch) {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  for (const [k] of entries) if (!MEMBER_COLUMNS.has(k)) throw new Error(`Unknown column ${k}`);
  return entries as [string, string | number | boolean | null][];
}

const toMember = (row: Record<string, unknown>): Member =>
  ({ ...row, cancel_at_period_end: Boolean(row["cancel_at_period_end"]) }) as Member;

const toBandOrder = (row: Record<string, unknown>): BandOrder =>
  ({
    ...row,
    with_ai: Boolean(row["with_ai"]),
    amount_cents: Number(row["amount_cents"]),
  }) as BandOrder;

const BAND_COLUMNS = [
  "email",
  "name",
  "phone",
  "checkout_session_id",
  "stripe_customer_id",
  "stripe_payment_intent_id",
  "stripe_invoice_id",
  "amount_cents",
  "currency",
  "with_ai",
  "ship_name",
  "ship_line1",
  "ship_line2",
  "ship_city",
  "ship_state",
  "ship_postal_code",
  "ship_country",
  "ref_code",
] as const satisfies readonly (keyof NewBandOrder)[];

const toAffiliate = (row: Record<string, unknown>): Affiliate =>
  ({ ...row, percent: Number(row["percent"]) }) as Affiliate;

// ---------- Cloudflare D1 ----------

async function d1<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (isMissingTable(error))
      throw new StoreNotReadyError("Run the D1 migration (npm run cf:migrate).");
    if (isUniqueViolation(error)) throw new DuplicateError((error as Error).message);
    throw error;
  }
}

const d1Store: Store = {
  kind: "d1",
  findMember: (column, value) =>
    d1(async () => {
      const row = await one<Record<string, unknown>>(
        `SELECT * FROM members WHERE ${column} = ?`,
        value,
      );
      return row ? toMember(row) : null;
    }),
  insertMember: (patch) =>
    d1(async () => {
      const entries = patchEntries(patch);
      const row = await one<Record<string, unknown>>(
        `INSERT INTO members (${entries.map(([k]) => k).join(", ")}) VALUES (${entries.map(() => "?").join(", ")}) RETURNING *`,
        ...entries.map(([, v]) => v),
      );
      if (!row) throw new Error("Insert returned nothing");
      return toMember(row);
    }),
  updateMember: (id, patch) =>
    d1(async () => {
      const entries = patchEntries(patch);
      const row = await one<Record<string, unknown>>(
        `UPDATE members SET ${[...entries.map(([k]) => `${k} = ?`), "updated_at = ?"].join(", ")} WHERE id = ? RETURNING *`,
        ...entries.map(([, v]) => v),
        now(),
        id,
      );
      if (!row) throw new Error(`No member ${id}`);
      return toMember(row);
    }),
  membersByEmail: (email) =>
    d1(async () =>
      (
        await all<Record<string, unknown>>(
          "SELECT * FROM members WHERE email = ? ORDER BY created_at DESC",
          email,
        )
      ).map(toMember),
    ),
  membersForApp: (email) =>
    d1(async () =>
      (
        await all<Record<string, unknown>>(
          "SELECT * FROM members WHERE app_email = ? OR (email = ? AND app_email IS NULL) ORDER BY created_at DESC",
          email,
          email,
        )
      ).map(toMember),
    ),
  membersByRef: (code) =>
    d1(async () =>
      (await all<Record<string, unknown>>("SELECT * FROM members WHERE ref_code = ?", code)).map(
        toMember,
      ),
    ),
  lifetimeByPaymentIntent: (pi) =>
    d1(async () =>
      (
        await all<Record<string, unknown>>(
          "SELECT * FROM members WHERE stripe_payment_intent_id = ? AND plan = 'lifetime'",
          pi,
        )
      ).map(toMember),
    ),
  listMembers: (limit) =>
    d1(async () =>
      (
        await all<Record<string, unknown>>(
          "SELECT * FROM members ORDER BY created_at DESC LIMIT ?",
          limit,
        )
      ).map(toMember),
    ),
  getAffiliate: (code) =>
    d1(async () => {
      const row = await one<Record<string, unknown>>(
        "SELECT * FROM affiliates WHERE code = ?",
        code,
      );
      return row ? toAffiliate(row) : null;
    }),
  insertAffiliate: (row) =>
    d1(async () => {
      await run(
        "INSERT INTO affiliates (code, name, email, audience, payout_email, percent) VALUES (?, ?, ?, ?, ?, ?)",
        row.code,
        row.name,
        row.email,
        row.audience,
        row.payout_email,
        row.percent,
      );
    }),
  setAffiliateStatus: (id, status) =>
    d1(async () => {
      await run("UPDATE affiliates SET status = ? WHERE id = ?", status, id);
    }),
  listAffiliates: () =>
    d1(async () =>
      (await all<Record<string, unknown>>("SELECT * FROM affiliates ORDER BY created_at DESC")).map(
        toAffiliate,
      ),
    ),
  recordClick: (code) =>
    d1(async () => {
      await run(
        "UPDATE affiliates SET clicks = clicks + 1 WHERE code = ? AND status = 'approved'",
        code,
      );
    }),
  insertCommission: (c) =>
    d1(async () => {
      await run(
        `INSERT INTO affiliate_commissions
           (affiliate_code, member_id, source_id, payment_intent_id, amount_cents, commission_cents, currency)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (source_id) DO NOTHING`,
        c.affiliate_code,
        c.member_id,
        c.source_id,
        c.payment_intent_id,
        c.amount_cents,
        c.commission_cents,
        c.currency,
      );
    }),
  voidCommissions: (pi, source) =>
    d1(async () => {
      await run(
        "UPDATE affiliate_commissions SET status = 'void' WHERE status = 'owed' AND (payment_intent_id = ? OR source_id = ?)",
        pi ?? "",
        source ?? "",
      );
    }),
  markCommissionsPaid: (code) =>
    d1(async () => {
      await run(
        "UPDATE affiliate_commissions SET status = 'paid', paid_at = ? WHERE affiliate_code = ? AND status = 'owed'",
        now(),
        code,
      );
    }),
  listCommissions: (code) =>
    d1(() =>
      code
        ? all<Commission>(
            "SELECT * FROM affiliate_commissions WHERE affiliate_code = ? ORDER BY created_at DESC",
            code,
          )
        : all<Commission>("SELECT * FROM affiliate_commissions ORDER BY created_at DESC"),
    ),
  recordBandOrder: (order) =>
    d1(async () => {
      const row = await one<Record<string, unknown>>(
        `INSERT INTO band_orders (${BAND_COLUMNS.join(", ")})
         VALUES (${BAND_COLUMNS.map(() => "?").join(", ")})
         ON CONFLICT (checkout_session_id) DO UPDATE SET
           stripe_payment_intent_id = COALESCE(band_orders.stripe_payment_intent_id, excluded.stripe_payment_intent_id),
           stripe_invoice_id = COALESCE(band_orders.stripe_invoice_id, excluded.stripe_invoice_id),
           updated_at = ?
         RETURNING *`,
        ...BAND_COLUMNS.map((c) => order[c]),
        now(),
      );
      if (!row) throw new Error("Band order insert returned nothing");
      return toBandOrder(row);
    }),
  bandOrdersByPayment: (pi, invoice) =>
    d1(async () =>
      (
        await all<Record<string, unknown>>(
          "SELECT * FROM band_orders WHERE stripe_payment_intent_id = ? OR stripe_invoice_id = ?",
          pi ?? "",
          invoice ?? "",
        )
      ).map(toBandOrder),
    ),
  setBandOrderStatus: (id, status) =>
    d1(async () => {
      await run(
        "UPDATE band_orders SET status = ?, shipped_at = CASE WHEN ? = 'shipped' THEN ? ELSE shipped_at END, updated_at = ? WHERE id = ?",
        status,
        status,
        now(),
        now(),
        id,
      );
    }),
  listBandOrders: (limit) =>
    d1(async () =>
      (
        await all<Record<string, unknown>>(
          "SELECT * FROM band_orders ORDER BY created_at DESC LIMIT ?",
          limit,
        )
      ).map(toBandOrder),
    ),
};

// ---------- Lovable Cloud (Supabase) ----------

// The generated Database type doesn't know these tables until Lovable
// regenerates it after the migration, so they're used untyped here.
const sb = () => supabaseAdmin as unknown as SupabaseClient;

type PgError = { code?: string; message: string } | null;

function check(error: PgError) {
  if (!error) return;
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|Could not find the table/i.test(error.message)
  ) {
    throw new StoreNotReadyError("Apply the Supabase migration in Lovable (setup.md, step 5).");
  }
  if (error.code === "23505") throw new DuplicateError(error.message);
  throw new Error(error.message);
}

async function rows(query: PromiseLike<{ data: unknown; error: PgError }>) {
  const { data, error } = await query;
  check(error);
  return (data ?? []) as Record<string, unknown>[];
}

const supabaseStore: Store = {
  kind: "supabase",
  async findMember(column, value) {
    const { data, error } = await sb().from("members").select("*").eq(column, value).maybeSingle();
    check(error);
    return data ? toMember(data) : null;
  },
  async insertMember(patch) {
    const { data, error } = await sb()
      .from("members")
      .insert(Object.fromEntries(patchEntries(patch)))
      .select("*")
      .single();
    check(error);
    return toMember(data);
  },
  async updateMember(id, patch) {
    const { data, error } = await sb()
      .from("members")
      .update(Object.fromEntries(patchEntries(patch)))
      .eq("id", id)
      .select("*")
      .single();
    check(error);
    return toMember(data);
  },
  async membersByEmail(email) {
    return (
      await rows(
        sb()
          .from("members")
          .select("*")
          .eq("email", email)
          .order("created_at", { ascending: false }),
      )
    ).map(toMember);
  },
  async membersForApp(email) {
    let found: Record<string, unknown>[][];
    try {
      found = await Promise.all([
        rows(sb().from("members").select("*").eq("app_email", email)),
        rows(sb().from("members").select("*").eq("email", email).is("app_email", null)),
      ]);
    } catch (error) {
      // Published before the app_email migration was applied: nobody has moved
      // a membership yet, so the paying email is the whole answer.
      if (error instanceof StoreNotReadyError) return supabaseStore.membersByEmail(email);
      throw error;
    }
    const [moved, own] = found;
    return [...moved!, ...own!]
      .map(toMember)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async membersByRef(code) {
    return (await rows(sb().from("members").select("*").eq("ref_code", code).limit(10000))).map(
      toMember,
    );
  },
  async lifetimeByPaymentIntent(pi) {
    return (
      await rows(
        sb().from("members").select("*").eq("stripe_payment_intent_id", pi).eq("plan", "lifetime"),
      )
    ).map(toMember);
  },
  async listMembers(limit) {
    return (
      await rows(
        sb().from("members").select("*").order("created_at", { ascending: false }).limit(limit),
      )
    ).map(toMember);
  },
  async getAffiliate(code) {
    const { data, error } = await sb()
      .from("affiliates")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    check(error);
    return data ? toAffiliate(data) : null;
  },
  async insertAffiliate(row) {
    const { error } = await sb().from("affiliates").insert(row);
    check(error);
  },
  async setAffiliateStatus(id, status) {
    const { error } = await sb().from("affiliates").update({ status }).eq("id", id);
    check(error);
  },
  async listAffiliates() {
    return (
      await rows(sb().from("affiliates").select("*").order("created_at", { ascending: false }))
    ).map(toAffiliate);
  },
  async recordClick(code) {
    const { error } = await sb().rpc("record_affiliate_click", { p_code: code });
    check(error);
  },
  async insertCommission(row) {
    const { error } = await sb()
      .from("affiliate_commissions")
      .upsert(row, { onConflict: "source_id", ignoreDuplicates: true });
    check(error);
  },
  async voidCommissions(pi, source) {
    const filters = [pi && `payment_intent_id.eq.${pi}`, source && `source_id.eq.${source}`]
      .filter(Boolean)
      .join(",");
    if (!filters) return;
    const { error } = await sb()
      .from("affiliate_commissions")
      .update({ status: "void" })
      .eq("status", "owed")
      .or(filters);
    check(error);
  },
  async markCommissionsPaid(code) {
    const { error } = await sb()
      .from("affiliate_commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("affiliate_code", code)
      .eq("status", "owed");
    check(error);
  },
  async listCommissions(code) {
    const base = sb()
      .from("affiliate_commissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20000);
    return (await rows(code ? base.eq("affiliate_code", code) : base)) as unknown as Commission[];
  },
  async recordBandOrder(order) {
    const existing = await sb()
      .from("band_orders")
      .select("*")
      .eq("checkout_session_id", order.checkout_session_id)
      .maybeSingle();
    check(existing.error);
    if (existing.data) {
      const row = toBandOrder(existing.data);
      const fill = {
        ...(!row.stripe_payment_intent_id && order.stripe_payment_intent_id
          ? { stripe_payment_intent_id: order.stripe_payment_intent_id }
          : {}),
        ...(!row.stripe_invoice_id && order.stripe_invoice_id
          ? { stripe_invoice_id: order.stripe_invoice_id }
          : {}),
      };
      if (Object.keys(fill).length === 0) return row;
      const { data, error } = await sb()
        .from("band_orders")
        .update(fill)
        .eq("id", row.id)
        .select("*")
        .single();
      check(error);
      return toBandOrder(data);
    }
    const { data, error } = await sb()
      .from("band_orders")
      .insert(Object.fromEntries(BAND_COLUMNS.map((c) => [c, order[c]])))
      .select("*")
      .single();
    if (error?.code === "23505") return this.recordBandOrder(order); // raced the other sync
    check(error);
    return toBandOrder(data);
  },
  async bandOrdersByPayment(pi, invoice) {
    const filters = [
      pi && `stripe_payment_intent_id.eq.${pi}`,
      invoice && `stripe_invoice_id.eq.${invoice}`,
    ]
      .filter(Boolean)
      .join(",");
    if (!filters) return [];
    return (await rows(sb().from("band_orders").select("*").or(filters))).map(toBandOrder);
  },
  async setBandOrderStatus(id, status) {
    const { error } = await sb()
      .from("band_orders")
      .update({
        status,
        ...(status === "shipped" ? { shipped_at: new Date().toISOString() } : {}),
      })
      .eq("id", id);
    check(error);
  },
  async listBandOrders(limit) {
    return (
      await rows(
        sb().from("band_orders").select("*").order("created_at", { ascending: false }).limit(limit),
      )
    ).map(toBandOrder);
  },
};
