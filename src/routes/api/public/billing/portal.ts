import { createFileRoute } from "@tanstack/react-router";

// "Manage billing" on the welcome page: opens Stripe's customer portal (change
// card, switch plan, cancel, download invoices) for the buyer of this checkout.
// The checkout session id in the welcome link is what proves who they are.

export const Route = createFileRoute("/api/public/billing/portal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { CHECKOUT_SESSION_PATTERN } = await import("@/lib/membership/plans");
        const { stripe } = await import("@/lib/membership/stripe.server");

        const origin = new URL(request.url).origin;
        const sessionId = new URLSearchParams(await request.text()).get("session_id") ?? "";
        if (!CHECKOUT_SESSION_PATTERN.test(sessionId)) {
          return new Response("That link isn't valid.", { status: 400 });
        }
        const welcome = `${origin}/early-access/welcome?session_id=${sessionId}`;

        try {
          const session = await stripe<{ customer: string | null; status: string }>(
            "GET",
            `/checkout/sessions/${sessionId}`,
          );
          if (!session.customer || session.status !== "complete")
            return Response.redirect(welcome, 303);

          // Uses the portal settings scripts/stripe-setup.mjs created, or the
          // dashboard default if you saved one there.
          const configs = await stripe<{ data: { id: string; is_default: boolean }[] }>(
            "GET",
            "/billing_portal/configurations",
            { active: true, limit: 10 },
          );
          const config = configs.data.find((c) => c.is_default) ?? configs.data[0];

          const portal = await stripe<{ url: string }>("POST", "/billing_portal/sessions", {
            customer: session.customer,
            return_url: welcome,
            configuration: config?.id,
          });
          return Response.redirect(portal.url, 303);
        } catch (error) {
          console.error("[membership] portal", error);
          return Response.redirect(`${welcome}&error=portal`, 303);
        }
      },
    },
  },
});
