import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// When each page last changed, for the sitemap's <lastmod>: the last commit
// that touched the page's route file (today if it has changes not yet
// committed), keyed by the route's path. No git, no dates: the sitemap just
// leaves them out.
function routeLastmod(): Record<string, string> {
  const dates: Record<string, string> = {};
  try {
    const dirty = execFileSync("git", ["status", "--porcelain", "--", "src/routes"], {
      encoding: "utf8",
    });
    const today = new Date().toISOString().slice(0, 10);
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
      );
    for (const file of walk("src/routes")) {
      const id = readFileSync(file, "utf8").match(/createFileRoute\("([^"]+)"\)/)?.[1];
      if (!id || id.startsWith("/api/")) continue;
      const rel = file.replace(/\\/g, "/");
      const committed = execFileSync("git", ["log", "-1", "--format=%cs", "--", rel], {
        encoding: "utf8",
      }).trim();
      const changed = dirty.includes(rel);
      const date = changed || !committed ? today : committed;
      dates[id.length > 1 ? id.replace(/\/$/, "") : id] = date;
    }
  } catch {
    return {};
  }
  return dates;
}

// `vite build` writes the Cloudflare Worker to .output/ (server/index.mjs and
// public/), which wrangler.site.jsonc deploys.
export default defineConfig(({ command }) => ({
  define: { __ROUTE_LASTMOD__: JSON.stringify(routeLastmod()) },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Server-only code must never end up in the browser bundle.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // Our SSR error wrapper (src/server.ts) is the server entry.
      server: { entry: "server" },
    }),
    ...(command === "build" ? [nitro({ preset: "cloudflare-module" })] : []),
    viteReact(),
  ],
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  server: { host: "::", port: 8080 },
}));
