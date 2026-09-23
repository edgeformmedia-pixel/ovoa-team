import { createFileRoute } from "@tanstack/react-router";

// Where Google sends the visitor back. Its code becomes an ID token, which the
// app's server checks with Google and matches to an account by email:
//
//   - an account (made in the app or here): signed in, back to /account
//   - none yet: /account with a signup ticket in the fragment (never sent to a
//     server or kept in a log), where they pick a name and the app password

export const Route = createFileRoute("/api/public/account/google-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const {
          GOOGLE_STATE_COOKIE,
          clearCookie,
          googleIdToken,
          readCookie,
          sessionCookie,
          signInWithGoogle,
        } = await import("@/lib/account/account.server");

        const url = new URL(request.url);
        const account = `${url.origin}/account`;
        const go = (location: string, cookie?: string) => {
          const headers = new Headers({ location });
          headers.append("set-cookie", clearCookie(request, GOOGLE_STATE_COOKIE));
          if (cookie) headers.append("set-cookie", cookie);
          return new Response(null, { status: 303, headers });
        };

        // They closed Google's page, or said no.
        if (url.searchParams.get("error")) return go(`${account}?error=google-cancel`);
        const state = url.searchParams.get("state");
        const code = url.searchParams.get("code");
        if (!state || !code || state !== readCookie(request, GOOGLE_STATE_COOKIE)) {
          return go(`${account}?error=google-state`);
        }

        const idToken = await googleIdToken(url.origin, code);
        const proven = idToken ? await signInWithGoogle(idToken) : null;
        if (!proven) return go(`${account}?error=google`);
        if ("token" in proven) return go(account, sessionCookie(request, proven.token));

        const finish = new URLSearchParams({
          finish: proven.ticket,
          email: proven.email,
          ...(proven.name ? { name: proven.name } : {}),
        });
        return go(`${account}#${finish.toString()}`);
      },
    },
  },
});
