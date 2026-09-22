import { createServerFn } from "@tanstack/react-start";
import {
  CHECKOUT_SESSION_PATTERN,
  FALLBACK_PLANS,
  REF_PATTERN,
  TRIAL_DAYS,
  cleanRef,
  isEntitled,
  type MemberPlan,
  type PlansResult,
} from "./plans";

// Server-only modules are imported inside each handler: this file also ships
// to the browser, where the handlers are swapped for RPC calls.

export const getPlans = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlansResult> => {
    const { stripeConfigured, publicPlans } = await import("./sync.server");
    if (!stripeConfigured())
      return { configured: false, plans: FALLBACK_PLANS, trialDays: TRIAL_DAYS };
    try {
      const plans = await publicPlans();
      if (plans.length === 0)
        return { configured: false, plans: FALLBACK_PLANS, trialDays: TRIAL_DAYS };
      return { configured: true, plans, trialDays: TRIAL_DAYS };
    } catch (error) {
      console.error("[membership] plans", error);
      return { configured: false, plans: FALLBACK_PLANS, trialDays: TRIAL_DAYS };
    }
  },
);

// ---------- Welcome page ----------

export type WelcomeData =
  | { state: "pending" }
  | { state: "error"; message: string }
  | {
      state: "ready";
      firstName: string | null;
      email: string;
      plan: MemberPlan;
      status: string;
      entitled: boolean;
      trialEndsAt: string | null;
      renewsAt: string | null;
      cancelAtPeriodEnd: boolean;
      testflight: {
        mode: "invite" | "link" | "manual";
        state: string;
        publicUrl: string | null;
      };
      upgrade: { annualCents: number; saveCents: number; currency: string } | null;
    };

async function welcomeFor(sessionId: string): Promise<WelcomeData> {
  const sync = await import("./sync.server");
  const { testflightInvitesConfigured, testflightPublicUrl } = await import("./testflight.server");
  const member = await sync.syncCheckoutSession(sessionId);
  if (!member) return { state: "pending" };

  let upgrade: Extract<WelcomeData, { state: "ready" }>["upgrade"] = null;
  if (member.plan === "monthly" && member.status === "trialing") {
    const prices = await sync.loadPrices();
    const monthly = prices.get("monthly")?.unit_amount;
    const annual = prices.get("annual");
    if (monthly && annual?.unit_amount && monthly * 12 > annual.unit_amount) {
      upgrade = {
        annualCents: annual.unit_amount,
        saveCents: monthly * 12 - annual.unit_amount,
        currency: annual.currency,
      };
    }
  }

  const publicUrl = testflightPublicUrl();
  return {
    state: "ready",
    firstName: member.name?.split(/\s+/)[0] ?? null,
    email: member.email,
    plan: member.plan,
    status: member.status,
    entitled: isEntitled(member.status),
    trialEndsAt: member.trial_ends_at,
    renewsAt: member.current_period_end,
    cancelAtPeriodEnd: member.cancel_at_period_end,
    testflight: {
      mode: testflightInvitesConfigured() ? "invite" : publicUrl ? "link" : "manual",
      state: member.testflight_state,
      publicUrl,
    },
    upgrade,
  };
}

function sessionInput(input: { sessionId?: unknown }) {
  const sessionId = typeof input?.sessionId === "string" ? input.sessionId : "";
  if (!CHECKOUT_SESSION_PATTERN.test(sessionId)) throw new Error("That link isn't valid.");
  return { sessionId };
}

export const getWelcome = createServerFn({ method: "GET" })
  .inputValidator(sessionInput)
  .handler(async ({ data }): Promise<WelcomeData> => {
    try {
      return await welcomeFor(data.sessionId);
    } catch (error) {
      console.error("[membership] welcome", error);
      return {
        state: "error",
        message: "We couldn't load your membership just now. Refresh in a moment.",
      };
    }
  });

// Monthly → annual while still in the free trial. Nothing is charged today;
// the annual price starts when the trial ends.
export const switchToAnnual = createServerFn({ method: "POST" })
  .inputValidator(sessionInput)
  .handler(async ({ data }): Promise<WelcomeData> => {
    const sync = await import("./sync.server");
    const { stripe } = await import("./stripe.server");
    const member = await sync.syncCheckoutSession(data.sessionId);
    if (
      !member?.stripe_subscription_id ||
      member.plan !== "monthly" ||
      member.status !== "trialing"
    ) {
      throw new Error("This membership can't be switched here. Use Manage billing instead.");
    }
    const annual = (await sync.loadPrices()).get("annual");
    if (!annual) throw new Error("The annual plan isn't set up yet.");
    const sub = await stripe<{ items: { data: { id: string }[] }; trial_end: number | null }>(
      "GET",
      `/subscriptions/${member.stripe_subscription_id}`,
    );
    const item = sub.items.data[0];
    if (!item) throw new Error("Subscription has no items.");
    await stripe("POST", `/subscriptions/${member.stripe_subscription_id}`, {
      items: [{ id: item.id, price: annual.id }],
      proration_behavior: "none",
      trial_end: sub.trial_end ?? undefined,
    });
    await sync.syncSubscription(member.stripe_subscription_id);
    return welcomeFor(data.sessionId);
  });

