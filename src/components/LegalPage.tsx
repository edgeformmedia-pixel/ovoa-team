import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";

// The layout for /privacy and /terms: plain reading width, landing colours.
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh overflow-x-clip bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <Link
          to="/early-access"
          className="text-xs text-landing-muted transition-colors hover:text-landing-ink"
        >
          Plans
        </Link>
        <a
          href="mailto:support@ovoa.ai"
          className="text-xs text-landing-muted transition-colors hover:text-landing-ink"
        >
          Contact
        </a>
      </MembershipHeader>
      <article className="mx-auto max-w-[720px] px-5 pb-16 pt-12 sm:px-8 sm:pt-16">
        <h1 className="text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-[1.04]">{title}</h1>
        <p className="mt-3 text-sm text-landing-muted">Last updated {updated}</p>
        <div className="mt-6 text-lg leading-relaxed text-landing-muted">{intro}</div>
        <div className="legal mt-10 space-y-10 text-[15px] leading-relaxed text-landing-muted [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-landing-ink [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-landing-ink [&_li]:mt-2 [&_p]:mt-3 [&_strong]:text-landing-ink [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:font-semibold [&_a]:text-landing-ink [&_a]:underline [&_a]:underline-offset-2">
          {children}
        </div>
      </article>
      <div className="mx-auto max-w-md px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}
