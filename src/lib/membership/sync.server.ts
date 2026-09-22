// Keeps the members table in step with Stripe, and TestFlight access in step
// with members. Everything here is idempotent: the webhook and the welcome page
// can both run it for the same purchase, in either order, as often as they
// like. Subscription state is always re-read from Stripe rather than trusted
// from an event payload, so events arriving out of order can't roll it back.

import {
  AFFILIATE_PERCENT,
  COMMISSION_MONTHS,
  PLAN_IDS,
  PLAN_LOOKUP_KEYS,
  cleanRef,
  isEntitled,
  type MemberPlan,
  type PlanId,
  type PublicPlan,
} from "./plans";
import { now } from "./db.server";
import { stripe, stripeConfigured } from "./stripe.server";
import { DuplicateError, store, type Member, type MemberPatch } from "./store.server";
import { inviteTester, removeTester, testflightInvitesConfigured } from "./testflight.server";

export type { Member };

// ---------- Stripe shapes (only the fields read here) ----------

type StripePrice = {
  id: string;
  lookup_key: string | null;
  unit_amount: number | null;
  currency: string;
  recurring: { interval: "day" | "week" | "month" | "year" } | null;
};

type StripeSubscription = {
  id: string;
  customer: string | { id: string };
  status: string;
  trial_end: number | null;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  current_period_end?: number;
  metadata: Record<string, string>;
  items: { data: { id: string; price: StripePrice; current_period_end?: number }[] };
};

type StripeCheckoutSession = {
  id: string;
  mode: "payment" | "subscription" | "setup";
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  customer: string | { id: string } | null;
  customer_email: string | null;
  customer_details: { email: string | null; name: string | null } | null;
  subscription: string | StripeSubscription | null;
  payment_intent: string | { id: string } | null;
  amount_total: number | null;
  currency: string | null;
  metadata: Record<string, string> | null;
  client_reference_id: string | null;
};

type StripeCustomer = { id: string; email: string | null; name: string | null; deleted?: boolean };

const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : (value?.id ?? null);

const iso = (seconds: number | null | undefined) =>
  seconds ? new Date(seconds * 1000).toISOString() : null;

// ---------- Prices ----------

let priceCache: { at: number; prices: Map<PlanId, StripePrice> } | null = null;

export async function loadPrices(): Promise<Map<PlanId, StripePrice>> {
  if (priceCache && Date.now() - priceCache.at < 5 * 60 * 1000) return priceCache.prices;
  const res = await stripe<{ data: StripePrice[] }>("GET", "/prices", {
    active: true,
    limit: 10,
    lookup_keys: PLAN_IDS.map((id) => PLAN_LOOKUP_KEYS[id]),
  });
  const prices = new Map<PlanId, StripePrice>();
  for (const price of res.data) {
    const plan = PLAN_IDS.find((id) => PLAN_LOOKUP_KEYS[id] === price.lookup_key);
    if (plan) prices.set(plan, price);
  }
  priceCache = { at: Date.now(), prices };
  return prices;
}

export async function publicPlans(): Promise<PublicPlan[]> {
  const prices = await loadPrices();
  return PLAN_IDS.flatMap((id) => {
    const p = prices.get(id);
    if (!p || p.unit_amount == null) return [];
    const interval = p.recurring?.interval;
    return [
      {
        id,
        amountCents: p.unit_amount,
        currency: p.currency,
        interval: interval === "month" || interval === "year" ? interval : null,
      },
    ];
  });
}

function planFromPrice(price: StripePrice | undefined): PlanId {
  const byKey = PLAN_IDS.find((id) => PLAN_LOOKUP_KEYS[id] === price?.lookup_key);
  if (byKey) return byKey;
  if (price?.recurring?.interval === "year") return "annual";
  if (price?.recurring) return "monthly";
  return "lifetime";
}

// ---------- Members ----------

async function insertOrUpdate(
  keyColumn: "stripe_subscription_id" | "checkout_session_id",
  key: string,
  insert: MemberPatch,
  update: MemberPatch,
): Promise<Member> {
  const existing = await store().findMember(keyColumn, key);
  if (existing) return store().updateMember(existing.id, update);
  try {
    return await store().insertMember(insert);
  } catch (error) {
    // The webhook and the welcome page raced to create the same row.
    if (error instanceof DuplicateError) return insertOrUpdate(keyColumn, key, insert, update);
    throw error;
  }
}

