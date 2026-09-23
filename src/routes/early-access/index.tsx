import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronDown, LockKeyhole, Minus } from "lucide-react";
import { useState } from "react";
import OvoaIphoneDemo from "@/components/OvoaIphoneDemo";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TASKS_SCRIPT } from "@/lib/demo-scripts";
import { getPlans } from "@/lib/membership/membership.functions";
import {
  FOUNDING_PRICE_LINE,
  PLAN_BLURBS,
  PLAN_FEATURES,
  PLAN_NAMES,
  bandPrice,
  perLabel,
  planOf,
  type FeatureCell,
  type PlanColumn,
} from "@/lib/membership/copy";
import {
  annualSavings,
  formatMoney,
  type BillingPeriod,
  type PaidTier,
  type PlansResult,
} from "@/lib/membership/plans";
import { appJsonLd, breadcrumbs, jsonLd, ogImageMeta } from "@/lib/seo";

const PAGE_TITLE = "OVOA plans: free, Base and Pro";

function describe(data: PlansResult | undefined) {
  const base = planOf(data, "base", "monthly");
  return `OVOA is in beta on iPhone. Health tracking and notes are free. Base turns on the AI assistant for ${perLabel(base)}, and Pro adds hands-free and the background agent.`;
}

export const Route = createFileRoute("/early-access/")({
  component: EarlyAccess,
  staticData: { sitemap: true },
  validateSearch: (
    search: Record<string, unknown>,
  ): { error?: string | undefined; canceled?: boolean | undefined } => ({
    error: typeof search["error"] === "string" ? search["error"] : undefined,
    canceled: search["canceled"] ? true : undefined,
  }),
  loader: () => getPlans(),
  head: ({ loaderData }) => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: describe(loaderData) },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: describe(loaderData) },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ovoa.ai/early-access" },
      ...ogImageMeta,
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/early-access" }],
    scripts: [jsonLd(appJsonLd(loaderData)), jsonLd(breadcrumbs("Plans", "/early-access"))],
  }),
});

const STEPS = [
  {
    title: "Pick a plan",
    copy: "Free costs nothing. Base and Pro are paid by card or Apple Pay through Stripe, and you can cancel anytime.",
  },
  {
    title: "Install through TestFlight",
    copy: "TestFlight is Apple's own app for trying apps before they reach the App Store. We walk you through it.",
  },
  {
    title: "Sign up in OVOA",
    copy: "Use the same email you paid with, and OVOA knows your plan.",
  },
];

