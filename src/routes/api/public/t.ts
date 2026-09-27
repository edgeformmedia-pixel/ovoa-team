import { createFileRoute } from "@tanstack/react-router";

// Site analytics: batches of page views, clicks and scrolls from
// src/lib/analytics/track.ts (sent with sendBeacon, so always 204).

export const Route = createFileRoute("/api/public/t")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const len = Number(request.headers.get("content-length") ?? 0);
        if (len > 64_000) return new Response(null, { status: 413 });
        try {
          const body = JSON.parse(await request.text());
          const { collect } = await import("@/lib/analytics/collect.server");
          await collect(request, body);
        } catch (e) {
          console.error("analytics", e);
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
