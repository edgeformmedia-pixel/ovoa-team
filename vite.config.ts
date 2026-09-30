import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

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

// The English text in the site's code, for translating ovoa.ai into other
// languages (src/lib/i18n): JSX text and string literals that read like words,
// from everything the browser renders (not server-only code or the API). The
// Worker imports the list as virtual:i18n-sources and only ever translates
// what's on it.
const NO_TEXT_ATTRS = new Set([
  "className", "href", "to", "src", "id", "type", "key", "rel", "name", "target", "role",
  "htmlFor", "autoComplete", "inputMode", "method", "action", "viewBox", "d", "fill",
  "stroke", "xmlns", "as", "variant", "size", "side", "align", "pattern", "lang", "dir",
]);

const ENTITIES: Record<string, string> = {
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", larr: "←", rarr: "→",
  amp: "&", apos: "'", quot: '"', lt: "<", gt: ">", nbsp: " ", mdash: "—", ndash: "–",
  middot: "·", times: "×", copy: "©", trade: "™", reg: "®",
};

function i18nSources(): string[] {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  // Class lists, identifiers and keys: one lowercase token, or tokens like
  // "px-4 md:flex" (words in a sentence don't have - : [ or /).
  const codeLike = (s: string) => {
    const tokens = s.split(" ");
    return (
      tokens.every((t) => /^[a-z0-9_:\-[\]/.#%!&>*=()',]+$/.test(t)) &&
      (tokens.length === 1 || tokens.some((t) => /[-:[/]/.test(t)))
    );
  };
  const prose = (s: string) =>
    s.length > 1 &&
    s.length <= 2000 &&
    /\p{L}{2}/u.test(s) &&
    !/^(https?:|mailto:|sms:|tel:|\/|#|@|\.)/.test(s) &&
    !/^[\w.-]+@[\w.-]+$/.test(s) &&
    !/^&#?\w+;$/.test(s) &&
    !codeLike(s) &&
    !/^[A-Z0-9_]+$/.test(s) &&
    // camelCase and PascalCase names (FormControl, FAQPage).
    !/^[A-Za-z]+[a-z][A-Z]\w*$/.test(s) &&
    !/^[A-Z]{2,}[a-z]\w*$/.test(s);
  const skip = (rel: string) =>
    /(^|\/)server\//.test(rel) ||
    /\.server\.tsx?$/.test(rel) ||
    rel.startsWith("src/routes/api/") ||
    rel.startsWith("src/lib/i18n/") ||
    rel.startsWith("src/lib/analytics/") ||
    rel.endsWith("routeTree.gen.ts") ||
    rel.endsWith(".d.ts") ||
    rel === "src/server.ts" ||
    rel === "src/start.ts";
  const found = new Set<string>();
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    );
  for (const file of walk("src")) {
    const rel = file.replace(/\\/g, "/");
    if (!/\.tsx?$/.test(rel) || skip(rel)) continue;
    const text = readFileSync(file, "utf8");
    const source = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
      if (ts.isJsxAttribute(node) && NO_TEXT_ATTRS.has(node.name.getText(source))) return;
      if (ts.isCallExpression(node) && /^(fetch|require|import|console\.)/.test(node.expression.getText(source))) return;
      if (ts.isJsxText(node)) {
        // JSX text reaches the page with its entities decoded (&rsquo; is ’).
        const s = norm(
          node.text
            .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
            .replace(/&#x([\da-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
            .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name] ?? m),
        );
        if (prose(s)) found.add(s);
      } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const parent = node.parent;
        const isKey =
          (ts.isPropertyAssignment(parent) && parent.name === node) ||
          ts.isElementAccessExpression(parent) ||
          ts.isLiteralTypeNode(parent);
        const s = norm(node.text);
        if (!isKey && prose(s)) found.add(s);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return [...found].sort();
}

function i18nSourcesPlugin() {
  const id = "virtual:i18n-sources";
  const resolved = "\0" + id;
  return {
    name: "ovoa-i18n-sources",
    resolveId: (source: string) => (source === id ? resolved : undefined),
    load: (loaded: string) =>
      loaded === resolved ? `export default ${JSON.stringify(i18nSources())};` : undefined,
  };
}

// `vite build` writes the Cloudflare Worker to .output/ (server/index.mjs and
// public/), which wrangler.site.jsonc deploys.
export default defineConfig(({ command }) => ({
  define: { __ROUTE_LASTMOD__: JSON.stringify(routeLastmod()) },
  plugins: [
    i18nSourcesPlugin(),
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
    // JSX goes through src/lib/i18n/jsx-runtime.ts, which translates its text.
    viteReact({ jsxImportSource: "@/lib/i18n" }),
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
