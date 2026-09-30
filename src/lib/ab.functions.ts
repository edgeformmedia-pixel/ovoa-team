import { createServerFn } from "@tanstack/react-start";
import {
  AB_COOKIE,
  AB_DAYS,
  AB_HELLO,
  AB_NAME,
  AB_TEST,
  cookieVariant,
  isVariant,
  type Variant,
} from "./ab";

// Which version of the front door this visitor sees (migrations/0012_ab_test.sql).
// A browser with the cookie keeps its version. A new one takes the next number:
// odd is A, even is B. Crawlers, the admin's click map (a frame) and a database
// that didn't answer all get A without being counted. `force` (ovoa.ai/?ab=b)
// shows a version on purpose, uncounted, and keeps this browser on it (the
// click map's frame is shown it and nothing is kept).

const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly/i;

export const getVariant = createServerFn({ method: "GET" })
  .inputValidator((input: { force?: unknown } | undefined) => ({
    force: isVariant(input?.force) ? input.force : null,
  }))
  .handler(async ({ data }): Promise<{ variant: Variant }> => {
    const { getRequest, setResponseHeader } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const keep = (variant: Variant) => {
      const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
      // Not HttpOnly: TextOvoaLink reads it to pick the hello.
      setResponseHeader(
        "set-cookie",
        `${AB_COOKIE}=${AB_TEST}.${variant}; Path=/; SameSite=Lax; Max-Age=${AB_DAYS * 86_400}${secure}`,
      );
      return { variant };
    };

    const framed = request.headers.get("sec-fetch-dest") === "iframe";
    if (data.force) return framed ? { variant: data.force } : keep(data.force);
    const had = cookieVariant(request.headers.get("cookie"));
    if (had) return { variant: had };

    const ua = request.headers.get("user-agent") ?? "";
    if (!ua || BOTS.test(ua) || framed) return { variant: "a" };
    try {
      const { now, one } = await import("./membership/db.server");
      const row = await one<{ n: number }>(
        `INSERT INTO ab_tests (test, n, name_a, name_b, hello_a, hello_b, started_at)
         VALUES (?, 1, ?, ?, ?, ?, ?)
         ON CONFLICT(test) DO UPDATE SET n = n + 1 RETURNING n`,
        AB_TEST,
        AB_NAME.a,
        AB_NAME.b,
        AB_HELLO.a,
        AB_HELLO.b,
        now(),
      );
      if (!row) return { variant: "a" };
      return keep(row.n % 2 === 1 ? "a" : "b");
    } catch (error) {
      console.error("[ab]", error);
      return { variant: "a" };
    }
  });
