import { createFileRoute } from "@tanstack/react-router";

// Starts an embedded Stripe Checkout for the Band, paid inside /checkout with
// no redirect. POST JSON { ai?: boolean, ref?: string }, returns
// { clientSecret, publishableKey }.
//
//   ai: true (default)  The Band plus BAND_TRIAL_DAYS of Base monthly, which
//                       the buyer starts later (the link in their order
//                       email). The card is saved for it.
//   ai: false           "Band only, no AI".
//
// Both are one payment for the Band, no subscription: with Base, the
// subscription is made when the free days are started (startBandTrial in
// sync.server.ts), so they don't run out while the Band is on its way.
//
// The Band price is found by its lookup key (loadPrices), so test and live
// keys each pick up their own price with no code change. Stripe finishes on
// /order-complete, and the webhook records the order exactly as it does for
// the hosted checkout (same metadata).

type Body = { ai?: unknown; ref?: unknown };

async function createSession(request: Request): Promise<Response> {
  const { BAND_TRIAL_DAYS, REF_COOKIE, cleanRef, formatMoney } =
    await import("@/lib/membership/plans");
  const { loadPrices } = await import("@/lib/membership/sync.server");
  const { stripe, stripeConfigured } = await import("@/lib/membership/stripe.server");
  const { envVar } = await import("@/lib/membership/db.server");

  const publishableKey = envVar("STRIPE_PUBLISHABLE_KEY");
  if (!stripeConfigured() || !publishableKey)
    return Response.json({ error: "not-configured" }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as Body;
  const withAi = body.ai !== false;
  const cookieRef = new RegExp(`(?:^|;\\s*)${REF_COOKIE}=([^;]+)`).exec(
    request.headers.get("cookie") ?? "",
  )?.[1];
  const ref = cleanRef(body.ref) ?? cleanRef(cookieRef ? decodeURIComponent(cookieRef) : null);
  const origin = new URL(request.url).origin;

  try {
    const prices = await loadPrices();
    const planPrice = prices.plans.get("base_monthly");
    if (!prices.band || (withAi && !planPrice))
      return Response.json({ error: "not-configured" }, { status: 503 });

    // With Base, the plan and free days to start later (read by startBandTrial).
    const metadata = {
      band: "1",
      ...(withAi ? { plan: "base_monthly", trial_days: String(BAND_TRIAL_DAYS) } : {}),
      ...(ref ? { ref } : {}),
    };
    const base = planPrice?.unit_amount
      ? `${formatMoney(planPrice.unit_amount, planPrice.currency)} a month`
      : "the monthly price";

    const session = await stripe<{ client_secret: string }>("POST", "/checkout/sessions", {
      // The pinned API version (stripe.server.ts) calls this "embedded".
      ui_mode: "embedded",
      mode: "payment",
      return_url: `${origin}/order-complete?session_id={CHECKOUT_SESSION_ID}`,
      line_items: [{ price: prices.band.id, quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: ref ?? undefined,
      metadata,
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: true },
      customer_creation: "always",
      invoice_creation: { enabled: true },
      payment_intent_data: {
        metadata,
        // Keeps the card for Base, charged only once the free days are over.
        ...(withAi ? { setup_future_usage: "off_session" } : {}),
      },
      ...(withAi
        ? {
            custom_text: {
              submit: {
                message: `Today you pay for the Band. Your card is saved for OVOA Base: your ${BAND_TRIAL_DAYS} free days start when you choose, from the link we email you. Then ${base} until you cancel.`,
              },
            },
          }
        : {}),
    });

    return Response.json({ clientSecret: session.client_secret, publishableKey });
  } catch (error) {
    console.error("[membership] embedded checkout", error);
    return Response.json({ error: "checkout" }, { status: 502 });
  }
}

export const Route = createFileRoute("/api/public/billing/create-checkout-session")({
  server: {
    handlers: {
      POST: ({ request }) => createSession(request),
    },
  },
});
