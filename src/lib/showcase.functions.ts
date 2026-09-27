import { createServerFn } from "@tanstack/react-start";

// The "Made with OVOA" gallery on /websites: websites whose owners asked OVOA
// to show them (site_manage showcase in ovoa-app's sites.ts), from the app's
// server. Anything wrong there and the page just leaves the gallery out.

export type ShowcaseSite = { name: string; url: string; description: string | null };

export const getShowcase = createServerFn({ method: "GET" }).handler(
  async (): Promise<ShowcaseSite[]> => {
    const { accountApiUrl } = await import("./account/account.server");
    try {
      const res = await fetch(`${accountApiUrl()}/sites/showcase`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return [];
      const body = (await res.json()) as { sites?: ShowcaseSite[] };
      return (body.sites ?? [])
        .filter((s) => typeof s.url === "string" && s.url.startsWith("https://"))
        .slice(0, 24);
    } catch (error) {
      console.error("[showcase] GET /sites/showcase", error);
      return [];
    }
  },
);
