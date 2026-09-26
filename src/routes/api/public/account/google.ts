import { createFileRoute } from "@tanstack/react-router";

// "Continue with Google" on /account: off to Google's account picker, with a
// random state kept in a cookie for google-callback to match.

export const Route = createFileRoute("/api/public/account/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { GOOGLE_STATE_COOKIE, NEXT_COOKIE, googleAuthUrl, googleConfigured, nextPage, setCookie } =
          await import("@/lib/account/account.server");
        const url = new URL(request.url);
        const origin = url.origin;
        const next = nextPage(url.searchParams.get("next"));
        if (!googleConfigured())
          return Response.redirect(`${origin}${next}?error=google-off`, 303);

        const state = [...crypto.getRandomValues(new Uint8Array(16))]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const headers = new Headers({ location: googleAuthUrl(origin, state) });
        headers.append("set-cookie", setCookie(request, GOOGLE_STATE_COOKIE, state, 10 * 60));
        headers.append("set-cookie", setCookie(request, NEXT_COOKIE, next, 10 * 60));
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
