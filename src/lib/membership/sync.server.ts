// Keeps the members table in step with Stripe, and TestFlight access in step
// with members. Everything here is idempotent: the webhook and the welcome page
// can both run it for the same purchase, in either order, as often as they
// like. Subscription state is always re-read from Stripe rather than trusted
// from an event payload, so events arriving out of order can't roll it back.

import {
  AFFILIATE_PERCENT,
  BAND_COMMISSION_PERCENT,
  BAND_LOOKUP_KEY,
  BAND_TRIAL_DAYS,
  COMMISSION_MONTHS,
  LEGACY_LOOKUP_KEYS,
  PLAN_IDS,
  PLAN_LOOKUP_KEYS,
  cleanRef,
  formatMoney,
  isEntitled,
  isPlanId,
  periodOfPlan,
  tierOf,
  tierOfPlan,
  type MemberPlan,
  type PaidTier,
  type PlanId,
  type PublicBand,
  type PublicPlan,
} from "./plans";
import { PLAN_NAMES } from "./copy";
import { now } from "./db.server";
import { bandShippedEmail, sendEmail, trialWaitingEmail, type TrialOffer } from "./email.server";
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

type StripePaymentMethod = { id: string; card?: { brand: string; last4: string } | null };

type StripePaymentIntent = { id: string; payment_method: string | StripePaymentMethod | null };

type StripeCheckoutSession = {
  id: string;
  mode: "payment" | "subscription" | "setup";
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  customer: string | { id: string } | null;
  customer_email: string | null;
  customer_details: { email: string | null; name: string | null; phone?: string | null } | null;
  subscription: string | StripeSubscription | null;
  payment_intent: string | StripePaymentIntent | null;
  invoice?: string | StripeInvoiceRef | null;
  // Where the buyer went after paying: hosted Checkout, then embedded.
  success_url?: string | null;
  return_url?: string | null;
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
  // Free days started from a Band order carry that order's checkout, so the
  // webhook's copy of this row is tied to it too.
  const checkoutSessionId = hints.checkoutSessionId ?? sub.metadata?.["checkout_session"] ?? null;

  const member = await insertOrUpdate(
    "stripe_subscription_id",
    sub.id,
    {
      ...billing,
      email: (email ?? "unknown@ovoa.ai").toLowerCase(),
      name,
      stripe_subscription_id: sub.id,
      checkout_session_id: checkoutSessionId,
      ref_code: cleanRef(hints.ref ?? sub.metadata?.["ref"]),
      testflight_state: testflightInvitesConfigured() ? "pending" : "off",
    },
    {
      ...billing,
      ...(checkoutSessionId ? { checkout_session_id: checkoutSessionId } : {}),
    },
  );
  return syncTestflight(member);
}

// Free days that came with a Band and haven't been started yet. `card` is the
// saved card Base will be charged to when they end. `noCard`: a Band bought on
// its own, so no card was saved and the free days end on their own.
export type WaitingTrial = {
  plan: PlanId;
  days: number;
  card: { brand: string; last4: string } | null;
  noCard: boolean;
};

export type CheckoutResult = {
  member: Member | null;
  bandOrder: BandOrder | null;
  waitingTrial: WaitingTrial | null;
};

const isBandCheckout = (session: StripeCheckoutSession) =>
  session.metadata?.["band"] === "1" ||
  Boolean(session.line_items?.data.some((li) => li.price?.lookup_key === BAND_LOOKUP_KEY));

// A Band bought with Base (since Sept 23): one payment for the Band, the card
// saved, and the plan and free days in the metadata for startBandTrial. Band
// checkouts from before then are subscription mode with the trial already
// running; "Band only" has no plan (see bandOnlyTrial).
function laterTrial(session: StripeCheckoutSession): { plan: PlanId; days: number } | null {
  const plan = session.metadata?.["plan"];
  if (session.mode !== "payment" || !isPlanId(plan)) return null;
  const days = Number(session.metadata?.["trial_days"]);
  return { plan, days: Number.isInteger(days) && days >= 0 ? days : BAND_TRIAL_DAYS };
}

// "Band only" comes with the same free days of Base, but no card was saved
// for it: started from the welcome page, they end on their own and nothing is
// ever charged. It isn't a Band bought with AI, so band_orders.with_ai stays
// false (recordBand reads laterTrial only).
function bandOnlyTrial(session: StripeCheckoutSession): { plan: PlanId; days: number } | null {
  if (session.mode !== "payment" || !isBandCheckout(session)) return null;
  // With no free days, Stripe would bill at once, with no card to bill.
  if (isPlanId(session.metadata?.["plan"]) || BAND_TRIAL_DAYS <= 0) return null;
  return { plan: "base_monthly", days: BAND_TRIAL_DAYS };
}

