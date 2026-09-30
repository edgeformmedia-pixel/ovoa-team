import { Link } from "@tanstack/react-router";
import { ChevronDown, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TextOvoaLink } from "@/components/TextOvoaLink";
import type { Crumb, Faq } from "@/lib/seo";

// The layout for the pages written to be found: what OVOA does in iMessage,
// websites by text, comparisons and guides. A reading column, the questions the
// page answers (the same ones its FAQPage data lists), a way to start, and
// links to the pages next to it, so search engines and people can walk the site.
export function ContentPage({
  crumbs,
  eyebrow,
  title,
  lede,
  updated,
  children,
  faqs,
  related,
}: {
  crumbs?: Crumb[];
  eyebrow?: string;
  title: string;
  lede: ReactNode;
  updated?: string;
  children: ReactNode;
  faqs?: Faq[];
  related?: { to: string; label: string; blurb: string }[];
}) {
  return (
    <main className="min-h-dvh overflow-x-clip bg-landing-canvas text-landing-ink">
      <MembershipHeader />

      <article className="mx-auto max-w-[760px] px-5 pb-10 pt-10 sm:px-8 sm:pt-14">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-landing-muted">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link to="/" className="hover:text-landing-ink">
                  Home
                </Link>
              </li>
              {crumbs.map((crumb) => (
                <li key={crumb.path} className="flex items-center gap-1.5">
                  <span aria-hidden="true">/</span>
                  <a href={crumb.path} className="hover:text-landing-ink">
                    {crumb.name}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="text-sm font-medium text-landing-muted">{eyebrow}</p>}
        <h1 className="mt-2 text-[clamp(2.25rem,5.5vw,3.5rem)] font-semibold leading-[1.04] tracking-normal">
          {title}
        </h1>
        <div className="mt-5 text-lg leading-relaxed text-landing-muted sm:text-xl">{lede}</div>
        {updated && <p className="mt-4 text-xs text-landing-muted">Updated {updated}</p>}

        <div className="mt-8">
          <TextOvoaLink className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0a84ff] px-6 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5">
            <MessageCircle className="size-5" aria-hidden="true" />
            Text OVOA
          </TextOvoaLink>
        </div>

        <div className="content mt-12 space-y-10 text-[16px] leading-relaxed text-landing-muted [&_a]:font-semibold [&_a]:text-landing-ink [&_a]:underline [&_a]:underline-offset-2 [&_h2]:text-[1.6rem] [&_h2]:font-semibold [&_h2]:leading-tight [&_h2]:text-landing-ink [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-landing-ink [&_li]:mt-2 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_strong]:font-semibold [&_strong]:text-landing-ink [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>

        {faqs && faqs.length > 0 && (
          <section className="mt-16">
            <h2 className="text-[1.6rem] font-semibold leading-tight">Questions</h2>
            <div className="mt-4 divide-y divide-landing-line border-y border-landing-line">
              {faqs.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
                    <h3>{item.q}</h3>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-5 shrink-0 text-landing-muted transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-2 text-[15px] leading-relaxed text-landing-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <section className="mt-16 rounded-3xl bg-landing-control px-6 py-8 text-center sm:px-10">
          <h2 className="text-2xl font-semibold">Try it in Messages.</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-landing-muted">
            Text OVOA like you&rsquo;d text a friend. The first texts are free, with no app and no
            sign-up.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TextOvoaLink className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0a84ff] px-6 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5">
              <MessageCircle className="size-4" aria-hidden="true" />
              Text OVOA
            </TextOvoaLink>
            <Link
              to="/early-access"
              className="inline-flex h-11 items-center rounded-full border border-landing-line px-6 text-sm font-semibold transition-colors hover:border-landing-muted"
            >
              See plans
            </Link>
          </div>
        </section>

        {related && related.length > 0 && (
          <nav aria-label="Related" className="mt-14">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-landing-muted">
              Keep reading
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((item) => (
                <li key={item.to}>
                  <a
                    href={item.to}
                    className="block h-full rounded-2xl border border-landing-line p-4 transition-colors hover:border-landing-muted"
                  >
                    <span className="font-semibold text-landing-ink">{item.label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-landing-muted">
                      {item.blurb}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </article>

      <div className="mx-auto max-w-2xl px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}

// A two-column comparison table that stays readable on a phone.
export function CompareTable({
  columns,
  rows,
}: {
  columns: [string, string];
  rows: { label: string; values: [ReactNode, ReactNode] }[];
}) {
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-landing-line">
      <table className="w-full min-w-[520px] border-collapse text-left text-[14px] leading-snug">
        <thead>
          <tr className="border-b border-landing-line bg-landing-control/60">
            <th scope="col" className="w-[28%] px-4 py-3 font-semibold text-landing-ink">
              <span className="sr-only">Feature</span>
            </th>
            {columns.map((c) => (
              <th key={c} scope="col" className="px-4 py-3 font-semibold text-landing-ink">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-landing-line last:border-b-0">
              <th scope="row" className="px-4 py-3 align-top font-semibold text-landing-ink">
                {row.label}
              </th>
              <td className="px-4 py-3 align-top">{row.values[0]}</td>
              <td className="px-4 py-3 align-top">{row.values[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
