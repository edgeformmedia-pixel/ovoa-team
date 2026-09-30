import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

import { LANGS, currentLang, isPagePath, langPath, splitLangPath } from "./lib/i18n/langs";
import { tr } from "./lib/i18n/translate";

const SITE = "https://ovoa.ai";
const TRANSLATED_META = new Set([
  "description",
  "og:title",
  "og:description",
  "og:image:alt",
  "twitter:title",
  "twitter:description",
  "twitter:image:alt",
]);
const OG_LOCALE = { en: "en_US", es: "es_ES", pt: "pt_BR", fr: "fr_FR", de: "de_DE" } as const;

type Meta = { title?: string; name?: string; property?: string; content?: string };
type LinkTag = { rel?: string; href?: string; hrefLang?: string };
type Head = { meta?: Meta[]; links?: LinkTag[] };

// A page's head in the page's language: its title and descriptions translated,
// its canonical address in the language, and hreflang links to every language.
function translateHead(head: Head | undefined): Head | undefined {
  if (!head) return head;
  const lang = currentLang();
  const inLang = (href: string) => {
    if (!href.startsWith(SITE)) return href;
    const path = href.slice(SITE.length) || "/";
    return SITE + langPath(lang, path);
  };
  const meta = head.meta?.map((m) => {
    if (m.title) return { ...m, title: tr(m.title) };
    const key = m.name ?? m.property;
    if (key === "og:locale") return { ...m, content: OG_LOCALE[lang] };
    if (key === "og:url" && m.content) return { ...m, content: inLang(m.content) };
    if (key && TRANSLATED_META.has(key) && m.content) return { ...m, content: tr(m.content) };
    return m;
  });
  let links = head.links;
  const canonical = links?.find((l) => l.rel === "canonical")?.href;
  if (links && canonical?.startsWith(SITE)) {
    const path = canonical.slice(SITE.length) || "/";
    links = [
      ...links.map((l) => (l.rel === "canonical" && l.href ? { ...l, href: inLang(l.href) } : l)),
      ...LANGS.map((l) => ({ rel: "alternate", hrefLang: l, href: SITE + langPath(l, path) })),
      { rel: "alternate", hrefLang: "x-default", href: SITE + path },
    ];
  }
  return { ...head, ...(meta ? { meta } : {}), ...(links ? { links } : {}) };
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // ovoa.ai/es/fit is /fit in Spanish: the routes never see the language
    // prefix, and every link keeps the page's language (src/lib/i18n).
    rewrite: {
      input: ({ url }) => {
        const { lang, path } = splitLangPath(url.pathname);
        if (lang === "en") return undefined;
        url.pathname = path;
        return url;
      },
      output: ({ url }) => {
        const lang = currentLang();
        if (lang === "en" || !isPagePath(url.pathname)) return undefined;
        if (splitLangPath(url.pathname).lang !== "en") return undefined;
        url.pathname = langPath(lang, url.pathname);
        return url;
      },
    },
  });

  // The routes are shared by every router the server makes, so each head is
  // wrapped once.
  type HeadFn = ((ctx: unknown) => unknown) & { translated?: true };
  for (const route of Object.values(router.routesById) as { options: { head?: HeadFn } }[]) {
    const head = route.options.head;
    if (!head || head.translated) continue;
    const wrapped: HeadFn = (ctx) => {
      const out = head(ctx);
      return out instanceof Promise
        ? out.then((h) => translateHead(h as Head))
        : translateHead(out as Head);
    };
    wrapped.translated = true;
    route.options.head = wrapped;
  }

  return router;
};
