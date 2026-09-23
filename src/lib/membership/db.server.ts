// The membership tables live in Cloudflare D1 (binding SITE_DB, see
// wrangler.site.jsonc and migrations/). Nitro's Worker entry puts the
// bindings on globalThis.__env__ for every request.

type D1Value = string | number | null;

type D1Result<T> = { results: T[]; meta: { changes?: number } };

type D1Statement = {
  bind(...values: D1Value[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<unknown>>;
};

type D1 = { prepare(sql: string): D1Statement };

type WorkerEnv = Record<string, unknown> & { SITE_DB?: D1 };

function workerEnv(): WorkerEnv | undefined {
  return (globalThis as { __env__?: WorkerEnv }).__env__;
}

// Secrets and vars: process.env on Workers (nodejs_compat), with the raw
// Worker env as a fallback.
export function envVar(name: string): string | undefined {
  const fromProcess = typeof process !== "undefined" ? process.env?.[name] : undefined;
  if (fromProcess) return fromProcess;
  const fromWorker = workerEnv()?.[name];
  return typeof fromWorker === "string" ? fromWorker : undefined;
}

export class DatabaseMissingError extends Error {
  constructor() {
    super("The SITE_DB database isn't connected (deploy with wrangler.site.jsonc).");
  }
}

function d1(): D1 {
  const db = workerEnv()?.SITE_DB;
  if (!db) throw new DatabaseMissingError();
  return db;
}

type Arg = string | number | boolean | null | undefined;

// D1 takes null, numbers and strings only.
const clean = (args: Arg[]): D1Value[] =>
  args.map((a) => (a === undefined ? null : typeof a === "boolean" ? (a ? 1 : 0) : a));

export async function one<T>(sql: string, ...args: Arg[]): Promise<T | null> {
  return d1()
    .prepare(sql)
    .bind(...clean(args))
    .first<T>();
}

export async function all<T>(sql: string, ...args: Arg[]): Promise<T[]> {
  const res = await d1()
    .prepare(sql)
    .bind(...clean(args))
    .all<T>();
  return res.results;
}

export async function run(sql: string, ...args: Arg[]): Promise<number> {
  const res = await d1()
    .prepare(sql)
    .bind(...clean(args))
    .run();
  return res.meta.changes ?? 0;
}

export const now = () => new Date().toISOString();

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

export function isMissingTable(error: unknown): boolean {
  return error instanceof Error && /no such table/i.test(error.message);
}
