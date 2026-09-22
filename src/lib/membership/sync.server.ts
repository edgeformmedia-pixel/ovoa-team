// Keeps public.members in step with Stripe, and TestFlight access in step with
// members. Everything here is idempotent: the webhook and the welcome page can
// both run it for the same purchase, in either order, as often as they like.
// Subscription state is always re-read from Stripe rather than trusted from
// an event payload, so events arriving out of order can't roll it back.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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
import { stripe, stripeConfigured } from "./stripe.server";
import { inviteTester, removeTester, testflightInvitesConfigured } from "./testflight.server";

// The generated Database type doesn't know these tables until Lovable
// regenerates it after the migration, so they're used untyped here.
export const db = () => supabaseAdmin as unknown as SupabaseClient;

export type Member = {
  id: string;
  email: string;
  name: string | null;
  plan: MemberPlan;
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
  conflictColumn: "stripe_subscription_id" | "checkout_session_id",
  key: string,
  insert: Partial<Member>,
  update: Partial<Member>,
): Promise<Member> {
  const table = db().from("members");
  const existing = await table.select("*").eq(conflictColumn, key).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) {
    const res = await db()
      .from("members")
      .update(update)
      .eq("id", (existing.data as Member).id)
      .select("*")
      .single();
    if (res.error) throw new Error(res.error.message);
    return res.data as Member;
  }
  const created = await db().from("members").insert(insert).select("*").single();
  if (!created.error) return created.data as Member;
  // The webhook and the welcome page raced to create the same row.
  if (created.error.code === "23505") return insertOrUpdate(conflictColumn, key, insert, update);
  throw new Error(created.error.message);
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
  const billing: Partial<Member> = {
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
  const existing = await db()
    .from("members")
    .select("status")
    .eq("checkout_session_id", session.id)
    .maybeSingle();
  // A refund recorded earlier stays recorded.
  const status =
    existing.data?.status === "refunded" ? "refunded" : paid ? "lifetime" : "incomplete";

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
  const { data } = await db()
    .from("members")
    .select("id, status")
    .eq("email", member.email.toLowerCase())
    .neq("id", member.id);
  return (data ?? []).some((row: { status: string }) => isEntitled(row.status));
}

export async function syncTestflight(member: Member, { force = false } = {}): Promise<Member> {
  if (!testflightInvitesConfigured()) {
    if (member.testflight_state === "pending")
      return patchMember(member, { testflight_state: "off" });
    return member;
  }

  const entitled = isEntitled(member.status);
  const invited = member.testflight_state === "invited";
  try {
    if (entitled && (!invited || force)) {
      const testerId = await inviteTester(member.email, member.name);
      return patchMember(member, {
        testflight_state: "invited",
        testflight_tester_id: testerId,
        testflight_error: null,
      });
    }
    if (!entitled && invited) {
      // Someone who switched from monthly to lifetime keeps their access.
      if (await otherEntitledRow(member))
        return patchMember(member, { testflight_state: "removed" });
      await removeTester(member.testflight_tester_id, member.email);
      return patchMember(member, { testflight_state: "removed", testflight_error: null });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[membership] TestFlight", member.email, message);
    return patchMember(member, {
      testflight_state: "failed",
      testflight_error: message.slice(0, 500),
    });
  }
  return member;
}

async function patchMember(member: Member, patch: Partial<Member>): Promise<Member> {
  const res = await db()
    .from("members")
    .update({ ...patch, testflight_updated_at: new Date().toISOString() })
    .eq("id", member.id)
    .select("*")
    .single();
  if (res.error) throw new Error(res.error.message);
  return res.data as Member;
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

  const { data: affiliate } = await db()
    .from("affiliates")
    .select("code, percent, status, email")
    .eq("code", member.ref_code)
    .maybeSingle();
  if (!affiliate || affiliate.status !== "approved") return;
  // No commission on your own purchase.
  if (String(affiliate.email).toLowerCase() === member.email.toLowerCase()) return;

  const percent = Number(affiliate.percent ?? AFFILIATE_PERCENT);
  const { error } = await db()
    .from("affiliate_commissions")
    .upsert(
      {
        affiliate_code: affiliate.code,
        member_id: member.id,
        source_id: payment.sourceId,
        payment_intent_id: payment.paymentIntentId,
        amount_cents: payment.amountCents,
        commission_cents: Math.round((payment.amountCents * percent) / 100),
        currency: payment.currency,
      },
      { onConflict: "source_id", ignoreDuplicates: true },
    );
  if (error) console.error("[membership] commission", payment.sourceId, error.message);
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
  const sources = [
    paymentIntentId && `payment_intent_id.eq.${paymentIntentId}`,
    invoiceId && `source_id.eq.${invoiceId}`,
  ]
    .filter(Boolean)
    .join(",");
  if (sources) {
    await db()
      .from("affiliate_commissions")
      .update({ status: "void" })
      .eq("status", "owed")
      .or(sources);
  }

  // A fully refunded lifetime purchase ends that membership. (Subscriptions end
  // through customer.subscription.deleted when you cancel them.)
  if (charge.refunded && paymentIntentId) {
    const { data } = await db()
      .from("members")
      .select("*")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .eq("plan", "lifetime");
    for (const row of (data ?? []) as Member[]) {
      const updated = await db()
        .from("members")
        .update({ status: "refunded" })
        .eq("id", row.id)
        .select("*")
        .single();
      if (updated.data) await syncTestflight(updated.data as Member);
    }
  }
}

export { stripeConfigured };
