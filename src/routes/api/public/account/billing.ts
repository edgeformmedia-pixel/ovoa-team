import { createFileRoute } from "@tanstack/react-router";

// "Manage billing" on /account: Stripe's customer portal for the plans paid
// with the signed-in account's own email. Plans someone else paid for and moved
// to this account (members.app_email) aren't theirs to cancel, so those stay
// with the payer's welcome link.

export const Route = createFileRoute("/api/public/account/billing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { lookupAccount, sameOrigin, sessionToken } =
          await import("@/lib/account/account.server");
        const { store } = await import("@/lib/membership/store.server");
        const { isEntitled } = await import("@/lib/membership/plans");
        const { stripe } = await import("@/lib/membership/stripe.server");

        const account = `${new URL(request.url).origin}/account`;
        if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
        const token = sessionToken(request);
        const found = token ? await lookupAccount(token) : null;
        if (found?.state !== "in") return Response.redirect(account, 303);

        try {
          const paid = (await store().membersByEmail(found.user.email.toLowerCase())).filter(
            (m) => m.stripe_customer_id,
          );
          // The live plan's customer first, then the newest.
          const member = paid.find((m) => isEntitled(m.status)) ?? paid[0];
          if (!member?.stripe_customer_id) return Response.redirect(account, 303);

          // The same portal settings as the welcome page's Manage billing.
          const configs = await stripe<{ data: { id: string; is_default: boolean }[] }>(
            "GET",
            "/billing_portal/configurations",
            { active: true, limit: 10 },
          );
          const config = configs.data.find((c) => c.is_default) ?? configs.data[0];
          const portal = await stripe<{ url: string }>("POST", "/billing_portal/sessions", {
            customer: member.stripe_customer_id,
            return_url: account,
            configuration: config?.id,
          });
          return Response.redirect(portal.url, 303);
        } catch (error) {
          console.error("[account] billing", error);
          return Response.redirect(`${account}?error=billing`, 303);
        }
      },
    },
  },
});
