import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { TextOvoaLink } from "@/components/TextOvoaLink";

export function MembershipHeader({
  children,
  hideText = false,
}: {
  children?: ReactNode;
  hideText?: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-landing-line bg-landing-canvas/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          to="/"
          className="text-sm font-semibold tracking-[0.08em] text-landing-ink transition-opacity hover:opacity-65"
        >
          OVOA
        </Link>
        <div className="flex items-center gap-4 sm:gap-5">
          {children}
          <Link
            to="/early-access"
            className="text-xs text-landing-muted transition-colors hover:text-landing-ink"
          >
            Plans
          </Link>
          <Link
            to="/account"
            className="text-xs text-landing-muted transition-colors hover:text-landing-ink"
          >
            Account
          </Link>
          {!hideText && (
            <TextOvoaLink className="inline-flex h-8 items-center rounded-full bg-landing-action px-3.5 text-xs font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5" />
          )}
        </div>
      </div>
    </header>
  );
}
