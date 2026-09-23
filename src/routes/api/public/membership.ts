import { createFileRoute } from "@tanstack/react-router";

// For the OVOA app's server: which AI tier does this email have?
//
//   GET /api/public/membership?email=someone@example.com
//   Authorization: Bearer <MEMBERSHIP_API_KEY>
//
//   → { "tier": "free" | "base" | "pro",
//       "status": "trialing" | "active" | "past_due" | "canceled" | "comp" | "none",
//       "trialEndsAt": "ISO date or null", "renewsAt": "ISO date or null",
//       "source": "stripe" | "band_trial" | "comp" | "none" }
//
// The shape is fixed by docs/paywall/SPEC.md §2 in ovoa-app; the tier is
// already resolved (src/lib/membership/resolve.ts). Call it from the Worker,
// never from the phone: the key must stay server-side.

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
        const { resolveMembership } = await import("@/lib/membership/resolve");
        try {
          return Response.json(resolveMembership(await store().membersByEmail(email)));
        } catch (error) {
          console.error("[membership] lookup", error);
          return Response.json({ error: "lookup failed" }, { status: 500 });
        }
      },
    },
  },
});
