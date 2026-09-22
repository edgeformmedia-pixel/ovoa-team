import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function MembershipHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-landing-line bg-landing-canvas/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          to="/"
          className="text-sm font-semibold tracking-[0.08em] text-landing-ink transition-opacity hover:opacity-65"
        >
          OVOA
        </Link>
        <div className="flex items-center gap-5">{children}</div>
      </div>
    </header>
  );
}
