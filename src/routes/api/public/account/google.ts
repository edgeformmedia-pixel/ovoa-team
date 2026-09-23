import { createFileRoute } from "@tanstack/react-router";

// "Continue with Google" on /account: off to Google's account picker, with a
// random state kept in a cookie for google-callback to match.

export const Route = createFileRoute("/api/public/account/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { GOOGLE_STATE_COOKIE, googleAuthUrl, googleConfigured, setCookie } =
          await import("@/lib/account/account.server");
        const origin = new URL(request.url).origin;
        if (!googleConfigured())
          return Response.redirect(`${origin}/account?error=google-off`, 303);

        const state = [...crypto.getRandomValues(new Uint8Array(16))]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        return new Response(null, {
          status: 302,
          headers: {
            location: googleAuthUrl(origin, state),
            "set-cookie": setCookie(request, GOOGLE_STATE_COOKIE, state, 10 * 60),
          },
        });
      },
    },
  },
});
