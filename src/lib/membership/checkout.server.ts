// The Stripe Checkout Session for a purchase, shared by both ways into it:
// /api/public/billing/checkout (Stripe's hosted page, for links and forms
// without JavaScript) and /api/public/billing/create-checkout-session
// (embedded, paid inside /checkout and /early-access). Both ask Stripe for the
// same things, so the webhook records either one the same way; only where the
// buyer lands afterwards differs.
//
//   { band: false, plan }   Base or Pro AI on its own. Paid from day one
//                           (NO_BAND_TRIAL_DAYS = 0).
//   { band: true, withAi }  The Band (one-time). With AI, BAND_TRIAL_DAYS of
//                           Base monthly, which the buyer starts later (the
//                           link in their order email): one payment for the
//                           Band with the card saved, and the subscription is
//                           made when the free days are started (startBandTrial
//                           in sync.server.ts). Without, "Band only": one
//                           payment, nothing saved.
//
// Band checkouts collect a US shipping address and a phone number. The partner
// code rides along in the metadata so the webhook can credit the partner;
// partners earn on subscriptions only, never on the Band (see plans.ts).
// Signed in on /account, the checkout is locked to that account's email, so
// what they buy unlocks the app account they're signed in to.

import { accountEmail } from "@/lib/account/account.server";
import { BAND_TRIAL_DAYS, NO_BAND_TRIAL_DAYS, formatMoney, type PlanId } from "./plans";
import { stripe } from "./stripe.server";
import { loadPrices } from "./sync.server";

export type CheckoutOrder = { band: true; withAi: boolean } | { band: false; plan: PlanId };

// url is set for the hosted page, client_secret for the embedded one.
export type CheckoutSession = { id: string; url: string | null; client_secret: string | null };

// Null when a price it needs isn't in Stripe yet (paid plans not open).
export async function createCheckoutSession(
  request: Request,
  order: CheckoutOrder,
  { ref, embedded }: { ref: string | null; embedded: boolean },
): Promise<CheckoutSession | null> {
  const origin = new URL(request.url).origin;
  const plan: PlanId = order.band ? "base_monthly" : order.plan;
  const withAi = !order.band || order.withAi;

  const [prices, email] = await Promise.all([loadPrices(), accountEmail(request)]);
  const planPrice = prices.plans.get(plan);
  if (order.band ? !prices.band || (withAi && !planPrice) : !planPrice) return null;

  const metadata = {
    ...(withAi ? { plan } : {}),
    // A Band's free days, started later (read by startBandTrial).
    ...(order.band
      ? { band: "1", ...(withAi ? { trial_days: String(BAND_TRIAL_DAYS) } : {}) }
      : {}),
    ...(ref ? { ref } : {}),
  };

  const welcome = `${origin}/early-access/welcome?session_id={CHECKOUT_SESSION_ID}`;
  const landing = embedded
    ? {
        // The pinned API version (stripe.server.ts) calls this "embedded".
        ui_mode: "embedded",
        // A Band order is confirmed first (/order-complete); a plan goes
        // straight to setting up the app, which waits for the payment.
        return_url: order.band
          ? `${origin}/order-complete?session_id={CHECKOUT_SESSION_ID}`
          : welcome,
      }
    : {
        success_url: welcome,
        cancel_url: order.band
          ? `${origin}/checkout?canceled=1`
          : `${origin}/early-access?canceled=1#plans`,
      };

  const common = {
    ...landing,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    client_reference_id: ref ?? undefined,
    ...(email ? { customer_email: email } : {}),
    metadata,
  };
  const afterSubmit = {
    message: "Next, we'll show you how to put OVOA on your iPhone. It takes about a minute.",
  };

  if (!order.band) {
    return stripe<CheckoutSession>("POST", "/checkout/sessions", {
      ...common,
      mode: "subscription",
      line_items: [{ price: planPrice!.id, quantity: 1 }],
      payment_method_collection: "always",
      custom_text: { after_submit: afterSubmit },
      subscription_data: {
        ...(NO_BAND_TRIAL_DAYS > 0 ? { trial_period_days: NO_BAND_TRIAL_DAYS } : {}),
        metadata,
      },
    });
  }

  const base = planPrice?.unit_amount
    ? `${formatMoney(planPrice.unit_amount, planPrice.currency)} a month`
    : "the monthly price";
  return stripe<CheckoutSession>("POST", "/checkout/sessions", {
    ...common,
    mode: "payment",
    line_items: [{ price: prices.band!.id, quantity: 1 }],
    shipping_address_collection: { allowed_countries: ["US"] },
    phone_number_collection: { enabled: true },
    customer_creation: "always",
    invoice_creation: { enabled: true },
    payment_intent_data: {
      metadata,
      // Keeps the card for Base, charged only once the free days are over.
      ...(withAi ? { setup_future_usage: "off_session" } : {}),
    },
    custom_text: {
      after_submit: afterSubmit,
      ...(withAi
        ? {
            submit: {
              message: `Today you pay for the Band. Your card is saved for OVOA Base: your ${BAND_TRIAL_DAYS} free days start when you choose, from the link we email you. Then ${base} until you cancel.`,
            },
          }
        : {}),
    },
  });
}
