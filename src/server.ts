import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// One address per page, so search engines index https://ovoa.ai and nothing
// else. www and plain http move there for good (301), as do a trailing slash
// or capitals in a page's path, and the addresses people (and AI assistants)
// guess for the plans, the Band and help. ovoa-site.ovoa.workers.dev keeps
// working (Google sign-in and testing use it) but asks not to be indexed.
const SITE_HOST = "ovoa.ai";

const PATH_ALIASES: Record<string, string> = {
  "/pricing": "/early-access",
  "/plans": "/early-access",
  "/band": "/checkout",
  "/buy": "/checkout",
  "/shop": "/checkout",
  "/help": "/faq",
  "/support": "/faq",
  "/privacy-policy": "/privacy",
  "/terms-of-service": "/terms",
  "/login": "/account",
  "/signin": "/account",
  "/sign-in": "/account",
  "/signup": "/account",
  "/sign-up": "/account",
  "/affiliates": "/partners",
};

function canonicalRedirect(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  const target = new URL(url);
  if (target.hostname === `www.${SITE_HOST}`) {
    target.hostname = SITE_HOST;
    target.protocol = "https:";
  }
  // Cloudflare says how the visitor connected. The URL can't: wrangler dev
  // hands the Worker http://ovoa.ai/… for every local request.
  if (target.hostname === SITE_HOST && request.headers.get("x-forwarded-proto") === "http") {
    target.protocol = "https:";
  }
  // Pages only: not the API, server functions (/_serverFn/…) or files.
  if (!/^\/(api\/|_)/.test(url.pathname) && !url.pathname.includes(".")) {
    const path = url.pathname.replace(/\/+$/, "").toLowerCase() || "/";
    target.pathname = PATH_ALIASES[path] ?? path;
  }
  return target.href === url.href ? null : Response.redirect(target.href, 301);
}

function noindexWorkersDev(request: Request, response: Response): Response {
  if (!new URL(request.url).hostname.endsWith(".workers.dev")) return response;
  const copy = new Response(response.body, response);
  copy.headers.set("X-Robots-Tag", "noindex");
  return copy;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const redirect = canonicalRedirect(request);
      if (redirect) return redirect;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return noindexWorkersDev(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
