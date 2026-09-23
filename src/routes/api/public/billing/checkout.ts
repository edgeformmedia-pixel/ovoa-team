import { createFileRoute } from "@tanstack/react-router";

// Starts a Stripe Checkout on Stripe's hosted page and sends the browser there.
// The pages pay embedded instead (create-checkout-session.ts); this is for
// links (emails, bios, the app) and forms sent before the page's JavaScript
// runs. GET and POST take the same fields:
//
//   ?plan=base_monthly|base_annual|pro_monthly|pro_annual
//       Base or Pro AI on its own.
//   ?band=1
//       The Band plus BAND_TRIAL_DAYS of Base AI, started later.
//   ?band=1&ai=0
//       "Band only, no AI".
//
// What each one buys is in checkout.server.ts. The partner code comes from the
// ovoa_ref cookie (or ?ref=).

// Plan names from before tiers, so old links still land somewhere sensible.
const OLD_PLAN_NAMES: Record<string, string> = {
  monthly: "base_monthly",
  annual: "base_annual",
  lifetime: "base_annual",
};

async function startCheckout(request: Request): Promise<Response> {
  const { REF_COOKIE, cleanRef, isPlanId } = await import("@/lib/membership/plans");
  const { createCheckoutSession } = await import("@/lib/membership/checkout.server");
  const { stripeConfigured } = await import("@/lib/membership/stripe.server");

  const url = new URL(request.url);
  const origin = url.origin;

  let fields: URLSearchParams = url.searchParams;
  if (request.method === "POST") {
    const text = await request.text();
    fields = new URLSearchParams(text);
  }
  const band = fields.get("band") === "1";
  const askedPlan = fields.get("plan") ?? "";
  const plan = isPlanId(askedPlan)
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
    const session = await createCheckoutSession(
      request,
      band ? { band: true, withAi: fields.get("ai") !== "0" } : { band: false, plan },
      { ref, embedded: false },
    );
    if (!session?.url) return back("not-configured");
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