function savedCard(session: StripeCheckoutSession) {
  const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
  const method = typeof intent?.payment_method === "object" ? intent.payment_method : null;
  return {
    id: idOf(intent?.payment_method ?? null),
    card: method?.card ? { brand: method.card.brand, last4: method.card.last4 } : null,
  };
}

// The buyer's order page, on the site they bought from (a checkout session, or
// one straight from a webhook payload).
export function orderPageUrl(session: { id: string; success_url?: unknown; return_url?: unknown }) {
  const back = [session.success_url, session.return_url].find((u) => typeof u === "string");
  let origin = "https://ovoa.ai";
  try {
    if (back) origin = new URL(back as string).origin;
  } catch {
    /* not a URL: the main site */
  }
  return `${origin}/early-access/welcome?session_id=${session.id}`;
}

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
    with_ai: session.mode === "subscription" || laterTrial(session) !== null,
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

function retrieveCheckout(sessionId: string) {
  return stripe<StripeCheckoutSession>("GET", `/checkout/sessions/${sessionId}`, {
    expand: ["subscription", "invoice", "line_items", "payment_intent.payment_method"],
  });
}

// Everything a finished checkout implies: the AI membership (if any) and the
// Band order (if any). Returns null while the checkout is still open (the
// buyer hit back, or the payment is still processing).
export async function syncCheckoutSession(sessionId: string): Promise<CheckoutResult | null> {
  return syncCheckout(await retrieveCheckout(sessionId));
}

async function syncCheckout(session: StripeCheckoutSession): Promise<CheckoutResult | null> {
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
    if (bandOrder) await recordBandCommission(bandOrder, member.id);
    return { member, bandOrder, waitingTrial: null };
  }

  if (session.mode !== "payment") return null;
  // A Band, with Base to start later or on its own: no membership until the
  // free days are started (then it's the member row made for this checkout,
  // Band only included, so the welcome page can move it to another app email).
  if (band) {
    if (!bandOrder) return null;
    await recordBandCommission(bandOrder, null);
    const withBase = laterTrial(session);
    const trial = withBase ?? bandOnlyTrial(session);
    const member = await store().findMember("checkout_session_id", session.id);
    const waiting = trial && !member && bandOrder.status !== "refunded";
    return {
      member,
      bandOrder,
      waitingTrial: waiting
        ? { ...trial, card: withBase ? savedCard(session).card : null, noCard: !withBase }
        : null,
    };
  }

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
  return { member: await syncTestflight(member), bandOrder: null, waitingTrial: null };
}

// ---------- Starting a Band's free days ----------

// Something the buyer can fix or should hear as is.
export class TrialError extends Error {}

type StripeList<T> = { data: T[] };

// Starts the free days bought with a Band, when the buyer chooses (the button
// on their welcome page, which the order email links to). Makes the Base
// subscription on the card saved at checkout, with the free days as Stripe's
// trial, so the first charge is when they end. "Band only" has no card saved:
// its subscription has no payment method at all (the one that paid for the
// Band was never attached to the customer, and Stripe refuses one that isn't),
// so it cancels itself when the free days end. Safe to repeat, and once per
// Band order: a second call (a double click, a retry, a press after the days
// ended) finds the member row or the subscription the first one made.
export async function startBandTrial(sessionId: string): Promise<Member> {
  const session = await retrieveCheckout(sessionId);
  const result = await syncCheckout(session);
  if (result?.member) return result.member;
  const trial = result?.waitingTrial;
  if (!result?.bandOrder || !trial) {
    throw new TrialError(
      result?.bandOrder?.status === "refunded"
        ? "This Band order was refunded, so its free days can't be started."
        : "There are no free days waiting on this order.",
    );
  }
  const customerId = idOf(session.customer);
  const price = (await loadPrices()).plans.get(trial.plan);
  if (!customerId || !price) throw new Error(`Can't start ${trial.plan} for ${session.id}`);
  const ref = cleanRef(session.metadata?.["ref"] ?? session.client_reference_id);

  const made = await stripe<StripeList<StripeSubscription>>("GET", "/subscriptions", {
    customer: customerId,
    status: "all",
    limit: 100,
  });
  const sub =
    made.data.find((s) => s.metadata?.["checkout_session"] === session.id) ??
    (await stripe<StripeSubscription>(
      "POST",
      "/subscriptions",
      {
        customer: customerId,
        items: [{ price: price.id }],
        ...(trial.days > 0 ? { trial_period_days: trial.days } : {}),
        default_payment_method: trial.noCard ? undefined : (savedCard(session).id ?? undefined),
        // Without a card on file when the free days end, stop rather than
        // leave an unpaid invoice. That's always the case for Band only.
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
        metadata: {
          plan: trial.plan,
          band: "1",
          ...(trial.noCard ? { band_only: "1" } : {}),
          checkout_session: session.id,
          ...(ref ? { ref } : {}),
        },
      },
      { idempotencyKey: `band-trial-${session.id}` },
    ));

  return syncSubscription(sub, {
    email: result.bandOrder.email,
    name: session.customer_details?.name ?? null,
    ref,
    checkoutSessionId: session.id,
  });
}