// ---------- Partners ----------

export const recordReferralClick = createServerFn({ method: "POST" })
  .inputValidator((input: { code?: unknown }) => {
    const code = cleanRef(input?.code);
    if (!code) throw new Error("Bad code");
    return { code };
  })
  .handler(async ({ data }) => {
    const { db } = await import("./sync.server");
    await db().rpc("record_affiliate_click", { p_code: data.code });
    return { ok: true };
  });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const applyAffiliate = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      name?: unknown;
      email?: unknown;
      audience?: unknown;
      code?: unknown;
      payoutEmail?: unknown;
    }) => {
      const text = (v: unknown, max: number) =>
        typeof v === "string" ? v.trim().slice(0, max) : "";
      const name = text(input?.name, 80);
      const email = text(input?.email, 200).toLowerCase();
      const code = text(input?.code, 24).toLowerCase();
      const payoutEmail = text(input?.payoutEmail, 200).toLowerCase();
      if (!name) throw new Error("Add your name.");
      if (!EMAIL.test(email)) throw new Error("That email doesn't look right.");
      if (!REF_PATTERN.test(code)) {
        throw new Error("Your code needs 3–24 lowercase letters, numbers or dashes.");
      }
      if (payoutEmail && !EMAIL.test(payoutEmail))
        throw new Error("That PayPal email doesn't look right.");
      return {
        name,
        email,
        code,
        audience: text(input?.audience, 400),
        payoutEmail: payoutEmail || email,
      };
    },
  )
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; message: string }> => {
    const { db } = await import("./sync.server");
    const { AFFILIATE_PERCENT } = await import("./plans");
    const { error } = await db()
      .from("affiliates")
      .insert({
        code: data.code,
        name: data.name,
        email: data.email,
        audience: data.audience || null,
        payout_email: data.payoutEmail,
        percent: AFFILIATE_PERCENT,
      });
    if (error?.code === "23505") return { ok: false, message: "That code is taken. Try another." };
    if (error) {
      console.error("[membership] apply", error.message);
      return { ok: false, message: "That didn't go through. Try again in a minute." };
    }
    return { ok: true };
  });

export type PartnerStats = {
  code: string;
  name: string;
  status: string;
  percent: number;
  clicks: number;
  signups: number;
  paying: number;
  owedCents: number;
  paidCents: number;
  recent: { date: string; amountCents: number; commissionCents: number; status: string }[];
};

export const getPartnerStats = createServerFn({ method: "POST" })
  .inputValidator((input: { code?: unknown; key?: unknown }) => {
    const code = cleanRef(input?.code);
    const key = typeof input?.key === "string" ? input.key : "";
    if (!code || key.length < 16) throw new Error("That dashboard link isn't complete.");
    return { code, key };
  })
  .handler(async ({ data }): Promise<PartnerStats | null> => {
    const { db } = await import("./sync.server");
    const { safeEqual } = await import("./keys.server");
    const { data: affiliate } = await db()
      .from("affiliates")
      .select("*")
      .eq("code", data.code)
      .maybeSingle();
    if (!affiliate || !safeEqual(String(affiliate.dashboard_key), data.key)) return null;

    const [members, commissions] = await Promise.all([
      db().from("members").select("status").eq("ref_code", data.code).limit(10000),
      db()
        .from("affiliate_commissions")
        .select("amount_cents, commission_cents, status, created_at")
        .eq("affiliate_code", data.code)
        .order("created_at", { ascending: false })
        .limit(10000),
    ]);
    const rows = (commissions.data ?? []) as {
      amount_cents: number;
      commission_cents: number;
      status: string;
      created_at: string;
    }[];
    const sum = (status: string) =>
      rows.filter((r) => r.status === status).reduce((t, r) => t + r.commission_cents, 0);
    const statuses = ((members.data ?? []) as { status: string }[]).map((m) => m.status);
    return {
      code: affiliate.code,
      name: affiliate.name,
      status: affiliate.status,
      percent: Number(affiliate.percent),
      clicks: affiliate.clicks,
      signups: statuses.length,
      paying: statuses.filter((s) => ["active", "past_due", "lifetime"].includes(s)).length,
      owedCents: sum("owed"),
      paidCents: sum("paid"),
      recent: rows.slice(0, 20).map((r) => ({
        date: r.created_at,
        amountCents: r.amount_cents,
        commissionCents: r.commission_cents,
        status: r.status,
      })),
    };
  });

