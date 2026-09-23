import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPlans } from "@/lib/membership/membership.functions";
import { bandPrice, perLabel, planOf } from "@/lib/membership/copy";
import type { PlansResult } from "@/lib/membership/plans";

const PAGE_TITLE = "OVOA FAQ: plans, the Band and the beta";
const PAGE_DESCRIPTION =
  "Answers about OVOA and the OVOA Band: what's free, what Base and Pro add, the beta and TestFlight, battery, water resistance, the microphone and privacy.";

// Prices in the answers come from the live plans, never typed in here.
function faqsFor(data: PlansResult | undefined) {
  const baseMonthly = perLabel(planOf(data, "base", "monthly"));
  const baseAnnual = perLabel(planOf(data, "base", "annual"));
  const proMonthly = perLabel(planOf(data, "pro", "monthly"));
  const proAnnual = perLabel(planOf(data, "pro", "annual"));
  const days = data?.bandTrialDays ?? 7;
  return [
    {
      q: "What is OVOA?",
      a: "An assistant you text or talk to. It schedules, remembers and follows through, then tells you when it's done or when it needs you. The OVOA Band is a woven wristband with one button that brings it to your wrist.",
    },
    {
      q: "What's free?",
      a: "Health tracking (Apple Health, plus heart rate and activity from the Band) and notes. Notes you speak into the Band are written out on your iPhone, not on our servers. No card and no time limit.",
    },
    {
      q: "What does Base add?",
      a: `The OVOA assistant: chat and talk to it, and it handles reminders, email, calendar, money questions, memory and a morning brief. Press the Band, ask, and hear the answer, or turn on the hands-free wake word and Always listen so you don't have to press anything. The background agent runs jobs on its own and reports back. ${baseMonthly}, or ${baseAnnual}.`,
    },
    {
      q: "What's in Pro?",
      a: `Everything in Base, with three times as many AI replies a day. ${proMonthly}, or ${proAnnual}.`,
    },
    {
      q: "Is this finished?",
      a: "No. OVOA is in beta: the iPhone app, the assistant and the Band are all still being built. Things can break and new builds come often. Your plan's price is kept while you're a member.",
    },
    {
      q: "How does TestFlight work?",
      a: "TestFlight is Apple's own app for trying iPhone apps before they reach the App Store. Install TestFlight from the App Store, open your OVOA invite or link on your iPhone, and tap Install. OVOA then updates itself as we ship new builds. When OVOA reaches the App Store, your account and plan come with you.",
    },
    {
      q: "How much is the Band?",
      a: `${bandPrice(data)}, one time. It comes with ${days} days of OVOA Base, which start when you choose (we email you a link), so they don't run out while the Band is on its way. After that Base is ${baseMonthly} if you keep it, or you can use the Band with the free app. Bought on its own, the Band still comes with the ${days} days, with no card needed: they end on their own and nothing is charged. The Band is beta hardware, made in small batches, and ships to US addresses.`,
    },
    {
      q: "How do I ask OVOA to do something?",
      a: "Press the Band's button and speak, or type in the app. The Band buzzes once to say it heard you, then OVOA gets to work. (That's the assistant, part of Base and Pro.)",
    },
    {
      q: "How do I take a note?",
      a: "Double-tap the Band's button and speak, or type it in the app. The note is saved word for word and shows up in the app, searchable. Notes are free.",
    },
    {
      q: "What do the buzzes mean?",
      a: "One short buzz: heard you. Two short: on it. Three short: OVOA needs an answer from you. One long: done. Two long: it couldn't finish.",
    },
    {
      q: "How long does the battery last?",
      a: "All day with heart rate and motion sensing running. You can check the level anytime in the app.",
    },
    {
      q: "Is the Band water resistant?",
      a: "Yes. Rain, sweat and hand washing are fine.",
    },
    {
      q: "When does the microphone listen?",
      a: "When you ask it to: a press of the Band's button, a double-tap for a note, or the record button in the app. The hands-free wake word and Always listen are the exception: they're off until you turn them on, and your iPhone itself listens for the name. Nothing leaves the phone until it hears \"OVOA\", and then only the words, never the audio. OVOA never records your day in the background.",
    },
    {
      q: "What happens to my data?",
      a: "It's used to run OVOA for you and nothing else. We don't sell it, use it for ads or train AI on it, and the app asks before anything goes to an AI company. After 14 days everything is deleted except a short summary of each day and what you entered or set up yourself, and you can delete your account from the app. The privacy policy has the details.",
    },
  ];
}

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  staticData: { sitemap: true },
  loader: () => getPlans(),
  head: ({ loaderData }) => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ovoa.ai/faq" },
      { property: "og:image", content: "https://ovoa.ai/og-band.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://ovoa.ai/og-band.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqsFor(loaderData).map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        }),
      },
    ],
  }),
});

function FaqPage() {
  const data = Route.useLoaderData();
  const faqs = faqsFor(data);
  return (
    <main className="min-h-dvh overflow-x-clip bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <Link
          to="/early-access"
          className="inline-flex h-9 items-center rounded-full bg-landing-action px-4 text-xs font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5"
        >
          See plans
        </Link>
      </MembershipHeader>

      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-medium text-landing-muted">Questions</p>
            <h1 className="mt-3 text-[clamp(2.25rem,4.5vw,3.5rem)] font-semibold leading-[1.04] tracking-normal">
              Asked and answered.
            </h1>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-landing-muted">
              Anything else? Email{" "}
              <a href="mailto:support@ovoa.ai" className="font-semibold text-landing-ink">
                support@ovoa.ai
              </a>
              .
            </p>
          </div>
          <div className="divide-y divide-landing-line border-y border-landing-line">
            {faqs.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  <h2>{item.q}</h2>
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

      <div className="mx-auto max-w-md px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}
