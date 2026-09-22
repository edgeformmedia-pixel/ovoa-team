import { createFileRoute } from "@tanstack/react-router";

// Starts a Stripe Checkout for one plan and sends the browser there.
//
//   POST (the form on /early-access)  plan=monthly|annual|lifetime
//   GET  /api/public/billing/checkout?plan=annual  (for links in emails, bios, the app)
//
// The partner code comes from the ovoa_ref cookie (or ?ref=), and rides along
// in the session's metadata so the webhook can credit the partner.

async function startCheckout(request: Request): Promise<Response> {
  const { PLAN_IDS, REF_COOKIE, TRIAL_DAYS, cleanRef } = await import("@/lib/membership/plans");
  const { loadPrices } = await import("@/lib/membership/sync.server");
  const { stripe, stripeConfigured } = await import("@/lib/membership/stripe.server");

  const url = new URL(request.url);
  const origin = url.origin;
  const back = (reason: string) =>
    Response.redirect(`${origin}/early-access?error=${reason}#plans`, 303);

  let fields: URLSearchParams = url.searchParams;
  if (request.method === "POST") {
    const text = await request.text();
    fields = new URLSearchParams(text);
  }
  const plan = PLAN_IDS.find((id) => id === fields.get("plan")) ?? "annual";

  const cookieRef = new RegExp(`(?:^|;\\s*)${REF_COOKIE}=([^;]+)`).exec(
    request.headers.get("cookie") ?? "",
  )?.[1];
  const ref =
    cleanRef(fields.get("ref")) ?? cleanRef(cookieRef ? decodeURIComponent(cookieRef) : null);

  if (!stripeConfigured()) return back("not-configured");

  try {
    const price = (await loadPrices()).get(plan);
    if (!price) return back("not-configured");

    const common = {
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${origin}/early-access/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/early-access?canceled=1#plans`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: ref ?? undefined,
      metadata: { plan, ...(ref ? { ref } : {}) },
      custom_text: {
        after_submit: {
          message: "Next, we'll show you how to put OVOA on your iPhone. It takes about a minute.",
        },
      },
    };

    const session =
      plan === "lifetime"
        ? await stripe<{ url: string }>("POST", "/checkout/sessions", {
            ...common,
            mode: "payment",
            customer_creation: "always",
            invoice_creation: { enabled: true },
            payment_intent_data: { metadata: { plan, ...(ref ? { ref } : {}) } },
          })
        : await stripe<{ url: string }>("POST", "/checkout/sessions", {
            ...common,
            mode: "subscription",
            payment_method_collection: "always",
            subscription_data: {
              ...(TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : {}),
              metadata: { plan, ...(ref ? { ref } : {}) },
            },
          });

    return Response.redirect(session.url, 303);
  } catch (error) {
    console.error("[membership] checkout", error);
    return back("checkout");
  }
}

export const Route = createFileRoute("/api/public/billing/checkout")({
  server: {
    handlers: {
      GET: ({ request }) => startCheckout(request),
      POST: ({ request }) => startCheckout(request),
    },
  },
});
