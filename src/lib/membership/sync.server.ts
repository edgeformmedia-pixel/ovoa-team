// Keeps the members table in step with Stripe, and TestFlight access in step
// with members. Everything here is idempotent: the webhook and the welcome page
// can both run it for the same purchase, in either order, as often as they
// like. Subscription state is always re-read from Stripe rather than trusted
// from an event payload, so events arriving out of order can't roll it back.

import {
  AFFILIATE_PERCENT,
  BAND_LOOKUP_KEY,
  COMMISSION_MONTHS,
  LEGACY_LOOKUP_KEYS,
  PLAN_IDS,
  PLAN_LOOKUP_KEYS,
  cleanRef,
  isEntitled,
  periodOfPlan,
  tierOf,
  tierOfPlan,
  type MemberPlan,
  type PaidTier,
  type PlanId,
  type PublicBand,
  type PublicPlan,
} from "./plans";
import { now } from "./db.server";
import { stripe, stripeConfigured } from "./stripe.server";
import {
  DuplicateError,
  store,
  type BandOrder,
  type Member,
  type MemberPatch,
} from "./store.server";
import { inviteTester, removeTester, testflightInvitesConfigured } from "./testflight.server";

export type { BandOrder, Member };

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

type StripeAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
};

type StripeShipping = { name: string | null; address: StripeAddress | null } | null;

type StripeInvoiceRef = { id: string; payment_intent?: string | { id: string } | null };

type StripeCheckoutSession = {
  id: string;
  mode: "payment" | "subscription" | "setup";
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  customer: string | { id: string } | null;
  customer_email: string | null;
  customer_details: { email: string | null; name: string | null; phone?: string | null } | null;
  subscription: string | StripeSubscription | null;
  payment_intent: string | { id: string } | null;
  invoice?: string | StripeInvoiceRef | null;
  amount_total: number | null;
  currency: string | null;
  metadata: Record<string, string> | null;
  client_reference_id: string | null;
  // 2024-06-20 puts shipping here; newer API versions under collected_information.
  shipping_details?: StripeShipping;
  collected_information?: { shipping_details?: StripeShipping } | null;
  line_items?: { data: { price: StripePrice | null; amount_total: number }[] };
};

type StripeCustomer = { id: string; email: string | null; name: string | null; deleted?: boolean };

const idOf = (value: string | { id: string } | null | undefined) =>
  typeof value === "string" ? value : (value?.id ?? null);

const iso = (seconds: number | null | undefined) =>
  seconds ? new Date(seconds * 1000).toISOString() : null;

// ---------- Prices ----------

export type Prices = { plans: Map<PlanId, StripePrice>; band: StripePrice | null };

let priceCache: { at: number; prices: Prices } | null = null;

export async function loadPrices(): Promise<Prices> {
  if (priceCache && Date.now() - priceCache.at < 5 * 60 * 1000) return priceCache.prices;
  const res = await stripe<{ data: StripePrice[] }>("GET", "/prices", {
    active: true,
    limit: 10,
    lookup_keys: [...PLAN_IDS.map((id) => PLAN_LOOKUP_KEYS[id]), BAND_LOOKUP_KEY],
  });
  const prices: Prices = { plans: new Map(), band: null };
  for (const price of res.data) {
    if (price.lookup_key === BAND_LOOKUP_KEY) prices.band = price;
    const plan = PLAN_IDS.find((id) => PLAN_LOOKUP_KEYS[id] === price.lookup_key);
    if (plan) prices.plans.set(plan, price);
  }
  priceCache = { at: Date.now(), prices };
  return prices;
}

