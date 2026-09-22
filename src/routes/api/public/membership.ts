import { createFileRoute } from "@tanstack/react-router";

// For the OVOA app's server: does this email have a membership?
//
//   GET /api/public/membership?email=someone@example.com
//   Authorization: Bearer <MEMBERSHIP_API_KEY>
//
//   → { "email": "...", "active": true, "plan": "annual", "status": "trialing",
//       "trialEndsAt": "...", "renewsAt": "..." }
//
// Call it from the Worker, never from the phone: the key must stay server-side.

type Row = {
  plan: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  created_at: string;
};

export const Route = createFileRoute("/api/public/membership")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { bearer, checkKey } = await import("@/lib/membership/keys.server");
        if (!checkKey("MEMBERSHIP_API_KEY", bearer(request))) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return Response.json({ error: "email required" }, { status: 400 });
        }

        const { store } = await import("@/lib/membership/store.server");
        const { isEntitled } = await import("@/lib/membership/plans");
        let rows: Row[];
        try {
          rows = await store().membersByEmail(email);
        } catch (error) {
          console.error("[membership] lookup", error);
          return Response.json({ error: "lookup failed" }, { status: 500 });
        }

        // The best row wins: a live membership over an ended one.
        const best = rows.find((r) => isEntitled(r.status)) ?? rows[0];
        return Response.json({
          email,
          active: Boolean(best && isEntitled(best.status)),
          plan: best?.plan ?? null,
          status: best?.status ?? null,
          trialEndsAt: best?.trial_ends_at ?? null,
          renewsAt: best?.current_period_end ?? null,
        });
      },
    },
  },
});
