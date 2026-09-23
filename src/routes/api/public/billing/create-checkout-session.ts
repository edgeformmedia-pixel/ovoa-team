import { createFileRoute } from "@tanstack/react-router";

// Starts an embedded Stripe Checkout, paid inside the page with no redirect.
// POST JSON, returns { clientSecret, publishableKey }:
//
//   { plan: "base_monthly" | ... }   Base or Pro, from /early-access. Stripe
//                                    finishes on /early-access/welcome.
//   { ai?: boolean }                 The Band, from /checkout: with Base's free
//                                    days (ai true, the default) or "Band only".
//                                    Stripe finishes on /order-complete.
//
// Also takes { ref }, else the ovoa_ref cookie. The session is the one the
// hosted checkout makes (checkout.server.ts), so the webhook records it the
// same way. Prices are found by lookup key, so test and live keys each pick
// up their own with no code change.

type Body = { plan?: unknown; ai?: unknown; ref?: unknown };

async function createSession(request: Request): Promise<Response> {
  const { REF_COOKIE, cleanRef, isPlanId } = await import("@/lib/membership/plans");
  const { createCheckoutSession } = await import("@/lib/membership/checkout.server");
  const { stripeConfigured } = await import("@/lib/membership/stripe.server");
  const { envVar } = await import("@/lib/membership/db.server");

  const publishableKey = envVar("STRIPE_PUBLISHABLE_KEY");
  if (!stripeConfigured() || !publishableKey)
    return Response.json({ error: "not-configured" }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as Body;
  if (body.plan !== undefined && !isPlanId(body.plan))
    return Response.json({ error: "bad-plan" }, { status: 400 });
  const cookieRef = new RegExp(`(?:^|;\\s*)${REF_COOKIE}=([^;]+)`).exec(
    request.headers.get("cookie") ?? "",
  )?.[1];
  const ref = cleanRef(body.ref) ?? cleanRef(cookieRef ? decodeURIComponent(cookieRef) : null);

  try {
    const session = await createCheckoutSession(
      request,
      isPlanId(body.plan)
        ? { band: false, plan: body.plan }
        : { band: true, withAi: body.ai !== false },
      { ref, embedded: true },
    );
    if (!session) return Response.json({ error: "not-configured" }, { status: 503 });
    if (!session.client_secret) throw new Error(`no client_secret on ${session.id}`);
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
