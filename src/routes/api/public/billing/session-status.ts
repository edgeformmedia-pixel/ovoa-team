import { createFileRoute } from "@tanstack/react-router";

// GET ?session_id=cs_... → { status, paymentStatus, email, withAi } for the
// /order-complete page. status is Stripe's: "open", "complete" or "expired".

export const Route = createFileRoute("/api/public/billing/session-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { CHECKOUT_SESSION_PATTERN } = await import("@/lib/membership/plans");
        const { stripe, stripeConfigured } = await import("@/lib/membership/stripe.server");

        const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
        if (!CHECKOUT_SESSION_PATTERN.test(sessionId))
          return Response.json({ error: "bad-session" }, { status: 400 });
        if (!stripeConfigured()) return Response.json({ error: "not-configured" }, { status: 503 });

        try {
          const session = await stripe<{
            status: string | null;
            payment_status: string;
            mode: string;
            customer_details?: { email?: string | null } | null;
            metadata?: Record<string, string> | null;
          }>("GET", `/checkout/sessions/${sessionId}`);
          return Response.json({
            status: session.status,
            paymentStatus: session.payment_status,
            email: session.customer_details?.email ?? null,
            // A Band bought with Base carries its plan (the free days start later).
            withAi: session.mode === "subscription" || Boolean(session.metadata?.["plan"]),
          });
        } catch (error) {
          console.error("[membership] session status", error);
          return Response.json({ error: "lookup" }, { status: 502 });
        }
      },
    },
  },
});
