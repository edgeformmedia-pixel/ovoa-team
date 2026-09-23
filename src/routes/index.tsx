import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  Brain,
  CalendarCheck,
  HeartPulse,
  type LucideIcon,
  MessageSquareText,
  Repeat,
  Search,
  ShoppingBag,
} from "lucide-react";
import OvoaIphoneDemo, { type DemoStep } from "@/components/OvoaIphoneDemo";
import { HowItWorksDemo } from "@/components/HowItWorksDemo";
import { ScrollScrubVideo } from "@/components/ScrollScrubVideo";
import { SiteFooter } from "@/components/SiteFooter";
import bandFront from "@/assets/product/band-front-cutout.png";
import bandProfile from "@/assets/product/band-profile-cutout.png";
import bandSensors from "@/assets/product/band-sensors-cutout.png";
import cyclingBand from "@/assets/sports/cycling-band.jpg.asset.json";
import runningBand from "@/assets/sports/running-band.png.asset.json";
import swimmingBand from "@/assets/sports/swimming-band.png.asset.json";
import { HEALTH_SCRIPT, NOTES_SCRIPT, RULES_SCRIPT, TASKS_SCRIPT } from "@/lib/demo-scripts";
import { getPlans } from "@/lib/membership/membership.functions";
import { bandPrice, bandProductJsonLd, perLabel, planOf } from "@/lib/membership/copy";
import type { PlansResult } from "@/lib/membership/plans";

const OG_IMAGE = "https://ovoa.ai/og-band.jpg";
const PAGE_TITLE = "OVOA: the AI assistant that gets things done";

function describe(data: PlansResult | undefined) {
  return `OVOA is a Jarvis in your phone: text or talk and it schedules, remembers and follows through. In beta on iPhone: health and notes are free, the assistant is ${perLabel(planOf(data, "base", "monthly"))}, and the OVOA Band is ${bandPrice(data)}.`;
}

export const Route = createFileRoute("/")({
  component: Landing,
  staticData: { sitemap: true },
  loader: () => getPlans(),
  head: ({ loaderData }) => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: describe(loaderData) },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: describe(loaderData) },
      { property: "og:type", content: "product" },
      { property: "og:url", content: "https://ovoa.ai/" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          bandProductJsonLd(
            loaderData,
            "A woven wristband with one button and heart rate sensing: press it and talk to OVOA. Beta hardware.",
          ),
        ),
      },
    ],
  }),
});

const CAPABILITIES: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: MessageSquareText,
    title: "Text or talk",
    copy: "Type in the app or say it out loud. OVOA gets plain, messy, real-life requests.",
  },
  {
    icon: CalendarCheck,
    title: "Tasks, done",
    copy: "Scheduling, messages and follow-ups, handled from start to finish.",
  },
  {
    icon: Repeat,
    title: "Standing rules",
    copy: "Routines that run in the background and report back every time they fire.",
  },
  {
    icon: Brain,
    title: "Perfect memory",
    copy: "Notes saved word for word and found again the moment you ask.",
  },
  {
    icon: HeartPulse,
    title: "Health, with Band",
    copy: "Continuous heart rate and motion, with your history in the app.",
  },
  {
    icon: Bell,
    title: "Asks when it matters",
    copy: "When a decision is yours, OVOA checks in instead of guessing.",
  },
];

const BUZZES: { pattern: ("short" | "long")[]; label: string; meaning: string }[] = [
  { pattern: ["short"], label: "One short", meaning: "Heard you" },
  { pattern: ["short", "short"], label: "Two short", meaning: "On it" },
  { pattern: ["short", "short", "short"], label: "Three short", meaning: "Needs your answer" },
  { pattern: ["long"], label: "One long", meaning: "Done" },
];

