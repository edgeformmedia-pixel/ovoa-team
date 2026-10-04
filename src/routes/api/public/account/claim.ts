import { createFileRoute } from "@tanstack/react-router";

// POST { id }: /join?id=… opened signed out. The link OVOA texted is proof of
// the number, so the number's own account (made while it texted free) becomes
// a real one, no email, and is signed in here (jarvis-api POST /texting/claim).

export const Route = createFileRoute("/api/public/account/claim")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { accountApiUrl, sameOrigin, sessionCookie } =
          await import("@/lib/account/account.server");
        if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
        const body = (await request.json().catch(() => ({}))) as { id?: unknown };
        const id = typeof body.id === "string" ? body.id.slice(0, 64) : "";
        try {
          const res = await fetch(`${accountApiUrl()}/texting/claim`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id }),
            signal: AbortSignal.timeout(8000),
          });
          const got = (await res.json().catch(() => ({}))) as Partial<{ token: string; error: string }>;
          if (res.status === 429)
            return Response.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
          if (!res.ok || !got.token)
            return Response.json(
              { error: got.error ?? "That didn't work. Try again." },
              { status: res.status === 404 ? 404 : 502 },
            );
          return Response.json(
            { ok: true },
            { headers: { "set-cookie": sessionCookie(request, got.token) } },
          );
        } catch (error) {
          console.error("[join] POST /texting/claim", error);
          return Response.json(
            { error: "Can't reach OVOA right now. Try again in a minute." },
            { status: 502 },
          );
        }
      },
    },
  },
});
