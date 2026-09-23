import { createServerFn } from "@tanstack/react-start";
import {
  BAND_TRIAL_DAYS,
  CHECKOUT_SESSION_PATTERN,
  FALLBACK_BAND,
  FALLBACK_PLANS,
  NO_BAND_TRIAL_DAYS,
  REF_PATTERN,
  cleanRef,
  isEntitled,
  isPaidTier,
  planId,
  type MemberPlan,
  type PaidTier,
  type PlanId,
  type PlansResult,
} from "./plans";

// Server-only modules are imported inside each handler: this file also ships
// to the browser, where the handlers are swapped for RPC calls.

// Prices for the pages. `configured` is false until Stripe has the plans, and
// the pages keep their buy buttons off in that state.
export const getPlans = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlansResult> => {
    const { testflightPublicUrl } = await import("./testflight.server");
    const trial = {
      trialDays: NO_BAND_TRIAL_DAYS,
      bandTrialDays: BAND_TRIAL_DAYS,
      betaUrl: testflightPublicUrl(),
    };
    const fallback: PlansResult = {
      configured: false,
      plans: FALLBACK_PLANS,
      band: FALLBACK_BAND,
      ...trial,
    };
    const { stripeConfigured, publicPlans } = await import("./sync.server");
    if (!stripeConfigured()) return fallback;
    try {
      const { plans, band } = await publicPlans();
      if (plans.length === 0) return { ...fallback, band: band ?? FALLBACK_BAND };
      return { configured: true, plans, band, ...trial };
    } catch (error) {
      console.error("[membership] plans", error);
      return fallback;
    }
  },
);

// ---------- Welcome page ----------

export type WelcomeBand = { status: string; withAi: boolean; shipTo: string | null };

export type WelcomeTestflight = {
  mode: "invite" | "link" | "manual";
  state: string;
  publicUrl: string | null;
};

export type WelcomeData =
  | { state: "pending" }
  | { state: "error"; message: string }
  // "Band only, no AI": a Band order and no membership.
  | {
      state: "band";
      firstName: string | null;
      email: string;
      band: WelcomeBand;
      testflight: WelcomeTestflight;
    }
  | {
      state: "ready";
      firstName: string | null;
      email: string;
      plan: MemberPlan;
      tier: PaidTier;
      status: string;
      entitled: boolean;
      trialEndsAt: string | null;
      renewsAt: string | null;
      cancelAtPeriodEnd: boolean;
      // Set when a Band came in the same checkout.
      band: WelcomeBand | null;
      testflight: WelcomeTestflight;
      // What their plan costs now (null for free access), and what they can
      // move to from here.
      price: { cents: number; currency: string; interval: "month" | "year" } | null;
      offers: WelcomeOffers;
    };

// The two moves offered on the welcome page: Base monthly → yearly, and
// Base → Pro. `chargedToday` says whether taking it charges the card now.
export type WelcomeOffer = {
  to: PlanId;
  cents: number;
  currency: string;
  interval: "month" | "year";
  // Yearly only: what it saves over twelve monthly payments.
  saveCents: number | null;
  chargedToday: boolean;
};
export type WelcomeOffers = { annual: WelcomeOffer | null; pro: WelcomeOffer | null };

function bandSummary(order: import("./store.server").BandOrder): WelcomeBand {
  const place = [order.ship_city, order.ship_state].filter(Boolean).join(", ");
  return { status: order.status, withAi: order.with_ai, shipTo: place || null };
}

type MemberRow = import("./store.server").Member;
type Prices = import("./sync.server").Prices;

// Which plan a switch button moves this member to, or null when it can't be
// done from the welcome page (free access, the old Founder plan, a membership
// that's ending or ended, or already there).
function switchTarget(member: MemberRow, to: "annual" | "pro"): PlanId | null {
  if (!member.stripe_subscription_id) return null;
  if (member.plan !== "monthly" && member.plan !== "annual") return null;
  if (member.status !== "trialing" && member.status !== "active") return null;
  if (member.cancel_at_period_end) return null;
  if (to === "annual") return member.plan === "monthly" ? planId(member.tier, "annual") : null;
  return member.tier === "base" ? planId("pro", member.plan) : null;
}

function offerFor(member: MemberRow, prices: Prices, to: "annual" | "pro"): WelcomeOffer | null {
  const target = switchTarget(member, to);
  const price = target ? prices.plans.get(target) : undefined;
  if (!target || !price?.unit_amount) return null;
  let saveCents: number | null = null;
  if (to === "annual") {
    const monthly = prices.plans.get(planId(member.tier, "monthly"))?.unit_amount;
    if (!monthly || monthly * 12 <= price.unit_amount) return null;
    saveCents = monthly * 12 - price.unit_amount;
  }
  return {
    to: target,
    cents: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval === "year" ? "year" : "month",
    saveCents,
    // Yearly during the Band's free days starts when they end. Everything else
    // (and Pro always) starts today.
    chargedToday: !(to === "annual" && member.status === "trialing"),
  };
}