// ---------- Admin ----------

type AdminInput = { key?: unknown };

async function requireAdmin(key: unknown) {
  const { checkKey } = await import("./keys.server");
  if (!checkKey("OVOA_ADMIN_KEY", key)) throw new Error("Wrong admin key.");
}

function adminInput<T extends object>(extra: (input: Record<string, unknown>) => T) {
  return (input: AdminInput & Record<string, unknown>) => ({
    key: typeof input?.key === "string" ? input.key : "",
    ...extra(input ?? {}),
  });
}

export type AdminMember = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  ref: string | null;
  testflight: string;
  testflightError: string | null;
  note: string | null;
  checkoutSessionId: string | null;
  createdAt: string;
};

export type AdminAffiliate = {
  id: string;
  code: string;
  name: string;
  email: string;
  payoutEmail: string | null;
  audience: string | null;
  status: string;
  percent: number;
  clicks: number;
  signups: number;
  owedCents: number;
  paidCents: number;
  dashboardKey: string;
  createdAt: string;
};

export type AdminOverview = {
  config: {
    stripe: boolean;
    webhook: boolean;
    invites: boolean;
    publicLink: boolean;
    membershipApi: boolean;
    database: boolean;
  };
  stats: {
    trialing: number;
    paying: number;
    lifetime: number;
    comp: number;
    ended: number;
    mrrCents: number;
    trialMrrCents: number;
    lifetimeCents: number;
    owedCents: number;
  };
  members: AdminMember[];
  affiliates: AdminAffiliate[];
};

export const getAdminOverview = createServerFn({ method: "POST" })
  .inputValidator(adminInput(() => ({})))
  .handler(async ({ data }): Promise<AdminOverview> => {
    await requireAdmin(data.key);
    const sync = await import("./sync.server");
    const tf = await import("./testflight.server");

    const config = {
      stripe: sync.stripeConfigured(),
      webhook: Boolean(process.env["STRIPE_WEBHOOK_SECRET"]),
      invites: tf.testflightInvitesConfigured(),
      publicLink: Boolean(tf.testflightPublicUrl()),
      membershipApi: (process.env["MEMBERSHIP_API_KEY"] ?? "").length >= 16,
      database: true,
    };

    const [membersRes, affiliatesRes, commissionsRes] = await Promise.all([
      sync.db().from("members").select("*").order("created_at", { ascending: false }).limit(5000),
      sync.db().from("affiliates").select("*").order("created_at", { ascending: false }),
      sync
        .db()
        .from("affiliate_commissions")
        .select("affiliate_code, commission_cents, status")
        .limit(20000),
    ]);
    if (membersRes.error) {
      // Most likely the migration hasn't been applied yet.
      return {
        config: { ...config, database: false },
        stats: {
          trialing: 0,
          paying: 0,
          lifetime: 0,
          comp: 0,
          ended: 0,
          mrrCents: 0,
          trialMrrCents: 0,
          lifetimeCents: 0,
          owedCents: 0,
        },
        members: [],
        affiliates: [],
      };
    }

    const members = (membersRes.data ?? []) as import("./sync.server").Member[];
    const commissions = (commissionsRes.data ?? []) as {
      affiliate_code: string;
      commission_cents: number;
      status: string;
    }[];

    let prices = new Map<string, number>();
    if (config.stripe) {
      try {
        const loaded = await sync.loadPrices();
        prices = new Map([...loaded].map(([id, p]) => [id, p.unit_amount ?? 0]));
      } catch {
        /* stats fall back to zero revenue */
      }
    }
    const monthlyValue = (plan: string) =>
      plan === "monthly"
        ? (prices.get("monthly") ?? 0)
        : plan === "annual"
          ? Math.round((prices.get("annual") ?? 0) / 12)
          : 0;

    const stats = {
      trialing: 0,
      paying: 0,
      lifetime: 0,
      comp: 0,
      ended: 0,
      mrrCents: 0,
      trialMrrCents: 0,
      lifetimeCents: 0,
      owedCents: 0,
    };
    for (const m of members) {
      if (m.status === "trialing") {
        stats.trialing++;
        if (!m.cancel_at_period_end) stats.trialMrrCents += monthlyValue(m.plan);
      } else if (m.status === "active" || m.status === "past_due") {
        stats.paying++;
        if (!m.cancel_at_period_end) stats.mrrCents += monthlyValue(m.plan);
      } else if (m.status === "lifetime") {
        stats.lifetime++;
        stats.lifetimeCents += prices.get("lifetime") ?? 0;
      } else if (m.status === "comp") stats.comp++;
      else stats.ended++;
    }

    type AffiliateRow = {
      id: string;
      code: string;
      name: string;
      email: string;
      payout_email: string | null;
      audience: string | null;
      status: string;
      percent: number | string;
      clicks: number;
      dashboard_key: string;
      created_at: string;
    };
    const affiliates: AdminAffiliate[] = ((affiliatesRes.data ?? []) as AffiliateRow[]).map((a) => {
      const mine = commissions.filter((c) => c.affiliate_code === a.code);
      const total = (status: string) =>
        mine.filter((c) => c.status === status).reduce((t, c) => t + c.commission_cents, 0);
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        email: a.email,
        payoutEmail: a.payout_email,
        audience: a.audience,
        status: a.status,
        percent: Number(a.percent),
        clicks: a.clicks,
        signups: members.filter((m) => m.ref_code === a.code).length,
        owedCents: total("owed"),
        paidCents: total("paid"),
        dashboardKey: a.dashboard_key,
        createdAt: a.created_at,
      };
    });
    stats.owedCents = affiliates.reduce((t, a) => t + a.owedCents, 0);

    return {
      config,
      stats,
      members: members.slice(0, 500).map((m) => ({
        id: m.id,
        email: m.email,
        name: m.name,
        plan: m.plan,
        status: m.status,
        trialEndsAt: m.trial_ends_at,
        renewsAt: m.current_period_end,
        cancelAtPeriodEnd: m.cancel_at_period_end,
        ref: m.ref_code,
        testflight: m.testflight_state,
        testflightError: m.testflight_error,
        note: m.note,
        checkoutSessionId: m.checkout_session_id,
        createdAt: m.created_at,
      })),
      affiliates,
    };
  });