function PhoneFeature({
  eyebrow,
  title,
  body,
  points,
  script,
  dark = false,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  script: DemoStep[];
  dark?: boolean;
  reverse?: boolean;
}) {
  return (
    <section
      className={`overflow-hidden px-6 py-20 sm:px-10 sm:py-28 lg:px-14 ${
        dark
          ? "bg-landing-ink text-landing-action-foreground"
          : "bg-landing-control/55 text-landing-ink"
      }`}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div className={`relative mx-auto w-[min(78vw,320px)] ${reverse ? "lg:order-2" : ""}`}>
          <div
            aria-hidden="true"
            className="absolute inset-x-[-20%] top-[15%] bottom-[10%] rounded-full bg-landing-action/25 blur-3xl"
          />
          <div className="relative">
            <OvoaIphoneDemo script={script} maxWidth={320} dark={dark} />
          </div>
        </div>
        <div className={`max-w-xl ${reverse ? "lg:order-1 lg:pl-10" : "lg:pr-10"}`}>
          <p
            className={`text-sm font-medium ${dark ? "text-landing-action-foreground/60" : "text-landing-muted"}`}
          >
            {eyebrow}
          </p>
          <h2 className="mt-3 text-[clamp(2.25rem,4.5vw,4.5rem)] font-semibold leading-[1.04] tracking-normal">
            {title}
          </h2>
          <p
            className={`mt-6 text-lg leading-relaxed sm:text-xl ${
              dark ? "text-landing-action-foreground/70" : "text-landing-muted"
            }`}
          >
            {body}
          </p>
          <ul className="mt-8 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-3 text-base font-medium sm:text-lg">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full bg-landing-action"
                />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Landing() {
  const data = Route.useLoaderData();
  const band = bandPrice(data);
  const base = perLabel(planOf(data, "base", "monthly"));
  return (
    <main className="min-h-dvh overflow-x-clip bg-landing-canvas text-landing-ink">
      <header className="h-14 border-b border-landing-line sm:h-16">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-5 sm:px-10 lg:px-14">
          <nav aria-label="Main navigation" className="flex h-full items-center gap-6 sm:gap-10">
            <Link
              to="/"
              className="relative flex h-full items-center text-xs font-medium text-landing-ink after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-landing-ink"
            >
              Collection
            </Link>
            <Link
              to="/about"
              className="hidden text-xs text-landing-muted transition-colors hover:text-landing-ink sm:block"
            >
              Bands
            </Link>
            <Link
              to="/about"
              className="hidden text-xs text-landing-muted transition-colors hover:text-landing-ink sm:block"
            >
              Materials
            </Link>
            <Link
              to="/faq"
              className="text-xs text-landing-muted transition-colors hover:text-landing-ink"
            >
              Support
            </Link>
          </nav>

          <div className="flex items-center gap-5 sm:gap-7">
            <Link
              to="/early-access"
              className="inline-flex h-8 items-center rounded-full bg-landing-action px-3.5 text-xs font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5"
            >
              Get the app
            </Link>
            <Link
              to="/about"
              aria-label="Search product information"
              title="Search"
              className="text-landing-ink transition-opacity hover:opacity-55"
            >
              <Search aria-hidden="true" className="size-5 stroke-[1.6]" />
            </Link>
            <Link
              to="/checkout"
              aria-label="Open checkout"
              title="Checkout"
              className="text-landing-ink transition-opacity hover:opacity-55"
            >
              <ShoppingBag aria-hidden="true" className="size-5 stroke-[1.6]" />
            </Link>
          </div>
        </div>
      </header>

      <ScrollScrubVideo
        note={`Beta · Free for health and notes · Assistant from ${base} · Band ${band}`}
      />

      <HowItWorksDemo />

      <section className="border-t border-landing-line bg-landing-canvas px-6 py-24 text-center sm:py-36">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-medium text-landing-muted">Meet OVOA</p>
          <h2 className="mt-4 text-[clamp(2.35rem,6vw,5.5rem)] font-semibold leading-[1.02] tracking-normal text-landing-ink">
            The assistant that actually does things.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-landing-muted sm:text-2xl">
            Text it or talk to it like a person. OVOA plans, schedules, remembers and follows
            through, then lets you know when it’s done, or when it needs you.
          </p>
        </div>
      </section>

      <PhoneFeature
        eyebrow="Tasks"
        title="Say it once. Consider it handled."
        body="Skip the back-and-forth. Tell OVOA what you need and it finds the time, drafts the message and sends the invite. When the choice is yours, it asks first."
        points={[
          "Finds openings on your calendar",
          "Drafts and sends for you",
          "Checks with you before it acts",
        ]}
        script={TASKS_SCRIPT}
      />

      <PhoneFeature
        eyebrow="Standing rules"
        title="Set it once. It keeps going."
        body="Turn anything into a routine. OVOA runs it in the background and reports back every time it fires, from a morning brief to a heads-up when you’re running late."
        points={[
          "Runs on a schedule or a trigger",
          "Reports back every time",
          "Pause or delete it anytime",
        ]}
        script={RULES_SCRIPT}
        dark
        reverse
      />

      <PhoneFeature
        eyebrow="Memory"
        title="It remembers, so you don’t have to."
        body="Codes, names, ideas, the thing you promised to do. Tell OVOA once and it saves your exact words, ready whenever you ask."
        points={["Saved word for word", "Searchable in the app", "Just ask to get it back"]}
        script={NOTES_SCRIPT}
      />

      <PhoneFeature
        eyebrow="Health · with Band"
        title="Knows how you’re really doing."
        body="Pair Band and OVOA gets a pulse. Ask about today’s run, your heart rate or how active you’ve been, and get a straight answer."
        points={["Continuous heart rate", "Motion and activity", "History in the app"]}
        script={HEALTH_SCRIPT}
        dark
        reverse
      />

      <section className="bg-landing-canvas px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-landing-muted">Everything in one conversation</p>
            <h2 className="mt-3 text-[clamp(2.25rem,5vw,4.75rem)] font-semibold leading-[1.02] tracking-normal text-landing-ink">
              One chat. Your whole day.
            </h2>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="rounded-[1.75rem] bg-landing-control/70 p-7 sm:p-8">
                <Icon aria-hidden="true" className="size-7 stroke-[1.6] text-landing-action" />
                <h3 className="mt-6 text-2xl font-semibold tracking-normal text-landing-ink">
                  {title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-landing-muted sm:text-lg">
                  {copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="band"
        className="scroll-mt-4 bg-landing-ink px-6 py-24 text-center text-landing-action-foreground sm:py-36"
      >
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-medium">
            <span className="text-landing-action">Beta</span>
            <span className="text-landing-action-foreground/60"> · {band}</span>
          </p>
          <h2 className="mt-4 text-[clamp(2.75rem,8vw,7rem)] font-semibold leading-[0.96] tracking-normal">
            OVOA Band
          </h2>
          <p className="mt-3 text-[clamp(1.5rem,3.2vw,2.75rem)] font-semibold leading-tight text-landing-action-foreground/85">
            Brings OVOA to your wrist.
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-landing-action-foreground/70 sm:text-2xl">
            Your Jarvis, one press away. OVOA Band is a woven wristband with a single button: press
            it and talk. No phone, no screen. It answers in buzzes, reads your heart rate and keeps
            going all day.
          </p>
          <div className="mx-auto mt-14 grid max-w-3xl gap-px overflow-hidden rounded-[1.75rem] bg-landing-action-foreground/12 text-left sm:grid-cols-2">
            {BUZZES.map((buzz) => (
              <div key={buzz.meaning} className="flex items-center gap-5 bg-landing-ink p-6">
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

      <section className="bg-landing-canvas px-4 py-24 sm:px-6 sm:py-36">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-10 max-w-4xl sm:mb-14">
            <p className="text-lg font-semibold text-landing-ink sm:text-xl">
              Band goes where you go
            </p>
            <h2 className="mt-3 text-[clamp(3rem,7vw,6.5rem)] font-semibold leading-[0.96] tracking-normal text-landing-ink">
              Built for the moments you can’t reach for your phone.
            </h2>
          </div>

          <div className="grid gap-2 lg:grid-cols-3">
            {[
              {
                src: cyclingBand.url,
                alt: "Cyclist wearing Band during an outdoor ride",
                title: "Ride farther",
                copy: "Ask OVOA for your pace mid-climb. Heart rate and motion sensing ride along the whole way.",
                position: "object-center",
                zoom: "",
              },
              {
                src: runningBand.url,
                alt: "Runner wearing Band on an outdoor track",
                title: "Find your pace",
                copy: "A light woven fit and a quick buzz when OVOA has news, so your eyes stay on the next stride.",
                position: "object-[42%_center]",
                zoom: "",
              },
              {
                src: swimmingBand.url,
                alt: "Swimmer wearing Band beside a pool",
                title: "Made to move",
                copy: "Water-resistant and made for all-day wear, from the pool to everything after.",
                position: "object-[70%_center]",
                zoom: "scale-[1.35] origin-[50%_100%]",
              },
            ].map((sport) => (
              <article
                key={sport.title}
                className="group relative min-h-[34rem] overflow-hidden rounded-[1.75rem] bg-landing-control sm:min-h-[42rem] lg:min-h-[38rem]"
              >
                <div className={`absolute inset-0 ${sport.zoom}`}>
                  <img
                    src={sport.src}
                    alt={sport.alt}
                    loading="lazy"
                    className={`size-full object-cover ${sport.position} transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.025]`}
                  />
                </div>
                <div className="absolute inset-x-0 bottom-[25%] h-[24%] bg-gradient-to-t from-landing-ink/65 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 min-h-[29%] rounded-t-[1.75rem] border-t border-landing-action-foreground/15 bg-landing-ink/70 p-6 text-landing-action-foreground backdrop-blur-md sm:p-8">
                  <h3 className="text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
                    {sport.title}
                  </h3>
                  <p className="mt-2 max-w-sm text-base leading-relaxed text-landing-action-foreground/88 sm:text-lg">
                    {sport.copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-landing-control/55 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:gap-20 lg:px-14">
          <div className="relative mx-auto aspect-square w-full max-w-[38rem]">
            <img
              src={bandFront}
              alt="Black woven Band with its side button and status light"
              loading="lazy"
              className="size-full object-contain"
            />
          </div>
          <div className="max-w-xl lg:pr-10">
            <p className="text-sm font-medium text-landing-muted">One button</p>
            <h2 className="mt-3 text-[clamp(2.25rem,4.5vw,4.5rem)] font-semibold leading-[1.04] tracking-normal text-landing-ink">
              Press. Speak. Done.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-landing-muted sm:text-xl">
              Press the button and ask OVOA for anything. One buzz means it heard you. One long buzz
              means it’s done. Your phone stays in your pocket.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-landing-canvas py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:gap-20 lg:px-14">
          <div className="max-w-xl lg:order-1 lg:pl-10">
            <p className="text-sm font-medium text-landing-muted">Notes</p>
            <h2 className="mt-3 text-[clamp(2.25rem,4.5vw,4.5rem)] font-semibold leading-[1.04] tracking-normal text-landing-ink">
              Catch the thought before it’s gone.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-landing-muted sm:text-xl">
              Double-tap and speak. Band saves what you say word for word, and OVOA finds it again
              whenever you ask.
            </p>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[38rem] lg:order-2">
            <img
              src={bandProfile}
              alt="Side profile of Band showing its single physical button"
              loading="lazy"
              className="size-full object-contain"
            />
          </div>
        </div>
      </section>

      <section className="bg-landing-control/55 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:gap-20 lg:px-14">
          <div className="relative mx-auto aspect-square w-full max-w-[38rem]">
            <img
              src={bandSensors}
              alt="Underside of Band showing the heart rate sensors"
              loading="lazy"
              className="size-full object-contain"
            />
          </div>
          <div className="max-w-xl lg:pr-10">
            <p className="text-sm font-medium text-landing-muted">Health and motion</p>
            <h2 className="mt-3 text-[clamp(2.25rem,4.5vw,4.5rem)] font-semibold leading-[1.04] tracking-normal text-landing-ink">
              Sensing that stays with you.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-landing-muted sm:text-xl">
              Heart rate and motion sensing run in the background, so OVOA always has the full
              picture. The woven, water-resistant strap is made to be forgotten about.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-landing-ink px-6 py-24 text-center text-landing-action-foreground sm:py-32">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium">
            <span className="text-landing-action">Beta</span>
            <span className="text-landing-action-foreground/60"> · iPhone</span>
          </p>
          <h2 className="mt-4 text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1.02] tracking-normal">
            Use OVOA today.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-landing-action-foreground/70 sm:text-xl">
            The iPhone app is in beta through TestFlight. Health tracking and notes are free. The
            assistant is {base}, and the price you join at is kept while you&rsquo;re a member.
          </p>
          <Link
            to="/early-access"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-landing-action px-8 text-sm font-medium text-landing-action-foreground shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-action active:translate-y-0"
          >
            See plans
          </Link>
        </div>
      </section>

      <section className="bg-landing-canvas px-6 py-24 text-center sm:py-36">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-landing-muted">OVOA Band · {band} · Beta</p>
          <h2 className="mt-4 text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1.02] tracking-normal text-landing-ink">
            Say hello to your Jarvis.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-landing-muted sm:text-xl">
            {band}, one time, with {data.bandTrialDays} days of the OVOA assistant included. Then{" "}
            {base} if you keep it, or just the free app.
          </p>
          <Link
            to="/checkout"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-landing-action px-8 text-sm font-medium text-landing-action-foreground shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-action active:translate-y-0"
          >
            Get the Band
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-md px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}