export async function publicPlans(): Promise<{ plans: PublicPlan[]; band: PublicBand | null }> {
  const prices = await loadPrices();
  const plans = PLAN_IDS.flatMap((id): PublicPlan[] => {
    const p = prices.plans.get(id);
    if (!p || p.unit_amount == null) return [];
    return [
      {
        id,
        tier: tierOfPlan(id),
        period: periodOfPlan(id),
        amountCents: p.unit_amount,
        currency: p.currency,
        interval: p.recurring?.interval === "year" ? "year" : "month",
      },
    ];
  });
  const band =
    prices.band?.unit_amount != null
      ? { amountCents: prices.band.unit_amount, currency: prices.band.currency }
      : null;
  return { plans, band };
}

// The member row's billing period and tier, from the subscription's price.
// Old ovoa_member_* prices and prices made by hand count as Base.
function billingOf(price: StripePrice | undefined): { plan: MemberPlan; tier: PaidTier } {
  const tier = tierOf(price?.lookup_key) ?? "base";
  if (price?.lookup_key === LEGACY_LOOKUP_KEYS.lifetime) return { plan: "lifetime", tier };
  return { plan: price?.recurring?.interval === "year" ? "annual" : "monthly", tier };
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
  // The AI plan is the recurring item. (A Band bought in the same checkout is
  // billed once on the first invoice and never becomes a subscription item.)
  const item = sub.items.data.find((i) => i.price?.recurring) ?? sub.items.data[0];
  const customerId = idOf(sub.customer);
  const billing: MemberPatch = {
    ...billingOf(item?.price),
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

export type CheckoutResult = { member: Member | null; bandOrder: BandOrder | null };

const isBandCheckout = (session: StripeCheckoutSession) =>
  session.metadata?.["band"] === "1" ||
  Boolean(session.line_items?.data.some((li) => li.price?.lookup_key === BAND_LOOKUP_KEY));

// Writes down a paid Band so the admin page shows it to ship. Safe to repeat.
async function recordBand(
  session: StripeCheckoutSession,
  email: string,
  ref: string | null,
): Promise<BandOrder> {
  const shipping = session.shipping_details ?? session.collected_information?.shipping_details;
  const address = shipping?.address;
  const invoice = typeof session.invoice === "object" ? session.invoice : null;
  const invoiceId = idOf(session.invoice ?? null);
  const bandLine = session.line_items?.data.find((li) => li.price?.lookup_key === BAND_LOOKUP_KEY);
  const paymentIntentId =
    idOf(session.payment_intent) ??
    idOf(invoice?.payment_intent) ??
    (invoiceId
      ? idOf((await stripe<StripeInvoiceRef>("GET", `/invoices/${invoiceId}`)).payment_intent)
      : null);

  return store().recordBandOrder({
    email,
    name: shipping?.name ?? session.customer_details?.name ?? null,
    phone: session.customer_details?.phone ?? null,
    checkout_session_id: session.id,
    stripe_customer_id: idOf(session.customer),
    stripe_payment_intent_id: paymentIntentId,
    stripe_invoice_id: invoiceId,
    amount_cents:
      bandLine?.amount_total ?? (session.mode === "payment" ? (session.amount_total ?? 0) : 0),
    currency: session.currency ?? "usd",
    with_ai: session.mode === "subscription",
    ship_name: shipping?.name ?? null,
    ship_line1: address?.line1 ?? null,
    ship_line2: address?.line2 ?? null,
    ship_city: address?.city ?? null,
    ship_state: address?.state ?? null,
    ship_postal_code: address?.postal_code ?? null,
    ship_country: address?.country ?? null,
    ref_code: ref,
  });
}

// Everything a finished checkout implies: the AI membership (if any) and the
// Band order (if any). Returns null while the checkout is still open (the
// buyer hit back, or the payment is still processing).
export async function syncCheckoutSession(sessionId: string): Promise<CheckoutResult | null> {
  const session = await stripe<StripeCheckoutSession>("GET", `/checkout/sessions/${sessionId}`, {
    expand: ["subscription", "invoice", "line_items"],
  });
  if (session.status !== "complete") return null;

  const email = (
    session.customer_details?.email ??
    session.customer_email ??
    "unknown@ovoa.ai"
  ).toLowerCase();
  const name = session.customer_details?.name ?? null;
  const ref = cleanRef(session.metadata?.["ref"] ?? session.client_reference_id);
  const paid = session.payment_status === "paid";
  const band = isBandCheckout(session);

  // The Band is charged at checkout, even when the AI part starts with free days.
  const bandOrder = band && paid ? await recordBand(session, email, ref) : null;

  if (session.mode === "subscription" && session.subscription) {
    const member = await syncSubscription(session.subscription, {
      email,
      name,
      ref,
      checkoutSessionId: session.id,
    });
    return { member, bandOrder };
  }

  if (session.mode !== "payment") return null;
  // "Band only, no AI": no membership, and no commission (hardware earns none).
  if (band) return paid ? { member: null, bandOrder } : null;

  // An old Founder (lifetime) checkout. No longer sold; kept so old sessions
  // still resolve. It counts as Base with no end date.
  const paymentIntentId = idOf(session.payment_intent);
  const existing = await store().findMember("checkout_session_id", session.id);
  // A refund recorded earlier stays recorded.
  const status = existing?.status === "refunded" ? "refunded" : paid ? "lifetime" : "incomplete";

  const member = await insertOrUpdate(
    "checkout_session_id",
    session.id,
    {
      email,
      name,
      plan: "lifetime",
      tier: "base",
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
  return { member: await syncTestflight(member), bandOrder: null };
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
      // Someone with another live membership on the same email keeps their access.
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

type StripeInvoiceLine = {
  amount: number;
  price?: { id: string; lookup_key?: string | null } | null;
  pricing?: { price_details?: { price?: string | null } | null } | null;
};

type StripeInvoice = {
  id: string;
  customer: string | { id: string } | null;
  amount_paid: number;
  currency: string;
  subscription?: string | { id: string } | null;
  payment_intent?: string | { id: string } | null;
  parent?: { subscription_details?: { subscription?: string | null } | null } | null;
  lines?: { data: StripeInvoiceLine[] };
};

// The Band earns no commission, so its amount comes off the invoice total.
async function bandCentsOn(invoice: StripeInvoice): Promise<number> {
  let bandPriceId: string | null = null;
  let cents = 0;
  for (const line of invoice.lines?.data ?? []) {
    let band = line.price?.lookup_key === BAND_LOOKUP_KEY;
    const priceId = line.price?.id ?? line.pricing?.price_details?.price ?? null;
    if (!band && priceId) {
      bandPriceId ??= (await loadPrices()).band?.id ?? "";
      band = priceId === bandPriceId;
    }
    if (band) cents += line.amount;
  }
  return cents;
}

export async function handleInvoicePaid(invoice: StripeInvoice) {
  const subscriptionId =
    idOf(invoice.subscription) ?? invoice.parent?.subscription_details?.subscription ?? null;
  if (!subscriptionId) return;
  // Also makes sure the member exists if this event beat the checkout one.
  const member = await syncSubscription(subscriptionId);
  await recordCommission(member, {
    sourceId: invoice.id,
    paymentIntentId: idOf(invoice.payment_intent),
    amountCents: Math.max(0, invoice.amount_paid - (await bandCentsOn(invoice))),
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

  if (!charge.refunded) return;

  // A fully refunded Band: don't ship it (or expect it back). Any AI
  // subscription bought with it carries on until it's cancelled in Stripe.
  for (const order of await store().bandOrdersByPayment(paymentIntentId, invoiceId)) {
    if (order.status !== "refunded") await store().setBandOrderStatus(order.id, "refunded");
  }

  // A fully refunded old lifetime purchase ends that membership. (Subscriptions
  // end through customer.subscription.deleted when you cancel them.)
  if (paymentIntentId) {
    for (const row of await store().lifetimeByPaymentIntent(paymentIntentId)) {
      await syncTestflight(await store().updateMember(row.id, { status: "refunded" }));
    }
  }
}

export { stripeConfigured };
