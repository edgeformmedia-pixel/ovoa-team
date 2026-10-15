import { Link } from "@tanstack/react-router";

import { LanguageMenu } from "@/components/LanguagePrompt";

// The few pages a band buyer needs. The Text OVOA, app and compare pages still
// work at their own addresses (and in the sitemap) but are not linked.
const links = [
  { to: "/", label: "OVOA Fit" },
  { to: "/ai-wristband", label: "How it works" },
  { to: "/checkout", label: "Buy" },
  { to: "/faq", label: "FAQ" },
  { to: "/about", label: "About" },
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
        OVOA Fit is beta hardware.
      </p>
      <LanguageMenu />
    </footer>
  );
}
