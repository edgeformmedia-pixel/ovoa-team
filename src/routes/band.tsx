import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  HeartPulse,
  type LucideIcon,
  MessageSquareText,
  Moon,
  Sparkles,
} from "lucide-react";
import bandFront from "@/assets/product/band-front-cutout.webp";
import bandSensors from "@/assets/product/band-sensors-cutout.webp";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPlans } from "@/lib/membership/membership.functions";
import { bandPrice } from "@/lib/membership/copy";
import { breadcrumbs, jsonLd, ogImageMeta } from "@/lib/seo";

const PAGE_TITLE = "OVOA Band V1: the health tracker with AI";
const PAGE_DESCRIPTION =
  "OVOA Band V1 tracks your heart rate, sleep, activity and recovery, and OVOA's AI reads your data and texts you what it means. Beta hardware.";

export const Route = createFileRoute("/band")({
  component: BandPage,
  staticData: { sitemap: true },
  loader: () => getPlans(),
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ovoa.ai/band" },
      ...ogImageMeta,
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/band" }],
    scripts: [jsonLd(breadcrumbs("OVOA Band V1", "/band"))],
  }),
});

const FEATURES: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: HeartPulse,
    title: "Continuous heart rate",
    copy: "Your heart rate, all day and all night, so the trends are real and not a spot check.",
  },
  {
    icon: Moon,
    title: "Sleep",
    copy: "How long you slept and how well, night after night, without thinking about it.",
  },
  {
    icon: Activity,
    title: "Activity",
    copy: "Movement and workouts picked up as you go, from a walk to a long run.",
  },
  {
    icon: Sparkles,
    title: "Recovery",
    copy: "How ready you are today, from your heart and your sleep, so you know when to push and when to rest.",
  },
];

function BandPage() {
  const data = Route.useLoaderData();
  const price = bandPrice(data);
  return (
    <main className="min-h-dvh bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <Link
          to="/text"
          className="text-xs text-landing-muted transition-colors hover:text-landing-ink"
        >
          Text OVOA
        </Link>
        <Link
          to="/checkout"
          className="inline-flex h-8 items-center rounded-full bg-landing-action px-3.5 text-xs font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5"
        >
          Buy
        </Link>
      </MembershipHeader>

      <section className="px-6 pb-16 pt-16 text-center sm:pt-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-landing-muted">OVOA Band V1 · Beta</p>
          <h1 className="mt-4 text-[clamp(2.5rem,7vw,5.5rem)] font-semibold leading-[1.02] tracking-normal">
            A health tracker with an AI that texts you.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-landing-muted sm:text-xl">
            OVOA Band V1 tracks your heart, sleep, activity and recovery around the clock. Then OVOA
            reads your data and texts you what it means, in plain English.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/checkout"
              className="inline-flex h-12 items-center rounded-full bg-landing-action px-7 text-[15px] font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5"
            >
              Buy OVOA Band V1 · {price}
            </Link>
            <Link
              to="/about"
              className="inline-flex h-12 items-center rounded-full border border-landing-line px-7 text-[15px] font-semibold transition-colors hover:border-landing-muted"
            >
              More about the Band
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-12 flex max-w-3xl items-center justify-center gap-6">
          <img src={bandFront} alt="OVOA Band V1, front view" className="w-1/2 max-w-[320px]" />
          <img
            src={bandSensors}
            alt="OVOA Band V1, rear sensor view"
            className="w-1/2 max-w-[320px]"
          />
        </div>
      </section>

      <section className="border-t border-landing-line px-6 py-20 sm:py-28">
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="rounded-3xl border border-landing-line p-7">
              <Icon aria-hidden="true" className="size-6 text-landing-action" />
              <h2 className="mt-4 text-xl font-semibold">{title}</h2>
              <p className="mt-2 leading-relaxed text-landing-muted">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-landing-line bg-landing-action px-6 py-20 text-center text-landing-action-foreground sm:py-28">
        <div className="mx-auto max-w-3xl">
          <MessageSquareText aria-hidden="true" className="mx-auto size-8" />
          <h2 className="mt-5 text-[clamp(2rem,5vw,4rem)] font-semibold leading-[1.05]">
            Your data, read for you.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-landing-action-foreground/75">
            Numbers on a dashboard are easy to ignore. OVOA looks at your heart rate, sleep and
            activity for you, notices what changed, and texts you the insight, like a short night
            catching up with you or your recovery bouncing back. Reply to ask it anything.
          </p>
        </div>
      </section>

      <section className="px-6 py-20 text-center sm:py-28">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.05]">
            Get OVOA Band V1.
          </h2>
          <p className="mt-4 text-lg text-landing-muted">
            {price}, one time. Beta hardware, shipped to US addresses.
          </p>
          <Link
            to="/checkout"
            className="mt-8 inline-flex h-12 items-center rounded-full bg-landing-action px-7 text-[15px] font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5"
          >
            Buy now
          </Link>
          <p className="mt-4 text-sm text-landing-muted">
            Want the app first?{" "}
            <Link to="/early-access" className="underline underline-offset-2">
              See plans
            </Link>
          </p>
        </div>
      </section>

      <div className="px-6 pb-10">
        <SiteFooter />
      </div>
    </main>
  );
}
