import { createFileRoute, Link } from "@tanstack/react-router";
import bandFront from "@/assets/product/band-front-cutout.webp";
import bandSensors from "@/assets/product/band-sensors-cutout.webp";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPlans } from "@/lib/membership/membership.functions";
import { breadcrumbs, jsonLd, ogImageMeta } from "@/lib/seo";

const PAGE_TITLE = "OVOA Fit: the AI wristband you talk to";
const PAGE_DESCRIPTION =
  "The OVOA Fit is a woven wristband you talk to: press to ask for a task, double-tap to save a note, or set a standing rule. Heart rate, motion, mic and buzzes.";

export const Route = createFileRoute("/ai-wristband")({
  component: WristbandPage,
  staticData: { sitemap: true },
  loader: () => getPlans(),
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ovoa.ai/ai-wristband" },
      ...ogImageMeta,
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/ai-wristband" }],
    scripts: [jsonLd(breadcrumbs("The AI wristband", "/ai-wristband"))],
  }),
});

const MODES = [
  { word: "One tap", line: "Command your AI agents." },
  { word: "Double tap", line: "Take a note, word for word." },
  { word: "Standing rules", line: "Things that keep happening on their own." },
];

const BUZZES: { pattern: ("short" | "long")[]; meaning: string }[] = [
  { pattern: ["short"], meaning: "Heard you" },
  { pattern: ["short", "short"], meaning: "On it" },
  { pattern: ["short", "short", "short"], meaning: "Needs your answer" },
  { pattern: ["long"], meaning: "Done" },
];

const SPECS = [
  "Heart rate",
  "Motion",
  "Microphone",
  "Vibration",
  "Water-resistant",
  "All-day battery",
];

const buyDark =
  "inline-flex h-14 items-center justify-center rounded-full bg-landing-action-foreground px-10 text-base font-semibold text-landing-ink transition-transform hover:-translate-y-0.5";

function WristbandPage() {
  const data = Route.useLoaderData();
  return (
    <main className="min-h-dvh overflow-x-clip bg-landing-canvas text-landing-ink">
      <MembershipHeader />

      <section className="px-6 pb-6 pt-20 text-center sm:pt-28">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-landing-muted">
          OVOA Fit
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.75rem,8vw,6rem)] font-semibold leading-[0.97] tracking-tight">
          A wristband you talk to.
        </h1>
        <p className="mx-auto mt-6 max-w-md text-lg text-landing-muted sm:text-xl">
          One button. Your AI agents, notes and health, on your wrist.
        </p>
        <div className="relative mx-auto mt-8 aspect-[4/3] w-full max-w-3xl">
          <div
            aria-hidden="true"
            className="absolute inset-[18%] rounded-full bg-landing-action/20 blur-[90px]"
          />
          <img
            src={bandFront}
            alt="The OVOA Fit, a black woven AI wristband with sensor light and side button"
            className="relative size-full object-contain drop-shadow-[0_40px_50px_rgba(0,0,0,0.25)]"
          />
        </div>
      </section>

      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-3">
          {MODES.map(({ word, line }) => (
            <div key={word} className="text-center sm:text-left">
              <p className="text-3xl font-semibold">{word}</p>
              <p className="mt-2 text-landing-muted">{line}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-landing-ink px-6 py-28 text-center text-landing-action-foreground sm:py-36">
        <h2 className="text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-[1.02] tracking-tight">
          No screen needed.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-lg text-landing-action-foreground/60">
          A buzz tells you where things stand.
        </p>
        <div className="mx-auto mt-12 grid max-w-2xl gap-px overflow-hidden rounded-3xl bg-landing-action-foreground/12 text-left sm:grid-cols-2">
          {BUZZES.map((buzz) => (
            <div key={buzz.meaning} className="flex items-center gap-5 bg-landing-ink p-6">
              <span aria-hidden="true" className="flex w-16 shrink-0 items-center gap-1.5">
                {buzz.pattern.map((kind, i) => (
                  <span
                    key={i}
                    className={`h-2.5 rounded-full bg-landing-action ${kind === "long" ? "w-9" : "w-2.5"}`}
                  />
                ))}
              </span>
              <span className="text-lg font-medium">{buzz.meaning}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <img
            src={bandSensors}
            alt="Underside of the OVOA Fit showing the rear heart rate sensors and clasp"
            loading="lazy"
            className="mx-auto aspect-square w-full max-w-md object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.2)]"
          />
          <div>
            <h2 className="text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.02] tracking-tight">
              Built to disappear.
            </h2>
            <ul className="mt-8 flex flex-wrap gap-3">
              {SPECS.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-landing-line px-5 py-2.5 font-medium"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-landing-ink px-6 py-28 text-center text-landing-action-foreground sm:py-36">
        <h2 className="text-[clamp(2.5rem,7vw,5.5rem)] font-semibold leading-[0.98] tracking-tight">
          Meet OVOA Fit.
        </h2>
        <p className="mt-5 text-lg text-landing-action-foreground/60">
          {data.bandTrialDays} days of the assistant included.
        </p>
        <Link to="/checkout" data-track="Buy OVOA Fit (wristband)" className={`mt-10 ${buyDark}`}>
          Buy
        </Link>
      </section>

      <div className="mx-auto max-w-md px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}
