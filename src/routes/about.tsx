import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Battery,
  Droplets,
  HeartPulse,
  type LucideIcon,
  Mic,
  Move,
  Repeat,
  CalendarCheck,
  NotebookPen,
  Vibrate,
} from "lucide-react";
import bandFront from "@/assets/product/band-front-cutout.png";
import bandSensors from "@/assets/product/band-sensors-cutout.png";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPlans } from "@/lib/membership/membership.functions";
import { bandPrice } from "@/lib/membership/copy";

const OG_IMAGE = "https://ovoa.ai/og-band.jpg";
const PAGE_TITLE = "About Band: the AI wristband you talk to";
const PAGE_DESCRIPTION =
  "The OVOA Band is a woven wristband you talk to. Ask it to do a task, double-tap to save a note word for word, or set a standing rule that keeps running. Heart rate and motion sensing, microphone, vibration motor. Beta hardware.";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  staticData: { sitemap: true },
  loader: () => getPlans(),
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ovoa.ai/about" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/about" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://ovoa.ai/" },
            { "@type": "ListItem", position: 2, name: "About", item: "https://ovoa.ai/about" },
          ],
        }),
      },
    ],
  }),
});

const MODES: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: CalendarCheck,
    title: "Tasks",
    copy: "Ask once, out loud or in the app, and Band goes and does it. You get a buzz and a plain-English result when it's done, or when it needs you.",
  },
  {
    icon: NotebookPen,
    title: "Notes",
    copy: "Double-tap the button and speak. The note is saved word for word, searchable in the app, with a title Band writes for you.",
  },
  {
    icon: Repeat,
    title: "Standing rules",
    copy: "Some requests shouldn't happen once. They should keep happening. Band turns them into rules that run in the background and reports every time they fire.",
  },
];

const BUZZES: { pattern: ("short" | "long")[]; label: string; meaning: string }[] = [
  { pattern: ["short"], label: "One short", meaning: "Heard you" },
  { pattern: ["short", "short"], label: "Two short", meaning: "Accepted the task" },
  { pattern: ["short", "short", "short"], label: "Three short", meaning: "Needs your answer" },
  { pattern: ["long"], label: "One long", meaning: "Done" },
  { pattern: ["long", "long"], label: "Two long", meaning: "Couldn't finish" },
];

const HARDWARE: { icon: LucideIcon; title: string; copy: string }[] = [
  { icon: HeartPulse, title: "Heart rate", copy: "Continuous, in the background" },
  { icon: Move, title: "Motion", copy: "Activity sensing all day" },
  { icon: Mic, title: "Microphone", copy: "For voice requests and notes" },
  { icon: Vibrate, title: "Vibration motor", copy: "Answers you can feel" },
  { icon: Droplets, title: "Woven strap", copy: "Water resistant" },
  { icon: Battery, title: "Battery", copy: "Lasts all day" },
];

