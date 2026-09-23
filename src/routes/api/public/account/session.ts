import { createFileRoute } from "@tanstack/react-router";

// The site's sign-in session (src/lib/account/account.server.ts).
//
//   POST   { token }  The session the app's server just gave the browser (after
//                     an email code, or after finishing sign-up). Checked with
//                     that server, then kept in an HttpOnly cookie.
//   DELETE           Signs out: here and on the app's server.

export const Route = createFileRoute("/api/public/account/session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isToken, lookupAccount, sameOrigin, sessionCookie } =
          await import("@/lib/account/account.server");
        if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
        const body = (await request.json().catch(() => ({}))) as { token?: unknown };
        if (!isToken(body.token)) return Response.json({ error: "no session" }, { status: 400 });

        const found = await lookupAccount(body.token);
        if (found.state === "out") return Response.json({ error: "signed out" }, { status: 401 });
        if (found.state === "down") {
          return Response.json(
            { error: "Can't reach OVOA right now. Try again in a minute." },
            { status: 502 },
          );
        }
        return Response.json(
          { user: { email: found.user.email, name: found.user.name } },
          { headers: { "set-cookie": sessionCookie(request, body.token) } },
        );
      },
      DELETE: async ({ request }) => {
        const { SESSION_COOKIE, clearCookie, logoutAccount, sameOrigin, sessionToken } =
          await import("@/lib/account/account.server");
        if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
        const token = sessionToken(request);
        if (token) await logoutAccount(token);
        return Response.json(
          { ok: true },
          { headers: { "set-cookie": clearCookie(request, SESSION_COOKIE) } },
        );
      },
    },
  },
});
