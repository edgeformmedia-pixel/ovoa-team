import { createServerFn } from "@tanstack/react-start";

// "Not on iPhone?" on the homepage and /text: an email to tell when OVOA works
// on their phone (migrations/0011_waitlist.sql). The same answer whether the
// email is new or already there.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Across everyone: more than this in an hour is a flood, not people.
const PER_HOUR = 60;

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((input: { email?: unknown; company?: unknown }) => {
    const email = typeof input?.email === "string" ? input.email.trim().slice(0, 200).toLowerCase() : "";
    if (!EMAIL.test(email)) throw new Error("That email doesn't look right.");
    // A field people can't see: only bots fill it in.
    return { email, trap: typeof input?.company === "string" ? input.company.trim() : "" };
  })
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (data.trap) return { ok: true };
    const { getRequest } = await import("@tanstack/react-start/server");
    const { sameOrigin } = await import("./account/account.server");
    const { now, one, run } = await import("./membership/db.server");
    const request = getRequest();
    if (!sameOrigin(request)) return { ok: false };
    try {
      const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
      const recent = await one<{ n: number }>(
        "SELECT COUNT(*) AS n FROM waitlist WHERE created_at > ?",
        hourAgo,
      );
      if ((recent?.n ?? 0) >= PER_HOUR) return { ok: false };
      const ua = request.headers.get("user-agent") ?? "";
      const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : "Other";
      const cf = (request as Request & { cf?: { country?: string } }).cf;
      await run(
        "INSERT INTO waitlist (email, device, os, country, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING",
        data.email,
        /Mobi|iPhone|Android/i.test(ua) ? "mobile" : "desktop",
        os,
        cf?.country ?? request.headers.get("cf-ipcountry"),
        now(),
      );
      return { ok: true };
    } catch (error) {
      console.error("[waitlist]", error);
      return { ok: false };
    }
  });
