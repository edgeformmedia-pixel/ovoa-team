import { useEffect, useState } from "react";

import {
  LANG_ASK,
  LANG_COOKIE,
  LANG_NAMES,
  LANGS,
  currentLang,
  isLang,
  langPath,
  splitLangPath,
  type Lang,
} from "@/lib/i18n/langs";

// ovoa.ai in the visitor's language (src/lib/i18n). The Worker says which
// language their browser (or, failing that, their country) reads; someone on a
// page in another one is asked once, in their language, and the answer is
// remembered (the ovoa_lang cookie) and never asked again. The footer's menu
// changes it any time.

type Boot = { lang: Lang; suggest: Lang; chosen: Lang | null };

const boot = (): Boot | undefined =>
  (globalThis as { __OVOA_I18N__?: Boot }).__OVOA_I18N__;

/** Remembers `lang` and opens this page in it. */
export function chooseLang(lang: Lang) {
  try {
    document.cookie = `${LANG_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // No cookies: the page still changes, just isn't remembered.
  }
  const { path } = splitLangPath(location.pathname);
  const target = langPath(lang, path) + location.search + location.hash;
  if (target !== location.pathname + location.search + location.hash) location.href = target;
}

export function LanguagePrompt() {
  const [ask, setAsk] = useState<Lang | null>(null);

  useEffect(() => {
    const b = boot();
    if (b && !b.chosen && isLang(b.suggest) && b.suggest !== b.lang) setAsk(b.suggest);
  }, []);

  if (!ask) return null;
  const words = LANG_ASK[ask];
  const stay = () => {
    chooseLang(currentLang());
    setAsk(null);
  };

  return (
    <div
      translate="no"
      lang={ask}
      role="dialog"
      aria-label={words.q}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur sm:bottom-5"
    >
      <p translate="no" className="flex-1 text-sm font-medium text-foreground">
        {words.q}
      </p>
      <button
        type="button"
        translate="no"
        onClick={() => chooseLang(ask)}
        className="rounded-full bg-[#0a84ff] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
      >
        {words.yes}
      </button>
      <button
        type="button"
        translate="no"
        onClick={stay}
        className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        {words.no}
      </button>
    </div>
  );
}

/** The footer's language menu. */
export function LanguageMenu() {
  const lang = currentLang();
  return (
    <label translate="no" className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span translate="no" aria-hidden>
        🌐
      </span>
      <select
        translate="no"
        aria-label="Language"
        value={lang}
        onChange={(e) => isLang(e.target.value) && chooseLang(e.target.value)}
        className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-muted-foreground"
      >
        {LANGS.map((l) => (
          <option key={l} value={l} translate="no">
            {LANG_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
