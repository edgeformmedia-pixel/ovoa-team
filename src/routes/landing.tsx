import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import OvoaIphoneDemo, { type DemoStep } from "@/components/OvoaIphoneDemo";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import bandFront from "@/assets/product/band-front-cutout.webp";
import bandProfile from "@/assets/product/band-profile-cutout.webp";
import bandSensors from "@/assets/product/band-sensors-cutout.webp";
import { TASKS_SCRIPT } from "@/lib/demo-scripts";
import { getPlans } from "@/lib/membership/membership.functions";
import { bandPrice, bandProductJsonLd, perLabel, planOf } from "@/lib/membership/copy";
import type { PlansResult } from "@/lib/membership/plans";
import { ORGANIZATION, WEBSITE, appJsonLd, jsonLd, ogImageMeta } from "@/lib/seo";

const PAGE_TITLE = "OVOA: the AI assistant that gets things done";

function describe(data: PlansResult | undefined) {
  // Kept under ~160 characters so search results show all of it.
  return `OVOA is an AI assistant for iPhone you text or talk to. It schedules, remembers and follows through. Free for health and notes; the assistant is ${perLabel(planOf(data, "base", "monthly"))}.`;
}

export const Route = createFileRoute("/landing")({
  component: Landing,
  staticData: { sitemap: true },
  loader: () => getPlans(),
  head: ({ loaderData }) => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: describe(loaderData) },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: describe(loaderData) },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ovoa.ai/landing" },
      ...ogImageMeta,
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/landing" }],
    scripts: [
      jsonLd(WEBSITE),
      jsonLd(ORGANIZATION),
      jsonLd(appJsonLd(loaderData)),
      jsonLd(
        bandProductJsonLd(
          loaderData,
          "A woven wristband with one button and heart rate sensing: press it and talk to OVOA. Beta hardware.",
          [bandFront, bandSensors, bandProfile],
        ),
      ),
    ],
  }),
});

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

const PRODUCTS: { to: "/text" | "/app" | "/fit"; name: string; copy: string; cta: string }[] = [
  {
    to: "/text",
    name: "Text OVOA",
    copy: "The assistant in iMessage. No app, no sign-up, and your first texts are free.",
    cta: "Start texting",
  },
  {
    to: "/app",
    name: "OVOA app",
    copy: "The same assistant with voice, your contacts and Reminders, and health data. Free beta.",
    cta: "Get the app",
  },
  {
    to: "/fit",
    name: "OVOA Fit",
    copy: "A woven wristband with one button: press it and talk. Heart rate included.",
    cta: "See OVOA Fit",
  },
];

function Landing() {
  const data = Route.useLoaderData();
  const band = bandPrice(data);
  const base = perLabel(planOf(data, "base", "monthly"));
  return (
    <main className="min-h-dvh overflow-x-clip bg-landing-canvas text-landing-ink">
      <MembershipHeader />

      <section className="px-6 pb-16 pt-14 text-center sm:pb-24 sm:pt-20">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-semibold leading-[1.02] tracking-normal">
            The assistant that actually does things.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-landing-muted sm:text-xl">
            Text it or talk to it like a person. OVOA plans, schedules, remembers and follows
            through, then lets you know when it&rsquo;s done, or when it needs you.
          </p>
          <Link
            to="/text"
            className="mt-10 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-landing-action px-9 text-base font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5"
          >
            <MessageCircle aria-hidden="true" className="size-5" />
            Text OVOA
          </Link>
          <p className="mt-4 text-sm text-landing-muted">Free to try. iPhone only.</p>
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

      <section className="bg-landing-canvas px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-semibold leading-[1.04] tracking-normal">
            Three ways to use OVOA.
          </h2>
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {PRODUCTS.map((product) => (
              <article
                key={product.to}
                className="flex flex-col rounded-[1.75rem] bg-landing-control/70 p-7"
              >
                <h3 className="text-2xl font-semibold tracking-normal">{product.name}</h3>
                <p className="mt-2 text-base leading-relaxed text-landing-muted">{product.copy}</p>
                <Link
                  to={product.to}
                  className="mt-auto inline-flex pt-6 text-sm font-semibold underline underline-offset-4"
                >
                  {product.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-landing-ink px-6 py-20 text-center text-landing-action-foreground sm:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.02] tracking-normal">
            Use OVOA today.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-landing-action-foreground/70 sm:text-xl">
            Say hi and your first texts are free. When you want more, the assistant is {base}, and
            the price you join at is kept while you&rsquo;re a member. OVOA Fit is {band}, one time,
            with {data.bandTrialDays} days of the assistant included.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/text"
              className="inline-flex h-12 items-center justify-center rounded-full bg-landing-action px-8 text-sm font-medium text-landing-action-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Text OVOA
            </Link>
            <Link
              to="/early-access"
              className="inline-flex h-12 items-center justify-center rounded-full border border-landing-action-foreground/25 px-8 text-sm font-medium transition-colors hover:border-landing-action-foreground/60"
            >
              See plans
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-md px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}
