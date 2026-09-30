// Every element the site's own code renders passes through here (the JSX
// runtime in jsx-runtime.ts wraps React's), so text written in English in the
// code comes out in the page's language without touching the pages. Only text
// that is in the code is ever translated: the dictionary holds nothing else,
// so names, messages and other data pass through as they are.
//
// globalThis.__ovoaT does the lookup: server/index.ts sets it per request, the
// browser gets it from /api/i18n/<lang>.js. With neither, nothing changes.

type T = (text: string) => string;

const ATTRS = ["placeholder", "title", "alt", "aria-label"] as const;
const SKIP = new Set(["script", "style", "code", "pre", "textarea"]);

const lookup = (): T | undefined => (globalThis as { __ovoaT?: T }).__ovoaT;

function mapChild(child: unknown, t: T): unknown {
  if (typeof child === "string") return t(child);
  if (Array.isArray(child)) {
    let changed = false;
    const out = child.map((c) => {
      const n = mapChild(c, t);
      if (n !== c) changed = true;
      return n;
    });
    return changed ? out : child;
  }
  return child;
}

export function translateProps(type: unknown, props: Record<string, unknown> | null) {
  const t = lookup();
  if (!t || props == null) return props;
  if (typeof type === "string" && (SKIP.has(type) || props["translate"] === "no")) return props;
  let out = props;
  if ("children" in props) {
    const children = mapChild(props["children"], t);
    if (children !== props["children"]) out = { ...out, children };
  }
  if (typeof type === "string") {
    for (const attr of ATTRS) {
      const v = props[attr];
      if (typeof v !== "string") continue;
      const n = t(v);
      if (n !== v) out = out === props ? { ...props, [attr]: n } : Object.assign(out, { [attr]: n });
    }
  }
  return out;
}

/** One piece of text in the page's language (for strings outside JSX). */
export const tr = (text: string) => lookup()?.(text) ?? text;
