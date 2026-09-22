import { createFileRoute } from "@tanstack/react-router";

// Stripe → members. Point a Stripe webhook at /api/public/billing/webhook with
// these events (scripts/stripe-setup.mjs does it for you):
//
//   checkout.session.completed, checkout.session.async_payment_succeeded,
//   customer.subscription.created, customer.subscription.updated,
//   customer.subscription.deleted, invoice.paid, charge.refunded
//
// Every handler is idempotent, so Stripe's retries and duplicate deliveries are
// harmless. A 500 makes Stripe retry for up to three days.

export const Route = createFileRoute("/api/public/billing/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("STRIPE_WEBHOOK_SECRET is not set", { status: 500 });

        const { verifyStripeSignature } = await import("@/lib/membership/stripe.server");
        const payload = await request.text();
        const valid = await verifyStripeSignature(
          payload,
          request.headers.get("stripe-signature"),
          secret,
        );
        if (!valid) return new Response("Bad signature", { status: 400 });

        const event = JSON.parse(payload) as { id: string; type: string; data: { object: never } };
        const object = event.data.object as { id: string; [key: string]: unknown };
        const sync = await import("@/lib/membership/sync.server");

        try {
          switch (event.type) {
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
              await sync.syncCheckoutSession(object.id);
              break;
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted":
              await sync.syncSubscription(object.id);
              break;
            case "invoice.paid":
              await sync.handleInvoicePaid(event.data.object);
              break;
            case "charge.refunded":
              await sync.handleChargeRefunded(event.data.object);
              break;
            default:
              break;
          }
        } catch (error) {
          console.error("[membership] webhook", event.type, event.id, error);
          return new Response("Handler failed", { status: 500 });
        }
        return Response.json({ received: true });
      },
    },
  },
});
