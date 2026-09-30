// ovoa.ai in other languages, on the Worker (src/server.ts runs every request
// through handleI18n). The English text in the site's code (the list comes from
// vite.config.ts, as virtual:i18n-sources) is translated once per language by
// Workers AI, kept in D1's translations table, and looked up as pages render
// (translate.ts). Text that isn't translated yet shows in English and is
// translated in the background, so a new page or a changed sentence catches up
// on its own after a visit or two.
//
// Someone whose browser (or country) reads another language is asked once
// whether they want it (components/LanguagePrompt.tsx); the answer is the
// ovoa_lang cookie, and an address without a prefix takes them to their
// language after that.
import { AsyncLocalStorage } from "node:async_hooks";
import SOURCES from "virtual:i18n-sources";

import {
  LANG_COOKIE,
  LANG_NAMES,
  detectLang,
  isLang,
  isPagePath,
  langPath,
  normText,
  splitLangPath,
  type Lang,
} from "../langs";

type D1Statement = {
  bind(...args: unknown[]): D1Statement;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};
type D1 = {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown>;
};
type Ai = { run(model: string, input: unknown): Promise<unknown> };
export type I18nEnv = { SITE_DB?: D1; AI?: Ai };
type Ctx = { waitUntil?: (p: Promise<unknown>) => void };

type RewriterElement = { prepend(content: string, options?: { html: boolean }): void };
type Rewriter = {
  on(selector: string, handlers: { element?(el: RewriterElement): void }): Rewriter;
  transform(response: Response): Response;
};
declare const HTMLRewriter: { new (): Rewriter };

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const BATCH = 25;
const CACHE_MS = 60_000;
const SOURCE_SET = new Set(SOURCES);

// ---- The dictionary, per language, cached in the isolate for a minute.

type Dict = Map<string, string>;
const cache = new Map<Lang, { dict: Dict; at: number }>();

async function loadDict(env: I18nEnv, lang: Lang): Promise<Dict> {
  const hit = cache.get(lang);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.dict;
  const dict: Dict = new Map();
  if (env.SITE_DB) {
    try {
      const { results } = await env.SITE_DB.prepare(
        "SELECT source, text FROM translations WHERE lang = ?",
      )
        .bind(lang)
        .all<{ source: string; text: string }>();
      for (const row of results) if (SOURCE_SET.has(row.source)) dict.set(row.source, row.text);
    } catch (error) {
      console.error("i18n: couldn't read translations", error);
      if (hit) return hit.dict;
    }
  }
  cache.set(lang, { dict, at: Date.now() });
  return dict;
}

// ---- Translating what's missing, with Workers AI.

const filling = new Set<Lang>();

async function translateBatch(env: I18nEnv, lang: Lang, texts: string[]): Promise<string[] | null> {
  const system =
    `You translate the text of ovoa.ai, the website of OVOA (an AI assistant people text from their iPhone), from English into ${LANG_NAMES[lang]}. ` +
    `You get a JSON array of strings; reply with ONLY a JSON array of the same length, each string translated, in the same order. ` +
    `Sound natural and friendly, as a native speaker would write for a consumer app, using the informal "you". ` +
    `Never translate OVOA, OVOA Fit, iMessage, iPhone, Messages, TestFlight, Apple, Google, Stripe or other product and company names, and keep prices, numbers, @usernames, emoji, URLs and email addresses exactly as they are. ` +
    `Keep leading and trailing punctuation. A string may be a fragment of a sentence: translate it as a fragment.`;
  const result = (await env.AI!.run(MODEL, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(texts) },
    ],
    max_tokens: 8000,
    temperature: 0.2,
  })) as { response?: unknown };
  const response = result.response;
  let parsed: unknown = response;
  if (typeof response === "string") {
    const start = response.indexOf("[");
    const end = response.lastIndexOf("]");
    if (start < 0 || end < start) return null;
    try {
      parsed = JSON.parse(response.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed) || parsed.length !== texts.length) return null;
  return parsed.map((t) => (typeof t === "string" ? t.trim() : ""));
}

/** Translates up to `max` pieces of text not yet in `lang`; returns how many are left. */
export async function fillLang(env: I18nEnv, lang: Lang, max: number): Promise<number> {
  const db = env.SITE_DB;
  if (lang === "en") return 0;
  const dict = await loadDict(env, lang);
  const missing = SOURCES.filter((s) => !dict.has(s));
  if (!env.AI || !db || missing.length === 0 || filling.has(lang)) return missing.length;
  filling.add(lang);
  const todo = missing.slice(0, max);
  let done = 0;
  try {
    for (let i = 0; i < todo.length; i += BATCH) {
      const texts = todo.slice(i, i + BATCH);
      let out = await translateBatch(env, lang, texts).catch(() => null);
      // A batch the model garbles goes one by one instead.
      if (!out) {
        out = [];
        for (const text of texts) {
          const one = await translateBatch(env, lang, [text]).catch(() => null);
          out.push(one?.[0] ?? "");
        }
      }
      const rows = texts
        .map((source, j) => ({ source, text: out[j] ?? "" }))
        .filter((r) => r.text);
      if (rows.length) {
        await db.batch(
          rows.map((r) =>
            db
              .prepare("INSERT OR REPLACE INTO translations (lang, source, text) VALUES (?, ?, ?)")
              .bind(lang, r.source, r.text),
          ),
        );
        for (const r of rows) dict.set(r.source, r.text);
      }
      done += texts.length;
    }
  } catch (error) {
    console.error("i18n: translating failed", error);
  } finally {
    filling.delete(lang);
  }
  return Math.max(0, missing.length - done);
}

