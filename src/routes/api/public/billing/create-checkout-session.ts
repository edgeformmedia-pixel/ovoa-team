import { createFileRoute } from "@tanstack/react-router";

// Starts an embedded Stripe Checkout for the Band, paid inside /checkout with
// no redirect. POST JSON { ai?: boolean, ref?: string }, returns
// { clientSecret, publishableKey }.
//
//   ai: true (default)  The Band plus Base AI monthly after BAND_TRIAL_DAYS.
//   ai: false           "Band only, no AI": payment mode, no subscription.
//
// The Band price is found by its lookup key (loadPrices), so test and live
// keys each pick up their own price with no code change. Stripe finishes on
// /order-complete, and the webhook records the order exactly as it does for
// the hosted checkout (same metadata).

type Body = { ai?: unknown; ref?: unknown };

async function createSession(request: Request): Promise<Response> {
  const { BAND_TRIAL_DAYS, REF_COOKIE, cleanRef } = await import("@/lib/membership/plans");
  const { loadPrices } = await import("@/lib/membership/sync.server");
  const { stripe, stripeConfigured } = await import("@/lib/membership/stripe.server");
  const { envVar } = await import("@/lib/membership/db.server");

  const publishableKey = envVar("STRIPE_PUBLISHABLE_KEY");
  if (!stripeConfigured() || !publishableKey)
    return Response.json({ error: "not-configured" }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as Body;
  const withAi = body.ai !== false;
  const cookieRef = new RegExp(`(?:^|;\s*)${REF_COOKIE}=([^;]+)`).exec(
    request.headers.get("cookie") ?? "",
  )?.[1];
  const ref = cleanRef(body.ref) ?? cleanRef(cookieRef ? decodeURIComponent(cookieRef) : null);
  const origin = new URL(request.url).origin;

  try {
    const prices = await loadPrices();
    const planPrice = prices.plans.get("base_monthly");
    if (!prices.band || (withAi && !planPrice))
      return Response.json({ error: "not-configured" }, { status: 503 });

    const metadata = {
      ...(withAi ? { plan: "base_monthly" } : {}),
      band: "1",
      ...(ref ? { ref } : {}),
    };
    const common = {
      // The pinned API version (stripe.server.ts) calls this "embedded".
      ui_mode: "embedded",
      return_url: `${origin}/order-complete?session_id={CHECKOUT_SESSION_ID}`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: ref ?? undefined,
      metadata,
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: true },
    };

    const session = withAi
      ? await stripe<{ client_secret: string }>("POST", "/checkout/sessions", {
          ...common,
          mode: "subscription",
          line_items: [
            { price: prices.band.id, quantity: 1 },
            { price: planPrice!.id, quantity: 1 },
          ],
          payment_method_collection: "always",
          subscription_data: {
            ...(BAND_TRIAL_DAYS > 0 ? { trial_period_days: BAND_TRIAL_DAYS } : {}),
            metadata,
          },
        })
      : await stripe<{ client_secret: string }>("POST", "/checkout/sessions", {
          ...common,
          mode: "payment",
          line_items: [{ price: prices.band.id, quantity: 1 }],
          customer_creation: "always",
          invoice_creation: { enabled: true },
          payment_intent_data: { metadata },
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