function AboutPage() {
  const data = Route.useLoaderData();
  const band = bandPrice(data);
  return (
    <main className="min-h-dvh overflow-x-clip bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <Link
          to="/checkout"
          className="inline-flex h-9 items-center rounded-full bg-landing-action px-4 text-xs font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5"
        >
          Buy Band
        </Link>
      </MembershipHeader>

      <section className="px-6 py-16 sm:px-10 sm:py-24 lg:px-14">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="max-w-xl lg:pr-10">
            <p className="text-sm font-medium text-landing-muted">About Band</p>
            <h1 className="mt-3 text-[clamp(2.75rem,6vw,5.5rem)] font-semibold leading-[1] tracking-normal">
              A wristband you talk to.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-landing-muted sm:text-xl">
              Band is a woven wristband you talk to. Say or type what you want and it goes and does
              it: a task, a note kept word for word, or a standing rule that keeps running in the
              background.
            </p>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
            <div
              aria-hidden="true"
              className="absolute inset-[12%] rounded-full bg-landing-action/20 blur-3xl"
            />
            <img
              src={bandFront}
              alt="Band, a black woven AI wristband with sensor light and side button"
              className="relative size-full object-contain"
            />
          </div>
        </div>
      </section>

      <section className="bg-landing-control/55 px-6 py-20 sm:px-10 sm:py-28 lg:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-landing-muted">How it works</p>
            <h2 className="mt-3 text-[clamp(2.25rem,4.5vw,4.5rem)] font-semibold leading-[1.04] tracking-normal">
              Three ways to ask.
            </h2>
          </div>
          <div className="mt-12 grid gap-3 lg:grid-cols-3">
            {MODES.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="rounded-[1.75rem] bg-landing-canvas p-7 sm:p-8">
                <Icon aria-hidden="true" className="size-7 stroke-[1.6] text-landing-action" />
                <h3 className="mt-6 text-2xl font-semibold tracking-normal">{title}</h3>
                <p className="mt-2 text-base leading-relaxed text-landing-muted sm:text-lg">
                  {copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-landing-ink px-6 py-24 text-center text-landing-action-foreground sm:py-32">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-medium text-landing-action-foreground/60">
            What the buzzes mean
          </p>
          <h2 className="mt-4 text-[clamp(2.25rem,5vw,4.5rem)] font-semibold leading-[1.02] tracking-normal">
            No screen needed.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-landing-action-foreground/70 sm:text-xl">
            You never have to look at a screen to know where things stand.
          </p>
          <div className="mx-auto mt-12 grid max-w-3xl gap-px overflow-hidden rounded-[1.75rem] bg-landing-action-foreground/12 text-left sm:grid-cols-2">
            {BUZZES.map((buzz) => (
              <div
                key={buzz.meaning}
                className="flex items-center gap-5 bg-landing-ink p-6 sm:last:col-span-2"
              >
                <span aria-hidden="true" className="flex w-20 shrink-0 items-center gap-1.5">
                  {buzz.pattern.map((kind, i) => (
                    <span
                      key={i}
                      className={`h-2.5 rounded-full bg-landing-action ${kind === "long" ? "w-9" : "w-2.5"}`}
                    />
                  ))}
                </span>
                <span>
                  <span className="block text-sm text-landing-action-foreground/55">
                    {buzz.label}
                  </span>
                  <span className="block text-lg font-medium">{buzz.meaning}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-10 sm:py-28 lg:px-14">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
            <img
              src={bandSensors}
              alt="Underside of Band showing the rear heart rate sensors and clasp"
              loading="lazy"
              className="size-full object-contain"
            />
          </div>
          <div className="max-w-xl lg:pl-10">
            <p className="text-sm font-medium text-landing-muted">The hardware</p>
            <h2 className="mt-3 text-[clamp(2.25rem,4.5vw,4.5rem)] font-semibold leading-[1.04] tracking-normal">
              One button. Everything else runs quietly.
            </h2>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-7">
              {HARDWARE.map(({ icon: Icon, title, copy }) => (
                <div key={title}>
                  <Icon aria-hidden="true" className="size-6 stroke-[1.6] text-landing-action" />
                  <dt className="mt-3 text-base font-semibold">{title}</dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-landing-muted">{copy}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="bg-landing-control/55 px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-landing-muted">The Band app</p>
          <h2 className="mt-3 text-[clamp(2.25rem,4.5vw,4.5rem)] font-semibold leading-[1.04] tracking-normal">
            Where everything lands.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-landing-muted sm:text-xl">
            Your tasks and what happened with them, your notes word for word, your health history,
            and the connections Band can act on. The band itself is always one tap away: battery,
            connection, and live sensor readings.
          </p>
        </div>
      </section>

      <section className="bg-landing-ink px-6 py-24 text-center text-landing-action-foreground sm:py-32">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium">
            <span className="text-landing-action">Beta</span>
            <span className="text-landing-action-foreground/60"> · one time</span>
          </p>
          <h2 className="mt-4 text-[clamp(2.75rem,7vw,6rem)] font-semibold leading-[0.98] tracking-normal">
            {band}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-landing-action-foreground/70 sm:text-xl">
            OVOA Band is beta hardware, with {data.bandTrialDays} days of the OVOA assistant
            included.
          </p>
          <Link
            to="/checkout"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-landing-action px-8 text-sm font-medium text-landing-action-foreground shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-action active:translate-y-0"
          >
            Buy Band
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-md px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}