// ---- Lookups while a page renders.

type Store = { lang: Lang; dict: Dict | null };
const als = new AsyncLocalStorage<Store>();

function lookup(dict: Dict, s: string): string {
  const key = normText(s);
  const text = key ? dict.get(key) : undefined;
  if (!text) return s;
  const lead = /^\s*/.exec(s)?.[0] ?? "";
  const trail = /\s*$/.exec(s)?.[0] ?? "";
  return lead + text + trail;
}

const g = globalThis as { __ovoaT?: (s: string) => string; __ovoaLang?: () => Lang };
g.__ovoaLang = () => als.getStore()?.lang ?? "en";
g.__ovoaT = (s) => {
  const dict = als.getStore()?.dict;
  return dict ? lookup(dict, s) : s;
};

// The browser's copy: the same lookup, over the whole dictionary. Its address
// changes with the dictionary's size, so browsers can keep it for good.
const BROWSER_T =
  '(function(d){var n=function(s){return s.replace(/\\s+/g," ").trim()};' +
  "window.__ovoaT=function(s){var t=d[n(s)];if(!t)return s;" +
  "return /^\\s*/.exec(s)[0]+t+/\\s*$/.exec(s)[0]}})";

function cookie(request: Request, name: string): string | null {
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(request.headers.get("cookie") ?? "");
  return m ? decodeURIComponent(m[1] ?? "") : null;
}

const escapeJson = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

/**
 * Runs `next` (the site) in the request's language, and answers the
 * dictionary and fill addresses itself.
 */
export async function handleI18n(
  request: Request,
  env: I18nEnv,
  ctx: Ctx,
  next: () => Promise<Response>,
): Promise<Response> {
  const url = new URL(request.url);

  // /api/i18n/es.js: the dictionary for the browser.
  const js = /^\/api\/i18n\/([a-z]{2})\.js$/.exec(url.pathname);
  if (js) {
    const lang = js[1];
    if (!isLang(lang) || lang === "en") return new Response("Not found", { status: 404 });
    const dict = await loadDict(env, lang);
    const body = `${BROWSER_T}(${escapeJson(Object.fromEntries(dict))});`;
    return new Response(body, {
      headers: {
        "content-type": "text/javascript; charset=utf-8",
        "cache-control": url.searchParams.has("v")
          ? "public, max-age=31536000, immutable"
          : "public, max-age=60",
      },
    });
  }

  // POST /api/i18n/fill?lang=es: translate the next hundred (after a
  // deploy, so the first visitors don't see English). Only text from the code
  // is ever translated, so this can't be made to translate anything else.
  if (url.pathname === "/api/i18n/fill") {
    const lang = url.searchParams.get("lang");
    if (request.method !== "POST" || !isLang(lang)) {
      return new Response("Bad request", { status: 400 });
    }
    const remaining = await fillLang(env, lang, 100);
    return Response.json({ lang, total: SOURCES.length, remaining });
  }

  const isPage =
    (request.method === "GET" || request.method === "HEAD") && isPagePath(url.pathname);
  const { lang, path } = splitLangPath(url.pathname);
  const chosen = cookie(request, LANG_COOKIE);

  // Someone who picked a language gets it at an address without one.
  if (isPage && lang === "en" && isLang(chosen) && chosen !== "en") {
    const target = new URL(url);
    target.pathname = langPath(chosen, path);
    return new Response(null, {
      status: 302,
      headers: { location: target.href, vary: "Cookie" },
    });
  }

  const dict = lang === "en" ? null : await loadDict(env, lang);
  const response = await als.run({ lang, dict }, next);
  if (!isPage || !(response.headers.get("content-type") ?? "").includes("text/html")) {
    return response;
  }

  if (dict && dict.size < SOURCES.length && env.AI) {
    ctx.waitUntil?.(fillLang(env, lang, 50));
  }

  const cf = (request as { cf?: { country?: string } }).cf;
  const suggest = detectLang(request.headers.get("accept-language"), cf?.country ?? null);
  const boot = { lang, suggest, chosen: isLang(chosen) ? chosen : null };
  let head =
    `<script>window.__OVOA_I18N__=${escapeJson(boot)};` +
    `window.__ovoaLang=function(){return ${JSON.stringify(lang)}};</script>`;
  if (dict) head += `<script src="/api/i18n/${lang}.js?v=${dict.size}"></script>`;

  const out = new HTMLRewriter()
    .on("head", { element: (el) => el.prepend(head, { html: true }) })
    .transform(response);
  const copy = new Response(out.body, out);
  copy.headers.append("vary", "Cookie, Accept-Language");
  return copy;
}
