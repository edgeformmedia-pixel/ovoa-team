import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronDown, LockKeyhole } from "lucide-react";
import OvoaIphoneDemo from "@/components/OvoaIphoneDemo";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TASKS_SCRIPT } from "@/lib/demo-scripts";
import { getPlans } from "@/lib/membership/membership.functions";
import { annualSavings, formatMoney, type PlanId, type PublicPlan } from "@/lib/membership/plans";

const OG_IMAGE = "https://ovoa.ai/og-band.jpg";
const PAGE_TITLE = "OVOA early access — get the iPhone app today";
const PAGE_DESCRIPTION =
  "OVOA is in private beta on iPhone. Founding members get the full app today and keep their founding price. Start with a 7-day free trial.";

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
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "product" },
      { property: "og:url", content: "https://ovoa.ai/early-access" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/early-access" }],
  }),
});

const PLAN_COPY: Record<PlanId, { name: string; blurb: string }> = {
  base_monthly: { name: "Base", blurb: "Every OVOA AI feature, month to month." },
  base_annual: { name: "Base, yearly", blurb: "Every OVOA AI feature, a year at a time." },
  pro_monthly: { name: "Pro", blurb: "Hands-free wake word, the background agent, more replies." },
  pro_annual: { name: "Pro, yearly", blurb: "Everything in Pro, a year at a time." },
};

const INCLUDED = [
  "The full OVOA app on your iPhone, today",
  "Tasks, standing rules, memory and health",
  "Every new build the day it ships",
  "A direct line to the team building it",
  "Your founding price, kept while you're a member",
];

const STEPS = [
  {
    title: "Start your free trial",
    copy: "Pick a plan and check out with card or Apple Pay. Nothing is charged for 7 days.",
  },
  {
    title: "Install through TestFlight",
    copy: "TestFlight is Apple's own app for beta software. We walk you through it right after checkout.",
  },
  {
    title: "Talk to OVOA",
    copy: "Sign up in the app with the same email and start handing things off.",
  },
];

const FAQ = [
  {
    q: "What's TestFlight?",
    a: "Apple's official app for trying iPhone apps before they reach the App Store. You install TestFlight from the App Store, tap your invite, and OVOA installs like any other app. It updates itself as we ship new builds.",
  },
  {
    q: "Will I be charged during the trial?",
    a: "No. Monthly and annual plans start with 7 free days. Stripe emails you before the trial ends, and if you cancel before then you pay nothing.",
  },
  {
    q: "How do I cancel?",
    a: "Tap Manage billing on your welcome page (bookmark it after checkout) and cancel there, or email support@ovoa.ai and we'll do it for you. You keep access until the end of the period you've paid for.",
  },
  {
    q: "What happens when OVOA reaches the App Store?",
    a: "Your membership moves with your account. You'll switch to the App Store version and keep your founding price. You won't pay twice.",
  },
  {
    q: "Is it finished?",
    a: "Not yet, and that's the point. It's a beta: things can break, and you'll see new builds often. Members tell us what to fix first.",
  },
  {
    q: "Android?",
    a: "iPhone only for now.",
  },
  {
    q: "Refunds?",
    a: "If a charge goes through and OVOA isn't for you, email support@ovoa.ai within 14 days and we'll refund it.",
  },
];

function priceLine(plan: PublicPlan) {
  const price = formatMoney(plan.amountCents, plan.currency);
  if (plan.interval === "month") return { price, per: "/month" };
  if (plan.interval === "year") return { price, per: "/year" };
  return { price, per: "once" };
}

