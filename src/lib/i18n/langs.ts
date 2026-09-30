// The languages ovoa.ai is shown in. English is the source: every other
// language lives under its own prefix (ovoa.ai/es/fit) and is translated from
// the English text in the code (see translate.ts and server/index.ts).

export const LANGS = ["en", "es", "pt", "fr", "de"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_COOKIE = "ovoa_lang";

export const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);

/** Each language in its own words, for the footer's menu. */
export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
};

/** The question asked of someone whose browser or country says another language. */
export const LANG_ASK: Record<Lang, { q: string; yes: string; no: string }> = {
  en: { q: "View OVOA in English?", yes: "Yes", no: "No, stay" },
  es: { q: "¿Ver OVOA en español?", yes: "Sí", no: "No, English" },
  pt: { q: "Ver o OVOA em português?", yes: "Sim", no: "No, English" },
  fr: { q: "Voir OVOA en français ?", yes: "Oui", no: "No, English" },
  de: { q: "OVOA auf Deutsch ansehen?", yes: "Ja", no: "No, English" },
};

// When the browser gives no usable language: where people mostly read which one.
const COUNTRY_LANG: Record<string, Lang> = {
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es",
  GT: "es", CU: "es", BO: "es", DO: "es", HN: "es", PY: "es", SV: "es", NI: "es",
  CR: "es", PA: "es", UY: "es", PR: "es",
  BR: "pt", PT: "pt", AO: "pt", MZ: "pt",
  FR: "fr", BE: "fr", SN: "fr", CI: "fr", MC: "fr", LU: "fr",
  DE: "de", AT: "de", CH: "de", LI: "de",
};

/** The language to offer: the browser's first known language, else the country's. */
export function detectLang(acceptLanguage: string | null, country: string | null): Lang {
  const prefs = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.slice(0, 2).toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((p) => p.lang && p.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const p of prefs) if (isLang(p.lang)) return p.lang;
  if (prefs.length === 0 && country && COUNTRY_LANG[country]) return COUNTRY_LANG[country];
  return "en";
}

/** The language a path is in, and the path without its prefix. */
export function splitLangPath(pathname: string): { lang: Lang; path: string } {
  const m = /^\/([a-z]{2})(?=\/|$)/.exec(pathname);
  if (m && m[1] !== "en" && isLang(m[1])) {
    return { lang: m[1], path: pathname.slice(3) || "/" };
  }
  return { lang: "en", path: pathname };
}

/** A path in a language: /fit → /es/fit, / → /es. */
export function langPath(lang: Lang, path: string): string {
  if (lang === "en") return path;
  return `/${lang}${path === "/" ? "" : path}`;
}

/** Paths that are never translated: the API, server functions and files. */
export const isPagePath = (path: string) => !/^\/(api\/|_)/.test(path) && !path.includes(".");

/** Whitespace-insensitive key a piece of text is stored under. */
export const normText = (s: string) => s.replace(/\s+/g, " ").trim();

/** Whether a piece of text is worth translating (has letters, isn't a URL or code). */
export const isTranslatable = (key: string) =>
  key.length > 1 &&
  key.length <= 2000 &&
  /\p{L}{2}/u.test(key) &&
  !/^(https?:|mailto:|sms:|tel:|\/|#|@)/.test(key) &&
  !/^[\w.-]+@[\w.-]+$/.test(key);

/** The current page language, on the server (per request) or in the browser. */
export function currentLang(): Lang {
  const g = globalThis as { __ovoaLang?: () => Lang };
  return g.__ovoaLang?.() ?? "en";
}