// ---------- Emails to Band buyers ----------

const CARD_BRANDS: Record<string, string> = {
  amex: "American Express",
  diners: "Diners Club",
  discover: "Discover",
  jcb: "JCB",
  mastercard: "Mastercard",
  unionpay: "UnionPay",
  visa: "Visa",
};

// Waiting free days in words, for the emails and the welcome page. Band only's
// have no price: nothing is ever charged for them.
export async function trialOffer(trial: WaitingTrial): Promise<TrialOffer> {
  let price: string | null = null;
  if (!trial.noCard) {
    try {
      const p = (await loadPrices()).plans.get(trial.plan);
      if (p?.unit_amount) {
        const per = p.recurring?.interval === "year" ? "year" : "month";
        price = `${formatMoney(p.unit_amount, p.currency)} a ${per}`;
      }
    } catch (error) {
      console.error("[membership] trial price", error);
    }
  }
  return {
    days: trial.days,
    planName: PLAN_NAMES[tierOfPlan(trial.plan)],
    price,
    card: trial.card
      ? `${CARD_BRANDS[trial.card.brand] ?? "card"} ending in ${trial.card.last4}`
      : null,
    noCard: trial.noCard,
  };
}

export const firstNameOf = (order: BandOrder) =>
  (order.ship_name ?? order.name)?.trim().split(/\s+/)[0] || null;

export const shipPlaceOf = (order: BandOrder) =>
  [order.ship_city, order.ship_state].filter(Boolean).join(", ") || null;

// The order email for a Band, sent by the webhook once the Band is paid for:
// start the free days when it arrives. Band only gets it too, since its free
// days (no card) wait on the same page. The email links to that page, never to
// the start itself. Best effort, like every email here.
export async function emailWaitingTrial(result: CheckoutResult | null, url: string) {
  if (!result?.bandOrder || !result.waitingTrial) return false;
  const order = result.bandOrder;
  return sendEmail(
    trialWaitingEmail({
      to: order.email,
      firstName: firstNameOf(order),
      url,
      trial: await trialOffer(result.waitingTrial),
    }),
    `band-order/${order.checkout_session_id}`,
  );
}

// When a Band is marked shipped on the admin page. Repeats the free days'
// link if they're still waiting.
export async function emailBandShipped(order: BandOrder) {
  const session = await retrieveCheckout(order.checkout_session_id);
  const waiting = (await syncCheckout(session))?.waitingTrial;
  return sendEmail(
    bandShippedEmail({
      to: order.email,
      firstName: firstNameOf(order),
      url: orderPageUrl(session),
      shipTo: shipPlaceOf(order),
      trial: waiting ? await trialOffer(waiting) : null,
    }),
    `band-shipped/${order.id}`,
  );
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

// A partner can earn on this purchase: they're approved, and it isn't their own.
async function earningPartner(ref: string | null, buyerEmail: string) {
  if (!ref) return null;
  const affiliate = await store().getAffiliate(ref);
  if (!affiliate || affiliate.status !== "approved") return null;
  if (affiliate.email.toLowerCase() === buyerEmail.toLowerCase()) return null;
  return affiliate;
}

// BAND_COMMISSION_PERCENT of a Band sold through a partner's link. Voided with
// the rest if the Band's payment is refunded (matched by payment intent).
async function recordBandCommission(order: BandOrder, memberId: string | null) {
  if (order.amount_cents <= 0 || order.status === "refunded") return;
  const affiliate = await earningPartner(order.ref_code, order.email);
  if (!affiliate) return;
  await store().insertCommission({
    affiliate_code: affiliate.code,
    member_id: memberId,
    source_id: `band:${order.checkout_session_id}`,
    payment_intent_id: order.stripe_payment_intent_id,
    amount_cents: order.amount_cents,
    commission_cents: Math.round((order.amount_cents * BAND_COMMISSION_PERCENT) / 100),
    currency: order.currency,
  });
}

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

  const affiliate = await earningPartner(member.ref_code, member.email);
  if (!affiliate) return;

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

// The Band has its own commission, so its amount comes off the invoice total.
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
  // subscription bought with it carries on until it's cancelled in Stripe;
  // Band only's free days, if started, still end on their own. Free days not
  // started yet can't be started any more (syncCheckout).
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