async function retrieveSubscription(id: string) {
  return stripe<StripeSubscription>("GET", `/subscriptions/${id}`);
}

// Re-reads the subscription from Stripe and writes it down.
export async function syncSubscription(
  subscriptionOrId: string | StripeSubscription,
  hints: {
    email?: string | null;
    name?: string | null;
    ref?: string | null;
    checkoutSessionId?: string;
  } = {},
): Promise<Member> {
  const sub =
    typeof subscriptionOrId === "string"
      ? await retrieveSubscription(subscriptionOrId)
      : subscriptionOrId;
  const item = sub.items.data[0];
  const customerId = idOf(sub.customer);
  const billing: MemberPatch = {
    plan: planFromPrice(item?.price),
    status: sub.status,
    stripe_customer_id: customerId,
    trial_ends_at: sub.status === "trialing" ? iso(sub.trial_end) : null,
    current_period_end: iso(sub.current_period_end ?? item?.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    canceled_at: iso(sub.canceled_at),
  };

  let email = hints.email ?? null;
  let name = hints.name ?? null;
  if (!email && customerId) {
    const customer = await stripe<StripeCustomer>("GET", `/customers/${customerId}`);
    email = customer.email;
    name = name ?? customer.name;
  }

  const member = await insertOrUpdate(
    "stripe_subscription_id",
    sub.id,
    {
      ...billing,
      email: (email ?? "unknown@ovoa.ai").toLowerCase(),
      name,
      stripe_subscription_id: sub.id,
      checkout_session_id: hints.checkoutSessionId ?? null,
      ref_code: cleanRef(hints.ref ?? sub.metadata?.["ref"]),
      testflight_state: testflightInvitesConfigured() ? "pending" : "off",
    },
    {
      ...billing,
      ...(hints.checkoutSessionId ? { checkout_session_id: hints.checkoutSessionId } : {}),
    },
  );
  return syncTestflight(member);
}

// Everything a finished checkout implies. Returns null while the checkout is
// still open (the buyer hit back, or the payment is still processing).
export async function syncCheckoutSession(sessionId: string): Promise<Member | null> {
  const session = await stripe<StripeCheckoutSession>("GET", `/checkout/sessions/${sessionId}`, {
    expand: ["subscription"],
  });
  if (session.status !== "complete") return null;

  const email = session.customer_details?.email ?? session.customer_email;
  const name = session.customer_details?.name ?? null;
  const ref = cleanRef(session.metadata?.["ref"] ?? session.client_reference_id);

  if (session.mode === "subscription" && session.subscription) {
    return syncSubscription(session.subscription, {
      email,
      name,
      ref,
      checkoutSessionId: session.id,
    });
  }

  if (session.mode !== "payment") return null;
  const paid = session.payment_status === "paid";
  const paymentIntentId = idOf(session.payment_intent);
  const existing = await store().findMember("checkout_session_id", session.id);
  // A refund recorded earlier stays recorded.
  const status = existing?.status === "refunded" ? "refunded" : paid ? "lifetime" : "incomplete";

  const member = await insertOrUpdate(
    "checkout_session_id",
    session.id,
    {
      email: (email ?? "unknown@ovoa.ai").toLowerCase(),
      name,
      plan: "lifetime",
      status,
      stripe_customer_id: idOf(session.customer),
      stripe_payment_intent_id: paymentIntentId,
      checkout_session_id: session.id,
      ref_code: ref,
      testflight_state: testflightInvitesConfigured() ? "pending" : "off",
    },
    { status, stripe_payment_intent_id: paymentIntentId },
  );

  if (paid && session.amount_total) {
    await recordCommission(member, {
      sourceId: session.id,
      paymentIntentId,
      amountCents: session.amount_total,
      currency: session.currency ?? "usd",
    });
  }
  return syncTestflight(member);
}

// ---------- TestFlight ----------

async function otherEntitledRow(member: Member): Promise<boolean> {
  const rows = await store().membersByEmail(member.email.toLowerCase());
  return rows.some((row) => row.id !== member.id && isEntitled(row.status));
}

export async function syncTestflight(member: Member, { force = false } = {}): Promise<Member> {
  if (!testflightInvitesConfigured()) {
    if (member.testflight_state === "pending")
      return patchTestflight(member, { testflight_state: "off" });
    return member;
  }

  const entitled = isEntitled(member.status);
  const invited = member.testflight_state === "invited";
  try {
    if (entitled && (!invited || force)) {
      const testerId = await inviteTester(member.email, member.name);
      return patchTestflight(member, {
        testflight_state: "invited",
        testflight_tester_id: testerId,
        testflight_error: null,
      });
    }
    if (!entitled && invited) {
      // Someone who switched from monthly to lifetime keeps their access.
      if (await otherEntitledRow(member))
        return patchTestflight(member, { testflight_state: "removed" });
      await removeTester(member.testflight_tester_id, member.email);
      return patchTestflight(member, { testflight_state: "removed", testflight_error: null });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[membership] TestFlight", member.email, message);
    return patchTestflight(member, {
      testflight_state: "failed",
      testflight_error: message.slice(0, 500),
    });
  }
  return member;
}

function patchTestflight(member: Member, patch: MemberPatch): Promise<Member> {
  return store().updateMember(member.id, { ...patch, testflight_updated_at: now() });
}

// ---------- Partner commissions ----------

async function recordCommission(
  member: Member,
  payment: {
    sourceId: string;
    paymentIntentId: string | null;
    amountCents: number;
    currency: string;
  },
) {
  if (!member.ref_code || payment.amountCents <= 0) return;
  const cutoff = new Date(member.created_at);
  cutoff.setMonth(cutoff.getMonth() + COMMISSION_MONTHS);
  if (Date.now() > cutoff.getTime()) return;

  const affiliate = await store().getAffiliate(member.ref_code);
  if (!affiliate || affiliate.status !== "approved") return;
  // No commission on your own purchase.
  if (affiliate.email.toLowerCase() === member.email.toLowerCase()) return;

  const percent = Number(affiliate.percent ?? AFFILIATE_PERCENT);
  await store().insertCommission({
    affiliate_code: affiliate.code,
    member_id: member.id,
    source_id: payment.sourceId,
    payment_intent_id: payment.paymentIntentId,
    amount_cents: payment.amountCents,
    commission_cents: Math.round((payment.amountCents * percent) / 100),
    currency: payment.currency,
  });
}

type StripeInvoice = {
  id: string;
  customer: string | { id: string } | null;
  amount_paid: number;
  currency: string;
  subscription?: string | { id: string } | null;
  payment_intent?: string | { id: string } | null;
  parent?: { subscription_details?: { subscription?: string | null } | null } | null;
};

export async function handleInvoicePaid(invoice: StripeInvoice) {
  const subscriptionId =
    idOf(invoice.subscription) ?? invoice.parent?.subscription_details?.subscription ?? null;
  if (!subscriptionId) return;
  // Also makes sure the member exists if this event beat the checkout one.
  const member = await syncSubscription(subscriptionId);
  await recordCommission(member, {
    sourceId: invoice.id,
    paymentIntentId: idOf(invoice.payment_intent),
    amountCents: invoice.amount_paid,
    currency: invoice.currency,
  });
}

type StripeCharge = {
  id: string;
  refunded: boolean;
  payment_intent: string | { id: string } | null;
  invoice?: string | { id: string } | null;
};

export async function handleChargeRefunded(charge: StripeCharge) {
  const paymentIntentId = idOf(charge.payment_intent);
  const invoiceId = idOf(charge.invoice);

  // Commissions on refunded money are void, unless already paid out.
  if (paymentIntentId || invoiceId) await store().voidCommissions(paymentIntentId, invoiceId);

  // A fully refunded lifetime purchase ends that membership. (Subscriptions end
  // through customer.subscription.deleted when you cancel them.)
  if (charge.refunded && paymentIntentId) {
    for (const row of await store().lifetimeByPaymentIntent(paymentIntentId)) {
      await syncTestflight(await store().updateMember(row.id, { status: "refunded" }));
    }
  }
}

export { stripeConfigured };