function PlanCard({
  plan,
  trialDays,
  enabled,
  highlight,
  badge,
  note,
}: {
  plan: PublicPlan;
  trialDays: number;
  enabled: boolean;
  highlight: boolean;
  badge?: string | undefined;
  note?: string | undefined;
}) {
  const copy = PLAN_COPY[plan.id];
  const { price, per } = priceLine(plan);
  const recurring = plan.interval !== null;
  const cta = recurring && trialDays > 0 ? `Start ${trialDays}-day free trial` : `Buy for ${price}`;
  const terms = recurring
    ? `${trialDays > 0 ? `${trialDays} days free, then ` : ""}${price} a ${plan.interval}. Cancel anytime.`
    : `${price} once. No subscription.`;

  return (
    <article
      className={`relative flex flex-col rounded-[1.75rem] p-7 sm:p-8 ${
        highlight
          ? "order-first bg-landing-ink text-landing-action-foreground shadow-[0_24px_60px_-24px_var(--landing-shadow)] lg:order-none"
          : "bg-landing-control/70 text-landing-ink"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{copy.name}</h3>
        {badge && (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              highlight
                ? "bg-landing-action text-landing-action-foreground"
                : "bg-landing-canvas text-landing-ink"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <p
        className={`mt-1 text-sm ${highlight ? "text-landing-action-foreground/65" : "text-landing-muted"}`}
      >
        {copy.blurb}
      </p>
      <p className="mt-7 flex items-baseline gap-1.5">
        <span className="text-[2.75rem] font-semibold leading-none tracking-tight">{price}</span>
        <span
          className={`text-sm ${highlight ? "text-landing-action-foreground/65" : "text-landing-muted"}`}
        >
          {per}
        </span>
      </p>
      <p
        className={`mt-3 min-h-10 text-sm ${highlight ? "text-landing-action-foreground/75" : "text-landing-muted"}`}
      >
        {note ?? terms}
      </p>

      <form method="post" action="/api/public/billing/checkout" className="mt-auto pt-7">
        <input type="hidden" name="plan" value={plan.id} />
        <button
          type="submit"
          disabled={!enabled}
          className={`h-12 w-full rounded-full text-sm font-semibold transition-[transform,opacity] hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${
            highlight
              ? "bg-landing-action text-landing-action-foreground"
              : "bg-landing-ink text-landing-action-foreground"
          }`}
        >
          {enabled ? cta : "Opening soon"}
        </button>
      </form>
      {note && (
        <p
          className={`mt-3 text-center text-[11px] ${highlight ? "text-landing-action-foreground/55" : "text-landing-muted"}`}
        >
          {terms}
        </p>
      )}
    </article>
  );
}

function EarlyAccess() {
  const { configured, plans, trialDays } = Route.useLoaderData();
  const { error, canceled } = Route.useSearch();
  const savings = annualSavings(plans, "base");

  const byId = (id: PlanId) => plans.find((p) => p.id === id);
  const monthly = byId("base_monthly");
  const annual = byId("base_annual");
  const pro = byId("pro_monthly");

  const banner =
    error === "not-configured" || (!configured && error)
      ? "Memberships aren't open yet. Check back very soon."
      : error === "checkout"
        ? "Checkout didn't open. Please try again, or email support@ovoa.ai."
        : canceled
          ? "No problem, nothing was charged. Your trial is here whenever you're ready."
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
        <a
          href="#plans"
          className="inline-flex h-9 items-center rounded-full bg-landing-action px-4 text-xs font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5"
        >
          {trialDays > 0 ? "Try it free" : "Get OVOA"}
        </a>
      </MembershipHeader>

      <section className="px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:pb-28">
        <div className="mx-auto grid max-w-[1200px] items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div className="max-w-2xl">
            <p className="text-sm font-medium">
              <span className="text-landing-action">Early access</span>
              <span className="text-landing-muted"> · iPhone</span>
            </p>
            <h1 className="mt-4 text-[clamp(2.6rem,6.5vw,5.25rem)] font-semibold leading-[0.98] tracking-normal">
              Get OVOA before the App Store does.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-landing-muted sm:text-xl">
              OVOA is in private beta. Founding members get the full iPhone app today through
              TestFlight, Apple&rsquo;s beta app, and keep their founding price for as long as they
              stay.
            </p>
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
              <a
                href="#plans"
                className="inline-flex h-12 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-landing-action px-8 text-sm font-semibold text-landing-action-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {trialDays > 0 ? `Start your ${trialDays}-day free trial` : "See plans"}
              </a>
              <p className="text-sm text-landing-muted">
                No charge during the trial. Cancel in two taps.
              </p>
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
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-landing-muted">Founding plans</p>
            <h2 className="mt-3 text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.02] tracking-normal">
              Pick your plan. Keep the price.
            </h2>
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
            {monthly && (
              <PlanCard
                plan={monthly}
                trialDays={trialDays}
                enabled={configured}
                highlight={false}
              />
            )}
            {annual && (
              <PlanCard
                plan={annual}
                trialDays={trialDays}
                enabled={configured}
                highlight
                badge={savings ? `Save ${savings.percent}%` : "Best value"}
                note={
                  savings
                    ? `Works out to ${formatMoney(savings.perMonthCents, annual.currency)} a month. ${formatMoney(savings.saveCents, annual.currency)} less than paying monthly.`
                    : undefined
                }
              />
            )}
            {pro && (
              <PlanCard plan={pro} trialDays={trialDays} enabled={configured} highlight={false} />
            )}
          </div>

          <div className="mt-10 grid gap-8 rounded-[1.75rem] border border-landing-line p-7 sm:p-9 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h3 className="text-xl font-semibold">Every plan includes</h3>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-landing-muted">
                <LockKeyhole aria-hidden="true" className="size-3.5" /> Payments by Stripe. We never
                see your card.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[15px] font-medium">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-landing-action"
                    strokeWidth={2.5}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
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
            {FAQ.map((item) => (
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
          <h2 className="text-sm font-semibold text-landing-ink">Membership terms</h2>
          <p className="mt-3 max-w-3xl">
            An OVOA membership is a subscription to the OVOA service. Monthly and annual plans start
            with a {trialDays}-day free trial and a card on file; unless you cancel before the trial
            ends, your card is charged the plan price and then again every month or year until you
            cancel. You can cancel anytime from Manage billing on your welcome page or by emailing
            support@ovoa.ai, and you keep access until the end of the period you paid for. The
            Founder plan is a single payment with no renewals. The iPhone app is pre-release
            software provided through Apple TestFlight; features can change and it may not always
            work as expected. Refunds: email support@ovoa.ai within 14 days of a charge. Prices are
            in US dollars; taxes may apply.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-md px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}
