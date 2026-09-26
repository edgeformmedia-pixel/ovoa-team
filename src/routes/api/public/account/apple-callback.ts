import { createFileRoute } from "@tanstack/react-router";

// Where Apple posts back (response_mode=form_post): an ID token, the state, and
// the first time only, the person's name. The app's server checks the token
// and its nonce and always ends with a session (Apple accounts need no password).

export const Route = createFileRoute("/api/public/account/apple-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          APPLE_STATE_COOKIE,
          crossSiteCookie,
          nextPage,
          readCookie,
          sessionCookie,
          signInWithApple,
        } = await import("@/lib/account/account.server");

        const origin = new URL(request.url).origin;
        const [state, nonce, rawNext] = (readCookie(request, APPLE_STATE_COOKIE) ?? "").split(".");
        const next = `${origin}${nextPage(rawNext)}`;
        const go = (location: string, cookie?: string) => {
          const headers = new Headers({ location });
          headers.append("set-cookie", crossSiteCookie(request, APPLE_STATE_COOKIE, "", 0));
          if (cookie) headers.append("set-cookie", cookie);
          return new Response(null, { status: 303, headers });
        };

        const form = await request.formData().catch(() => null);
        if (!form) return go(`${next}?error=apple`);
        if (form.get("error")) return go(`${next}?error=apple-cancel`);
        const idToken = form.get("id_token");
        if (!state || !nonce || form.get("state") !== state || typeof idToken !== "string") {
          return go(`${next}?error=apple-state`);
        }

        let name: string | null = null;
        try {
          const user = JSON.parse(String(form.get("user") ?? "null")) as {
            name?: { firstName?: string; lastName?: string };
          } | null;
          name = [user?.name?.firstName, user?.name?.lastName].filter(Boolean).join(" ") || null;
        } catch {
          name = null;
        }

        const token = await signInWithApple(idToken, nonce, name);
        if (!token) return go(`${next}?error=apple`);
        return go(next, sessionCookie(request, token));
      },
    },
  },
});