async function welcomeFor(sessionId: string): Promise<WelcomeData> {
  const sync = await import("./sync.server");
  const { testflightInvitesConfigured, testflightPublicUrl } = await import("./testflight.server");
  const result = await sync.syncCheckoutSession(sessionId);
  if (!result) return { state: "pending" };
  const { member, bandOrder } = result;
  const publicUrl = testflightPublicUrl();

  if (!member) {
    if (!bandOrder) return { state: "pending" };
    return {
      state: "band",
      firstName: (bandOrder.ship_name ?? bandOrder.name)?.split(/\s+/)[0] ?? null,
      email: bandOrder.email,
      band: bandSummary(bandOrder),
      testflight: { mode: publicUrl ? "link" : "manual", state: "off", publicUrl },
    };
  }

  let price: Extract<WelcomeData, { state: "ready" }>["price"] = null;
  let offers: WelcomeOffers = { annual: null, pro: null };
  if (member.plan === "monthly" || member.plan === "annual") {
    try {
      const prices = await sync.loadPrices();
      const current = prices.plans.get(planId(member.tier, member.plan));
      if (current?.unit_amount) {
        price = {
          cents: current.unit_amount,
          currency: current.currency,
          interval: member.plan === "annual" ? "year" : "month",
        };
      }
      offers = {
        annual: offerFor(member, prices, "annual"),
        pro: offerFor(member, prices, "pro"),
      };
    } catch (error) {
      console.error("[membership] welcome prices", error);
    }
  }

  return {
    state: "ready",
    firstName: member.name?.split(/\s+/)[0] ?? null,
    email: member.email,
    plan: member.plan,
    tier: member.tier,
    status: member.status,
    entitled: isEntitled(member.status),
    trialEndsAt: member.trial_ends_at,
    renewsAt: member.current_period_end,
    cancelAtPeriodEnd: member.cancel_at_period_end,
    band: bandOrder ? bandSummary(bandOrder) : null,
    testflight: {
      mode: testflightInvitesConfigured() ? "invite" : publicUrl ? "link" : "manual",
      state: member.testflight_state,
      publicUrl,
    },
    price,
    offers,
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

// The welcome page's two switches:
//   annual  monthly → yearly, same plan. During the Band's free days nothing is
//           charged now; the yearly price starts when they end. Otherwise the
//           year starts today, less what's left of the month already paid.
//   pro     Base → Pro, same billing period. Starts today: the Band's free Base
//           days end, and a paid Base period is credited for what's left of it.
// A change that needs a payment only happens if that payment goes through
// (payment_behavior: pending_if_incomplete).
export const changePlan = createServerFn({ method: "POST" })
  .inputValidator((input: { sessionId?: unknown; to?: unknown }) => ({
    ...sessionInput(input),
    to: (input?.to === "pro" ? "pro" : "annual") as "annual" | "pro",
  }))
  .handler(async ({ data }): Promise<WelcomeData> => {
    const sync = await import("./sync.server");
    const { stripe } = await import("./stripe.server");
    const member = (await sync.syncCheckoutSession(data.sessionId))?.member;
    const target = member ? switchTarget(member, data.to) : null;
    if (!member?.stripe_subscription_id || !target) {
      throw new Error("This membership can't be changed here. Use Manage billing instead.");
    }
    const price = (await sync.loadPrices()).plans.get(target);
    if (!price) throw new Error("That plan isn't set up yet.");
    const sub = await stripe<{ items: { data: { id: string }[] }; trial_end: number | null }>(
      "GET",
      `/subscriptions/${member.stripe_subscription_id}`,
    );
    const item = sub.items.data[0];
    if (!item) throw new Error("Subscription has no items.");
    const items = [{ id: item.id, price: price.id }];
    const trialing = member.status === "trialing";
    const body =
      data.to === "annual" && trialing
        ? { items, proration_behavior: "none", trial_end: sub.trial_end ?? undefined }
        : trialing
          ? {
              items,
              proration_behavior: "none",
              trial_end: "now",
              payment_behavior: "pending_if_incomplete",
            }
          : {
              items,
              proration_behavior: "always_invoice",
              payment_behavior: "pending_if_incomplete",
            };
    await stripe("POST", `/subscriptions/${member.stripe_subscription_id}`, body);
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
    const { store } = await import("./store.server");
    await store().recordClick(data.code);
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
    const { store, DuplicateError } = await import("./store.server");
    const { AFFILIATE_PERCENT } = await import("./plans");
    try {
      await store().insertAffiliate({
        code: data.code,
        name: data.name,
        email: data.email,
        audience: data.audience || null,
        payout_email: data.payoutEmail,
        percent: AFFILIATE_PERCENT,
      });
    } catch (error) {
      if (error instanceof DuplicateError) {
        return { ok: false, message: "That code is taken. Try another." };
      }
      console.error("[membership] apply", error);
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
    const { store } = await import("./store.server");
    const { safeEqual } = await import("./keys.server");
    const affiliate = await store().getAffiliate(data.code);
    if (!affiliate || !safeEqual(affiliate.dashboard_key, data.key)) return null;

    const [members, rows] = await Promise.all([
      store().membersByRef(data.code),
      store().listCommissions(data.code),
    ]);
    const sum = (status: string) =>
      rows.filter((r) => r.status === status).reduce((t, r) => t + r.commission_cents, 0);
    const statuses = members.map((m) => m.status);
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
  tier: PaidTier;
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

export type AdminBandOrder = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  withAi: boolean;
  amountCents: number;
  currency: string;
  // One line per row of the address label.
  shipTo: string[];
  status: string;
  shippedAt: string | null;
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
    // Paid and not yet shipped.
    bandsToShip: number;
    bandCents: number;
  };
  members: AdminMember[];
  bandOrders: AdminBandOrder[];
  affiliates: AdminAffiliate[];
};

const EMPTY_STATS: AdminOverview["stats"] = {
  trialing: 0,
  paying: 0,
  lifetime: 0,
  comp: 0,
  ended: 0,
  mrrCents: 0,
  trialMrrCents: 0,
  lifetimeCents: 0,
  owedCents: 0,
  bandsToShip: 0,
  bandCents: 0,
};

export const getAdminOverview = createServerFn({ method: "POST" })
  .inputValidator(adminInput(() => ({})))
  .handler(async ({ data }): Promise<AdminOverview> => {
    await requireAdmin(data.key);
    const sync = await import("./sync.server");
    const tf = await import("./testflight.server");
    const { envVar } = await import("./db.server");
    const { store, StoreNotReadyError } = await import("./store.server");

    const config = {
      stripe: sync.stripeConfigured(),
      webhook: Boolean(envVar("STRIPE_WEBHOOK_SECRET")),
      invites: tf.testflightInvitesConfigured(),
      publicLink: Boolean(tf.testflightPublicUrl()),
      membershipApi: (envVar("MEMBERSHIP_API_KEY") ?? "").length >= 16,
      database: true,
    };

    let loaded;
    try {
      loaded = await Promise.all([
        store().listMembers(5000),
        store().listAffiliates(),
        store().listCommissions(),
        store().listBandOrders(1000),
      ]);
    } catch (error) {
      if (!(error instanceof StoreNotReadyError)) throw error;
      return {
        config: { ...config, database: false },
        stats: EMPTY_STATS,
        members: [],
        bandOrders: [],
        affiliates: [],
      };
    }
    const [members, affiliateRows, commissions, bands] = loaded;

    let prices = new Map<string, number>();
    if (config.stripe) {
      try {
        const current = await sync.loadPrices();
        prices = new Map([...current.plans].map(([id, p]) => [id, p.unit_amount ?? 0]));
      } catch {
        /* stats fall back to zero revenue */
      }
    }
    // Today's list price for the member's tier and period. Members on an older
    // price pay what they signed up at, so this is an estimate.
    const monthlyValue = (m: { plan: string; tier: PaidTier }) =>
      m.plan === "monthly"
        ? (prices.get(planId(m.tier, "monthly")) ?? 0)
        : m.plan === "annual"
          ? Math.round((prices.get(planId(m.tier, "annual")) ?? 0) / 12)
          : 0;

    const stats = { ...EMPTY_STATS };
    for (const m of members) {
      if (m.status === "trialing") {
        stats.trialing++;
        if (!m.cancel_at_period_end) stats.trialMrrCents += monthlyValue(m);
      } else if (m.status === "active" || m.status === "past_due") {
        stats.paying++;
        if (!m.cancel_at_period_end) stats.mrrCents += monthlyValue(m);
      } else if (m.status === "lifetime") {
        // Old Founder plan; no longer sold, so its price isn't loaded.
        stats.lifetime++;
      } else if (m.status === "comp") stats.comp++;
      else stats.ended++;
    }
    for (const b of bands) {
      if (b.status === "paid") stats.bandsToShip++;
      if (b.status !== "refunded") stats.bandCents += b.amount_cents;
    }

    const affiliates: AdminAffiliate[] = affiliateRows.map((a) => {
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
        percent: a.percent,
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
        tier: m.tier,
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
      bandOrders: bands.map((b) => ({
        id: b.id,
        email: b.email,
        name: b.name,
        phone: b.phone,
        withAi: b.with_ai,
        amountCents: b.amount_cents,
        currency: b.currency,
        shipTo: [
          b.ship_name,
          b.ship_line1,
          b.ship_line2,
          [[b.ship_city, b.ship_state].filter(Boolean).join(", "), b.ship_postal_code]
            .filter(Boolean)
            .join(" "),
          b.ship_country,
        ].filter((line): line is string => Boolean(line)),
        status: b.status,
        shippedAt: b.shipped_at,
        createdAt: b.created_at,
      })),
      affiliates,
    };
  });

export const setAffiliateStatus = createServerFn({ method: "POST" })
  .inputValidator(
    adminInput((input) => ({
      id: String(input["id"] ?? ""),
      status: (input["status"] === "approved" ? "approved" : "rejected") as "approved" | "rejected",
    })),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.key);
    const { store } = await import("./store.server");
    await store().setAffiliateStatus(data.id, data.status);
    return { ok: true };
  });

export const markAffiliatePaid = createServerFn({ method: "POST" })
  .inputValidator(adminInput((input) => ({ code: cleanRef(input["code"]) ?? "" })))
  .handler(async ({ data }) => {
    await requireAdmin(data.key);
    const { store } = await import("./store.server");
    await store().markCommissionsPaid(data.code);
    return { ok: true };
  });

export const retryTestflight = createServerFn({ method: "POST" })
  .inputValidator(adminInput((input) => ({ id: String(input["id"] ?? "") })))
  .handler(async ({ data }) => {
    await requireAdmin(data.key);
    const sync = await import("./sync.server");
    const { store } = await import("./store.server");
    const row = await store().findMember("id", data.id);
    if (!row) throw new Error("No such member.");
    const member = await sync.syncTestflight(row, { force: true });
    return { state: member.testflight_state, error: member.testflight_error };
  });

export const listTestflightGroups = createServerFn({ method: "POST" })
  .inputValidator(adminInput(() => ({})))
  .handler(async ({ data }) => {
    await requireAdmin(data.key);
    const tf = await import("./testflight.server");
    const { envVar } = await import("./db.server");
    if (!envVar("ASC_KEY_ID") || !envVar("ASC_ISSUER_ID") || !envVar("ASC_PRIVATE_KEY")) {
      throw new Error("Add ASC_KEY_ID, ASC_ISSUER_ID and ASC_PRIVATE_KEY first.");
    }
    return tf.listBetaGroups();
  });

// Band orders: mark one shipped once it's in the post (or back to paid if that
// was a mistake). Refunds happen in Stripe and arrive through the webhook.
export const setBandOrderStatus = createServerFn({ method: "POST" })
  .inputValidator(
    adminInput((input) => ({
      id: String(input["id"] ?? ""),
      status: (input["status"] === "paid" ? "paid" : "shipped") as "paid" | "shipped",
    })),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.key);
    const { store } = await import("./store.server");
    await store().setBandOrderStatus(data.id, data.status);
    return { ok: true };
  });

