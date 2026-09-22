import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Home" },
  { to: "/early-access", label: "Early access" },
  { to: "/checkout", label: "Checkout" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/partners", label: "Partners" },
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
        Band by Ovoa AI — a woven wristband you talk to.
      </p>
    </footer>
  );
}
