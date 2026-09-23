import { createFileRoute } from "@tanstack/react-router";

// Starts a Stripe Checkout and sends the browser there. GET (links in emails,
// bios, the app) and POST (forms) take the same fields:
//
//   ?plan=base_monthly|base_annual|pro_monthly|pro_annual
//       Base or Pro AI on its own. Paid from day one (NO_BAND_TRIAL_DAYS = 0).
//   ?band=1
//       The Band (one-time) plus Base AI monthly, which starts after
//       BAND_TRIAL_DAYS free days. Subscription mode; the Band is charged now.
//   ?band=1&ai=0
//       "Band only, no AI": payment mode, no subscription.
//
// Band checkouts collect a US shipping address and a phone number.
//
// The partner code comes from the ovoa_ref cookie (or ?ref=), and rides along
// in the session's metadata so the webhook can credit the partner. Partners
// earn on subscriptions only, never on the Band (see plans.ts).

// Plan names from before tiers, so old links still land somewhere sensible.
const OLD_PLAN_NAMES: Record<string, string> = {
  monthly: "base_monthly",
  annual: "base_annual",
  lifetime: "base_annual",
};

async function startCheckout(request: Request): Promise<Response> {
  const { BAND_TRIAL_DAYS, NO_BAND_TRIAL_DAYS, REF_COOKIE, cleanRef, isPlanId } =
    await import("@/lib/membership/plans");
  const { loadPrices } = await import("@/lib/membership/sync.server");
  const { stripe, stripeConfigured } = await import("@/lib/membership/stripe.server");

  const url = new URL(request.url);
  const origin = url.origin;

  let fields: URLSearchParams = url.searchParams;
  if (request.method === "POST") {
    const text = await request.text();
    fields = new URLSearchParams(text);
  }
  const band = fields.get("band") === "1";
  const withAi = !band || fields.get("ai") !== "0";
  const askedPlan = fields.get("plan") ?? "";
  const plan = band
    ? "base_monthly"
    : isPlanId(askedPlan)
      ? askedPlan
      : isPlanId(OLD_PLAN_NAMES[askedPlan])
        ? (OLD_PLAN_NAMES[askedPlan] as "base_monthly" | "base_annual")
        : "base_annual";

  const back = (reason: string) =>
    Response.redirect(
      band ? `${origin}/checkout?error=${reason}` : `${origin}/early-access?error=${reason}#plans`,
      303,
    );

  const cookieRef = new RegExp(`(?:^|;\\s*)${REF_COOKIE}=([^;]+)`).exec(
    request.headers.get("cookie") ?? "",
  )?.[1];
  const ref =
    cleanRef(fields.get("ref")) ?? cleanRef(cookieRef ? decodeURIComponent(cookieRef) : null);

  if (!stripeConfigured()) return back("not-configured");

  try {
    const prices = await loadPrices();
    const planPrice = prices.plans.get(plan);
    if (band ? !prices.band || (withAi && !planPrice) : !planPrice) return back("not-configured");

    const metadata = {
      ...(withAi ? { plan } : {}),
      ...(band ? { band: "1" } : {}),
      ...(ref ? { ref } : {}),
    };
    const common = {
      success_url: `${origin}/early-access/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: band
        ? `${origin}/checkout?canceled=1`
        : `${origin}/early-access?canceled=1#plans`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: ref ?? undefined,
      metadata,
      custom_text: {
        after_submit: {
          message: "Next, we'll show you how to put OVOA on your iPhone. It takes about a minute.",
        },
      },
      ...(band
        ? {
            shipping_address_collection: { allowed_countries: ["US"] },
            phone_number_collection: { enabled: true },
          }
        : {}),
    };

    let session: { url: string };
    if (band && !withAi) {
      session = await stripe<{ url: string }>("POST", "/checkout/sessions", {
        ...common,
        mode: "payment",
        line_items: [{ price: prices.band!.id, quantity: 1 }],
        customer_creation: "always",
        invoice_creation: { enabled: true },
        payment_intent_data: { metadata },
      });
    } else {
      const trialDays = band ? BAND_TRIAL_DAYS : NO_BAND_TRIAL_DAYS;
      session = await stripe<{ url: string }>("POST", "/checkout/sessions", {
        ...common,
        mode: "subscription",
        line_items: [
          ...(band ? [{ price: prices.band!.id, quantity: 1 }] : []),
          { price: planPrice!.id, quantity: 1 },
        ],
        payment_method_collection: "always",
        subscription_data: {
          ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
          metadata,
        },
      });
    }

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