// Free access for reviewers, friends and creators, at the tier picked
// ("base" when none is given). Shows up to the app like any paying member;
// App Review's login needs "pro".
//
//   grantAccess({ data: { key, email, name?, note?, tier?: "base" | "pro" } })
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
        tier: (isPaidTier(input["tier"]) ? input["tier"] : "base") as PaidTier,
      };
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin(data.key);
    const sync = await import("./sync.server");
    const { store } = await import("./store.server");
    const { testflightInvitesConfigured } = await import("./testflight.server");
    const row = await store().insertMember({
      email: data.email,
      name: data.name,
      note: data.note,
      plan: "comp",
      tier: data.tier,
      status: "comp",
      testflight_state: testflightInvitesConfigured() ? "pending" : "off",
    });
    const member = await sync.syncTestflight(row);
    return { state: member.testflight_state, error: member.testflight_error };
  });

export const endCompAccess = createServerFn({ method: "POST" })
  .inputValidator(adminInput((input) => ({ id: String(input["id"] ?? "") })))
  .handler(async ({ data }) => {
    await requireAdmin(data.key);
    const sync = await import("./sync.server");
    const { store } = await import("./store.server");
    const row = await store().findMember("id", data.id);
    if (!row || row.plan !== "comp") throw new Error("Only free access can be ended here.");
    const ended = await store().updateMember(row.id, {
      status: "canceled",
      canceled_at: new Date().toISOString(),
    });
    await sync.syncTestflight(ended);
    return { ok: true };
  });
