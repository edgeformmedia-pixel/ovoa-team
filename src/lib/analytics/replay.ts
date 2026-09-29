// Session replay: records the page with rrweb so a visit can be played back on
// admin.ovoa.ai. Every field's text is masked, so nothing typed is ever sent,
// and canvases (the 3D OVOA Fit) are left out. Batches go gzipped to
// /api/public/replay (replay.server.ts) under the analytics visit id.
// Mark anything else that must never be recorded with class "rr-block".

const ENDPOINT = "/api/public/replay";
const FLUSH_MS = 10_000;
// A fetch that outlives the page (keepalive) may carry 64 KB at most.
const KEEPALIVE_MAX = 60_000;

let started = false;
let buffer: unknown[] = [];
let sid = "";

function nextSeq(): number {
  try {
    const n = Number(sessionStorage.getItem(`ovoa_rseq_${sid}`) ?? 0);
    sessionStorage.setItem(`ovoa_rseq_${sid}`, String(n + 1));
    return n;
  } catch {
    return Math.floor(Math.random() * 1_000_000) + 1000;
  }
}

async function gzip(text: string): Promise<Blob> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).blob();
}

async function flush() {
  if (!buffer.length || !sid) return;
  const events = buffer;
  buffer = [];
  const body = await gzip(JSON.stringify(events));
  fetch(`${ENDPOINT}?sid=${sid}&seq=${nextSeq()}`, {
    method: "POST",
    body,
    keepalive: body.size < KEEPALIVE_MAX,
    headers: { "content-type": "application/octet-stream" },
  }).catch(() => undefined);
}

export async function startReplay(sessionId: string) {
  if (started || typeof CompressionStream === "undefined") return;
  started = true;
  sid = sessionId;
  const { record } = await import("@rrweb/record");
  record({
    emit(event) {
      buffer.push(event);
    },
    maskAllInputs: true,
    blockClass: "rr-block",
    recordCanvas: false,
    collectFonts: false,
    inlineImages: false,
    sampling: { mousemove: 50, scroll: 150, input: "last" },
    slimDOMOptions: "all",
  });
  setInterval(flush, FLUSH_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
}
