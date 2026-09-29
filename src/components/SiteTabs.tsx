import { Link, useRouterState } from "@tanstack/react-router";

// The three things OVOA is, as tabs: the iMessage bot (the front door), the
// iPhone app, and OVOA Fit. Every page's header carries them; the tab for the
// section you're in is underlined.
const TABS = [
  { to: "/", label: "Text OVOA", match: ["/", "/text", "/imessage", "/websites", "/compare"] },
  { to: "/app", label: "OVOA app", match: ["/app"] },
  { to: "/fit", label: "OVOA Fit", match: ["/fit", "/ai-wristband", "/checkout"] },
] as const;

function isIn(pathname: string, match: readonly string[]) {
  return match.some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
}

export function SiteTabs({ tone = "landing" }: { tone?: "landing" | "plain" }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const idle = tone === "plain" ? "text-neutral-500" : "text-landing-muted";
  const active = tone === "plain" ? "text-[#060606]" : "text-landing-ink";
  return (
    <nav aria-label="Sections" className="flex items-center gap-1 sm:gap-2">
      {TABS.map((tab) => {
        const on = isIn(pathname, tab.match);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={on ? "page" : undefined}
            className={`relative rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-70 sm:text-[13px] ${
              on ? `${active} bg-black/[0.06] dark:bg-white/10` : idle
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