function BetaBadge({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${
        onDark
          ? "bg-landing-action text-landing-action-foreground"
          : "border border-landing-action/40 bg-landing-action/10 text-landing-action"
      }`}
    >
      Beta
    </span>
  );
}

function Cell({ value, dark }: { value: FeatureCell; dark: boolean }) {
  if (value === false)
    return (
      <Minus
        aria-label="Not included"
        className={`mt-0.5 size-4 shrink-0 ${dark ? "text-landing-action-foreground/35" : "text-landing-muted/60"}`}
      />
    );
  return (
    <Check
      aria-label="Included"
      className="mt-0.5 size-4 shrink-0 text-landing-action"
      strokeWidth={2.5}
    />
  );
}

function PlanColumnCard({
  column,
  data,
  period,
  enabled,
}: {
  column: PlanColumn;
  data: PlansResult;
  period: BillingPeriod;
  enabled: boolean;
}) {
  const dark = column === "base";
  const muted = dark ? "text-landing-action-foreground/65" : "text-landing-muted";
  const paid = column === "free" ? null : planOf(data, column, period);
  const savings = column === "free" ? null : annualSavings(data.plans, column as PaidTier);

  let price = "$0";
  let per = "forever";
  let terms = "No card. No time limit.";
  if (paid) {
    price = formatMoney(paid.amountCents, paid.currency);
    per = paid.interval === "year" ? "/year" : "/month";
    terms =
      period === "annual" && savings
        ? `Works out to ${formatMoney(savings.perMonthCents, paid.currency)} a month. You save ${formatMoney(savings.saveCents, paid.currency)} a year over paying monthly.`
        : `Billed every ${paid.interval} from today. Cancel anytime.`;
  }

  return (
    <article
      className={`flex flex-col rounded-[1.75rem] p-7 sm:p-8 ${
        dark
          ? "bg-landing-ink text-landing-action-foreground shadow-[0_24px_60px_-24px_var(--landing-shadow)]"
          : "bg-landing-control/70 text-landing-ink"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{PLAN_NAMES[column]}</h3>
        {period === "annual" && savings && (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              dark
                ? "bg-landing-action text-landing-action-foreground"
                : "bg-landing-canvas text-landing-ink"
            }`}
          >
            Save {savings.percent}%
          </span>
        )}
      </div>
      <p className={`mt-1 text-sm ${muted}`}>{PLAN_BLURBS[column]}</p>
      <p className="mt-7 flex items-baseline gap-1.5">
        <span className="text-[2.75rem] font-semibold leading-none tracking-tight">{price}</span>
        <span className={`text-sm ${muted}`}>{per}</span>
      </p>
      <p className={`mt-3 min-h-10 text-sm ${muted}`}>{terms}</p>

      <ul className="mt-6 space-y-2.5">
        {PLAN_FEATURES.map((f) => {
          const value = f[column];
          return (
            <li
              key={f.label}
              className={`flex items-start gap-2.5 text-[14px] leading-snug ${
                value === false ? muted : ""
              }`}
            >
              <Cell value={value} dark={dark} />
              <span>
                {f.label}
                {typeof value === "string" && <span className={muted}>: {value}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-8">
        {column === "free" ? (
          // Without a public link, an account is the way in: Apple emails its
          // TestFlight invite (or, invites off, /account says to ask support).
          <a
            href={data.betaUrl ?? "/account"}
            target={data.betaUrl ? "_blank" : undefined}
            rel={data.betaUrl ? "noreferrer" : undefined}
            className="flex h-12 w-full items-center justify-center rounded-full bg-landing-ink text-sm font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {data.betaUrl ? "Join the free beta" : "Get the free app"}
          </a>
        ) : (
          <form method="post" action="/api/public/billing/checkout">
            <input type="hidden" name="plan" value={paid!.id} />
            <button
              type="submit"
              disabled={!enabled}
              className={`h-12 w-full rounded-full text-sm font-semibold transition-[transform,opacity] hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${
                dark
                  ? "bg-landing-action text-landing-action-foreground"
                  : "bg-landing-ink text-landing-action-foreground"
              }`}
            >
              {enabled ? `Get ${PLAN_NAMES[column]}` : "Opening soon"}
            </button>
          </form>
        )}
      </div>
    </article>
  );
}

function EarlyAccess() {
  const data = Route.useLoaderData();
  const { configured, plans, bandTrialDays } = data;
  const { error, canceled } = Route.useSearch();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const baseMonthly = planOf(data, "base", "monthly");
  const bestSaving = Math.max(
    0,
    ...(["base", "pro"] as const).map((t) => annualSavings(plans, t)?.percent ?? 0),
  );

  const faq = [
    {
      q: "What's free?",
      a: "Health tracking (Apple Health, and heart rate and activity from the Band) and notes. Notes you speak into the Band are written out on your iPhone, so they never need the AI. No card, no time limit.",
    },
    {
      q: "What does Base add?",
      a: `The OVOA assistant: chat and talk to it, and it handles reminders, email, calendar, money questions, memory and a morning brief. Press the Band, ask, and hear the answer. ${perLabel(baseMonthly)}, or ${perLabel(planOf(data, "base", "annual"))}.`,
    },
    {
      q: "What's in Pro?",
      a: `Everything in Base, plus a hands-free wake word so you don't have to press anything, the background agent that runs jobs on its own and reports back, and almost three times as many AI replies a day. ${perLabel(planOf(data, "pro", "monthly"))}, or ${perLabel(planOf(data, "pro", "annual"))}.`,
    },
    {
      q: "Is there a free trial?",
      a: `Not on its own: Base and Pro are paid from the first day, and the free plan is there to try OVOA first. Each OVOA Band comes with ${bandTrialDays} days of Base free.`,
    },
    {
      q: "Is it finished?",
      a: "No. OVOA is in beta: the app, the assistant and the Band. Things can break, and new builds come often. Members tell us what to fix first.",
    },
    {
      q: "How does TestFlight work?",
      a: "TestFlight is Apple's official app for trying iPhone apps before they reach the App Store. Install TestFlight from the App Store, open your OVOA invite or link, and tap Install. OVOA then updates itself as we ship new builds.",
    },
    {
      q: "How do I cancel?",
      a: "Tap Manage billing on your welcome page (bookmark it after checkout), or email support@ovoa.ai and we'll do it for you. You keep your plan until the end of the period you've paid for.",
    },
    {
      q: "What happens when OVOA reaches the App Store?",
      a: "Your plan moves with your account, at the price you joined at. You won't pay twice.",
    },
    { q: "Android?", a: "iPhone only for now." },
    {
      q: "Refunds?",
      a: "If a charge goes through and OVOA isn't for you, email support@ovoa.ai within 14 days and we'll refund it.",
    },
  ];

  const banner =
    error === "not-configured" || (!configured && error)
      ? "Paid plans aren't open yet. Check back very soon."
      : error === "checkout"
        ? "Checkout didn't open. Please try again, or email support@ovoa.ai."
        : canceled
          ? "No problem, nothing was charged."
          : null;

  return (
    <main className="min-h-dvh overflow-x-clip bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <Link
          to="/partners"
          className="hidden text-xs text-landing-muted transition-colors hover:text-landing-ink sm:block"
        >
          Partners
        </Link>
        <Link
          to="/account"
          className="text-xs text-landing-muted transition-colors hover:text-landing-ink"
        >
          Account
        </Link>
        <a
          href="#plans"
          className="inline-flex h-9 items-center rounded-full bg-landing-action px-4 text-xs font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5"
        >
          See plans
        </a>
      </MembershipHeader>

      <section className="px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:pb-28">
        <div className="mx-auto grid max-w-[1200px] items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-sm font-medium">
              <BetaBadge />
              <span className="text-landing-muted">iPhone, through TestFlight</span>
            </p>
            <h1 className="mt-4 text-[clamp(2.6rem,6.5vw,5.25rem)] font-semibold leading-[0.98] tracking-normal">
              Start free. Add the assistant when you want it.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-landing-muted sm:text-xl">
              OVOA is in beta. Health tracking and notes are free. Base turns on the OVOA assistant
              for {perLabel(baseMonthly)}, and Pro adds hands-free and the background agent.
            </p>
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
              <a
                href="#plans"
                className="inline-flex h-12 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-landing-action px-8 text-sm font-semibold text-landing-action-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                See plans
              </a>
              <p className="text-sm text-landing-muted">{FOUNDING_PRICE_LINE}</p>
            </div>
          </div>
          <div className="relative mx-auto w-[min(76vw,300px)]">
            <div
              aria-hidden="true"
              className="absolute inset-x-[-25%] top-[12%] bottom-[8%] rounded-full bg-landing-action/20 blur-3xl"
            />
            <div className="relative">
              <OvoaIphoneDemo script={TASKS_SCRIPT} maxWidth={300} defaultSound={false} />
            </div>
          </div>
        </div>
      </section>

      <section
        id="plans"
        className="scroll-mt-14 border-t border-landing-line px-5 py-20 sm:px-8 sm:py-28"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-sm font-medium text-landing-muted">
                Plans <BetaBadge />
              </p>
              <h2 className="mt-3 text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.02] tracking-normal">
                Pick your plan. Keep the price.
              </h2>
              <p className="mt-3 text-base text-landing-muted">{FOUNDING_PRICE_LINE}</p>
            </div>

            <div
              role="radiogroup"
              aria-label="Billing"
              className="inline-flex self-start rounded-full bg-landing-control p-1 lg:self-auto"
            >
              {(
                [
                  ["monthly", "Monthly"],
                  ["annual", bestSaving > 0 ? `Yearly · save up to ${bestSaving}%` : "Yearly"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={period === value}
                  onClick={() => setPeriod(value)}
                  className={`h-10 rounded-full px-4 text-sm font-semibold transition-colors ${
                    period === value
                      ? "bg-landing-canvas text-landing-ink shadow-sm"
                      : "text-landing-muted hover:text-landing-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {banner && (
            <p
              role="status"
              className="mt-8 rounded-2xl bg-landing-control px-5 py-4 text-sm font-medium"
            >
              {banner}
            </p>
          )}

          <div className="mt-10 grid gap-3 lg:grid-cols-3">
            {(["free", "base", "pro"] as const).map((column) => (
              <PlanColumnCard
                key={column}
                column={column}
                data={data}
                period={period}
                enabled={configured}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-4 rounded-[1.75rem] border border-landing-line p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h3 className="text-lg font-semibold">
                Getting the OVOA Band? {bandTrialDays} days of Base come with it.
              </h3>
              <p className="mt-1 text-sm text-landing-muted">
                The Band is {bandPrice(data)}, one time. You start the free days when you choose,
                Base starts after them, and you can cancel before then.
              </p>
            </div>
            <Link
              to="/checkout"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-landing-line px-6 text-sm font-semibold transition-colors hover:border-landing-muted"
            >
              See the Band
            </Link>
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-sm text-landing-muted">
            <LockKeyhole aria-hidden="true" className="size-3.5" /> Payments by Stripe. We never see
            your card.
          </p>
        </div>
      </section>

      <section className="bg-landing-ink px-5 py-20 text-landing-action-foreground sm:px-8 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-sm font-medium text-landing-action-foreground/60">How it works</p>
          <h2 className="mt-3 max-w-3xl text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.02] tracking-normal">
            On your phone in about two minutes.
          </h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-[1.75rem] bg-landing-action-foreground/12 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="bg-landing-ink p-7 sm:p-8">
                <span className="flex size-9 items-center justify-center rounded-full bg-landing-action text-sm font-semibold">
                  {i + 1}
                </span>
                <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-landing-action-foreground/70">
                  {step.copy}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-medium text-landing-muted">Questions</p>
            <h2 className="mt-3 text-[clamp(2.25rem,4.5vw,3.5rem)] font-semibold leading-[1.04] tracking-normal">
              Good to know.
            </h2>
          </div>
          <div className="divide-y divide-landing-line border-y border-landing-line">
            {faq.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 text-landing-muted transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-landing-muted">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="terms" className="scroll-mt-14 border-t border-landing-line px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-[1200px] text-[13px] leading-relaxed text-landing-muted">
          <h2 className="text-sm font-semibold text-landing-ink">Plan terms, in short</h2>
          <p className="mt-3 max-w-3xl">
            Base and Pro are subscriptions to the OVOA service, billed monthly or yearly from the
            day you sign up until you cancel. A plan that comes with an OVOA Band starts after its{" "}
            {bandTrialDays} free days, which begin when you start them, unless you cancel first.
            Cancel anytime from Manage billing or by emailing support@ovoa.ai; you keep your plan
            until the end of the period you paid for. OVOA is beta software delivered through Apple
            TestFlight, and features can change. Refunds: email support@ovoa.ai within 14 days of a
            charge. Prices are in US dollars; taxes may apply. The full{" "}
            <Link to="/terms" className="underline underline-offset-2 hover:text-landing-ink">
              terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-landing-ink">
              privacy policy
            </Link>{" "}
            apply.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-md px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}
