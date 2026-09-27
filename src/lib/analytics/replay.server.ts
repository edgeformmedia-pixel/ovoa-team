// Stores session-replay batches from src/lib/analytics/replay.ts in
// ovoa-replay-db (binding REPLAY_DB, migrations-replay/). Each batch arrives
// gzipped and is kept as it came; admin.ovoa.ai unzips it to play.

import { run } from "@/lib/membership/db.server";

type Replay = {
  prepare(sql: string): {
    bind(...values: unknown[]): { first<T>(): Promise<T | null>; run(): Promise<unknown> };
  };
};

export const MAX_CHUNK_BYTES = 900_000;
const MAX_SESSION_BYTES = 15_000_000;
const KEEP_DAYS = 30;

function replayDb(): Replay | null {
  return ((globalThis as { __env__?: { REPLAY_DB?: Replay } }).__env__?.REPLAY_DB) ?? null;
}

export async function storeReplay(sid: string, seq: number, data: ArrayBuffer): Promise<void> {
  const db = replayDb();
  if (!db || !data.byteLength) return;

  const used = await db.prepare("SELECT COALESCE(SUM(size), 0) AS bytes FROM replay_chunks WHERE session_id = ?")
    .bind(sid).first<{ bytes: number }>();
  if ((used?.bytes ?? 0) + data.byteLength > MAX_SESSION_BYTES) return;

  const stamp = new Date().toISOString();
  await db.prepare("INSERT OR IGNORE INTO replay_chunks (session_id, seq, created_at, size, data) VALUES (?, ?, ?, ?, ?)")
    .bind(sid, seq, stamp, data.byteLength, data).run();
  await run("UPDATE analytics_sessions SET replay_bytes = replay_bytes + ? WHERE id = ?", data.byteLength, sid);

  // Now and then, drop recordings past their keep date.
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString();
    await db.prepare("DELETE FROM replay_chunks WHERE created_at < ?").bind(cutoff).run();
  }
}
