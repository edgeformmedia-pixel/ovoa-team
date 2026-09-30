import { Link } from "@tanstack/react-router";

import { LanguageMenu } from "@/components/LanguagePrompt";

// Every public page is linked from here, so search engines (and people) can
// reach each one from any other.
const links = [
  { to: "/", label: "Home" },
  { to: "/text", label: "Text OVOA" },
  { to: "/imessage", label: "AI in iMessage" },
  { to: "/websites", label: "Websites by text" },
  { to: "/app", label: "OVOA app" },
  { to: "/fit", label: "OVOA Fit" },
  { to: "/ai-wristband", label: "How OVOA Fit works" },
  { to: "/checkout", label: "Buy OVOA Fit" },
  { to: "/early-access", label: "Plans" },
  { to: "/compare", label: "Compare" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/affiliates", label: "Affiliates" },
  { to: "/account", label: "Account" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 w-full border-t border-border/60 pt-6 pb-2 text-center">
      <nav aria-label="Site" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="mt-3 text-[11px] text-muted-foreground/70">
        OVOA is in beta: the iPhone app comes through TestFlight, and OVOA Fit is beta hardware.
      </p>
      <LanguageMenu />
    </footer>
  );
}
