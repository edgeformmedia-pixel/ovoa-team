import { createFileRoute } from "@tanstack/react-router";

// "Continue with Apple" on /text (and /account): a nonce from the app's server,
// a random state in a cookie for apple-callback to match, then Apple's page.

export const Route = createFileRoute("/api/public/account/apple")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const {
          APPLE_STATE_COOKIE,
          appleAuthUrl,
          appleConfigured,
          appleNonce,
          crossSiteCookie,
          nextPage,
        } = await import("@/lib/account/account.server");
        const url = new URL(request.url);
        const next = nextPage(url.searchParams.get("next"));
        if (!appleConfigured()) return Response.redirect(`${url.origin}${next}?error=apple-off`, 303);
        const nonce = await appleNonce();
        if (!nonce) return Response.redirect(`${url.origin}${next}?error=apple`, 303);

        const state = [...crypto.getRandomValues(new Uint8Array(16))]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        // state.nonce.next: the callback needs all three and Apple posts back cross-site.
        const kept = `${state}.${nonce}.${next}`;
        const headers = new Headers({ location: appleAuthUrl(url.origin, state, nonce) });
        headers.append("set-cookie", crossSiteCookie(request, APPLE_STATE_COOKIE, kept, 10 * 60));
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
