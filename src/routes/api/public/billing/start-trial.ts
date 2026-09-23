import { createFileRoute } from "@tanstack/react-router";

// "Start my free days" on the welcome page, for a Band bought with Base: makes
// the Base subscription with its free days (startBandTrial in sync.server.ts),
// then goes back to the welcome page. A form POST, never a plain link: mail
// scanners open the links in emails, and that mustn't start anyone's free
// days. The checkout session id in the welcome link is what proves who they
// are, as for Manage billing.

export const Route = createFileRoute("/api/public/billing/start-trial")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { CHECKOUT_SESSION_PATTERN } = await import("@/lib/membership/plans");
        const { startBandTrial, TrialError } = await import("@/lib/membership/sync.server");

        const origin = new URL(request.url).origin;
        const sessionId = new URLSearchParams(await request.text()).get("session_id") ?? "";
        if (!CHECKOUT_SESSION_PATTERN.test(sessionId)) {
          return new Response("That link isn't valid.", { status: 400 });
        }
        const welcome = `${origin}/early-access/welcome?session_id=${sessionId}`;

        try {
          await startBandTrial(sessionId);
          return Response.redirect(welcome, 303);
        } catch (error) {
          if (error instanceof TrialError)
            return Response.redirect(`${welcome}&error=no-trial`, 303);
          console.error("[membership] start trial", error);
          return Response.redirect(`${welcome}&error=start`, 303);
        }
      },
    },
  },
});