export const setAffiliateStatus = createServerFn({ method: "POST" })
  .inputValidator(
    adminInput((input) => ({
      id: String(input["id"] ?? ""),
      status: input["status"] === "approved" ? "approved" : "rejected",
    })),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.key);
    const { db } = await import("./sync.server");
    const { error } = await db()
      .from("affiliates")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAffiliatePaid = createServerFn({ method: "POST" })
  .inputValidator(adminInput((input) => ({ code: cleanRef(input["code"]) ?? "" })))
  .handler(async ({ data }) => {
    await requireAdmin(data.key);
    const { db } = await import("./sync.server");
    const { error } = await db()
      .from("affiliate_commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("affiliate_code", data.code)
      .eq("status", "owed");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const retryTestflight = createServerFn({ method: "POST" })
  .inputValidator(adminInput((input) => ({ id: String(input["id"] ?? "") })))
  .handler(async ({ data }) => {
    await requireAdmin(data.key);
    const sync = await import("./sync.server");
    const { data: row } = await sync
      .db()
      .from("members")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("No such member.");
    const member = await sync.syncTestflight(row as import("./sync.server").Member, {
      force: true,
    });
    return { state: member.testflight_state, error: member.testflight_error };
  });

export const listTestflightGroups = createServerFn({ method: "POST" })
  .inputValidator(adminInput(() => ({})))
  .handler(async ({ data }) => {
    await requireAdmin(data.key);
    const tf = await import("./testflight.server");
    if (
      !process.env["ASC_KEY_ID"] ||
      !process.env["ASC_ISSUER_ID"] ||
      !process.env["ASC_PRIVATE_KEY"]
    ) {
      throw new Error("Add ASC_KEY_ID, ASC_ISSUER_ID and ASC_PRIVATE_KEY first.");
    }
    return tf.listBetaGroups();
  });

// Free access for reviewers, friends and creators. Shows up to the app like
// any paying member.
export const grantAccess = createServerFn({ method: "POST" })
  .inputValidator(
    adminInput((input) => {
      const email = String(input["email"] ?? "")
        .trim()
        .toLowerCase();
      if (!EMAIL.test(email)) throw new Error("That email doesn't look right.");
      return {
        email,
        name:
          String(input["name"] ?? "")
            .trim()
            .slice(0, 80) || null,
        note:
          String(input["note"] ?? "")
            .trim()
            .slice(0, 200) || null,
      };
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.key);
    const sync = await import("./sync.server");
    const { testflightInvitesConfigured } = await import("./testflight.server");
    const { data: row, error } = await sync
      .db()
      .from("members")
      .insert({
        email: data.email,
        name: data.name,
        note: data.note,
        plan: "comp",
        status: "comp",
        testflight_state: testflightInvitesConfigured() ? "pending" : "off",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const member = await sync.syncTestflight(row as import("./sync.server").Member);
    return { state: member.testflight_state, error: member.testflight_error };
  });

export const endCompAccess = createServerFn({ method: "POST" })
  .inputValidator(adminInput((input) => ({ id: String(input["id"] ?? "") })))
  .handler(async ({ data }) => {
    await requireAdmin(data.key);
    const sync = await import("./sync.server");
    const { data: row, error } = await sync
      .db()
      .from("members")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("plan", "comp")
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await sync.syncTestflight(row as import("./sync.server").Member);
    return { ok: true };
  });
