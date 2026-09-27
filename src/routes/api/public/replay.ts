import { createFileRoute } from "@tanstack/react-router";

// Session replay: gzipped batches of rrweb events from src/lib/analytics/replay.ts.
//   POST /api/public/replay?sid=<visit id>&seq=<batch number>  (body: gzip bytes)

export const Route = createFileRoute("/api/public/replay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const sid = url.searchParams.get("sid") ?? "";
        const seq = Number(url.searchParams.get("seq"));
        if (!/^[a-z0-9]{8,40}$/i.test(sid) || !Number.isInteger(seq) || seq < 0 || seq > 10_000) {
          return new Response(null, { status: 400 });
        }
        try {
          const { MAX_CHUNK_BYTES, storeReplay } = await import("@/lib/analytics/replay.server");
          const data = await request.arrayBuffer();
          if (data.byteLength > MAX_CHUNK_BYTES) return new Response(null, { status: 413 });
          await storeReplay(sid, seq, data);
        } catch (e) {
          console.error("replay", e);
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
