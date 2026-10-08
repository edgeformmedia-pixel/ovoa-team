import { Link } from "@tanstack/react-router";

import { LanguageMenu } from "@/components/LanguagePrompt";

// Every public page is still linked from here, so search engines (and people)
// can reach each one from any other. The links are grouped under four short
// headings so the footer reads as a list, not a wall of links.
const groups = [
  {
    heading: "Product",
    links: [
      { to: "/text", label: "Text OVOA" },
      { to: "/app", label: "OVOA app" },
      { to: "/fit", label: "OVOA Fit" },
      { to: "/early-access", label: "Plans" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { to: "/imessage", label: "AI in iMessage" },
      { to: "/ai-wristband", label: "How OVOA Fit works" },
      { to: "/websites", label: "Websites by text" },
      { to: "/compare", label: "Compare" },
      { to: "/faq", label: "FAQ" },
    ],
  },
  {
    heading: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/affiliates", label: "Affiliates" },
      { to: "/account", label: "Account" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { to: "/privacy", label: "Privacy" },
      { to: "/terms", label: "Terms" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 w-full border-t border-border/60 pt-8 pb-4">
      <nav
        aria-label="Site"
        className="mx-auto grid max-w-3xl grid-cols-2 gap-x-6 gap-y-6 px-4 text-left sm:grid-cols-4"
      >
        {groups.map((group) => (
          <div key={group.heading}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.heading}
            </p>
            <ul className="mt-2 space-y-1.5">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <p className="mt-6 text-center text-[11px] text-muted-foreground/70">
        OVOA is in beta: the iPhone app comes through TestFlight, and OVOA Fit is beta hardware.
      </p>
      <div className="text-center">
        <LanguageMenu />
      </div>
    </footer>
  );
}
