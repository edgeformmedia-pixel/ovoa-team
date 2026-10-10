import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPlans } from "@/lib/membership/membership.functions";
import { bandPrice, CREDITS_FAQ, creditsLine, perLabel, planOf } from "@/lib/membership/copy";
import type { PlansResult } from "@/lib/membership/plans";
import { breadcrumbs, jsonLd, ogImageMeta } from "@/lib/seo";

const PAGE_TITLE = "OVOA FAQ: plans, OVOA Fit and the beta";
const PAGE_DESCRIPTION =
  "Answers about OVOA and the OVOA Fit: what's free, what Base, Plus and Pro add, the beta and the app, battery, water resistance, the microphone and privacy.";

// Prices in the answers come from the live plans, never typed in here.
function faqsFor(data: PlansResult | undefined) {
  const baseMonthly = perLabel(planOf(data, "base", "monthly"));
  const baseAnnual = perLabel(planOf(data, "base", "annual"));
  const plusMonthly = perLabel(planOf(data, "plus", "monthly"));
  const plusAnnual = perLabel(planOf(data, "plus", "annual"));
  const proMonthly = perLabel(planOf(data, "pro", "monthly"));
  const proAnnual = perLabel(planOf(data, "pro", "annual"));
  const days = data?.bandTrialDays ?? 7;
  return [
    {
      q: "What is OVOA?",
      a: "An assistant you text or talk to. It schedules, remembers and follows through, then tells you when it's done or when it needs you. The OVOA Fit is a woven wristband with one button that brings it to your wrist.",
    },
    {
      q: "Can I just text OVOA?",
      a: `Yes. OVOA answers iMessage like a contact, with no app needed: open ovoa.ai/text on your iPhone and say hi. Your first 15 texts are free with no account and nothing asked, then OVOA texts you a link to the plans (Base is ${baseMonthly}). It texts you first too, with your brief, reminders and check-ins, up to 12 a day. iMessage only, so not Android or SMS yet.`,
    },
    {
      q: "Can OVOA build me a website?",
      a: "Yes. Text it what the site is for, your business or a client's, and a few minutes later it sends you the link to a finished site at your ovoa.ai address, with a contact form that texts you each message. Change it by texting. It's part of Base.",
    },
    {
      q: "What's free?",
      a: "Health tracking (Apple Health, plus heart rate and activity from OVOA Fit) and notes. Notes you speak into OVOA Fit are written out on your iPhone, not on our servers. No card and no time limit.",
    },
    {
      q: "What does Base add?",
      a: `The OVOA assistant: chat and talk to it, and it handles reminders, email, calendar, money questions, memory and a morning brief. Press OVOA Fit, ask, and hear the answer, or turn on the hands-free wake word and Always listen so you don't have to press anything. ${baseMonthly}, or ${baseAnnual}.`,
    },
    {
      q: "What's in Plus?",
      a: `Everything in Base, plus the background agent, which runs jobs on its own and reports back, and ${creditsLine("plus")}. ${plusMonthly}, or ${plusAnnual}.`,
    },
    {
      q: "What's in Pro?",
      a: `Everything in Plus, with ${creditsLine("pro")}. ${proMonthly}, or ${proAnnual}.`,
    },
    {
      ...CREDITS_FAQ,
    },
    {
      q: "Is this finished?",
      a: "No. OVOA is in beta: the iPhone app, the assistant and OVOA Fit are all still being built. Things can break and new builds come often. Your plan's price is kept while you're a member.",
    },
    {
      q: "Where do I get the iPhone app?",
      a: "OVOA is on the App Store. Search for OVOA, install it, and sign in with the account you bought with. It's still in beta, so new builds come often.",
    },
    {
      q: "How much is OVOA Fit?",
      a: `${bandPrice(data)}, one time. It comes with ${days} days of OVOA Base, which start when you choose (we email you a link), so they don't run out while OVOA Fit is on its way. After that Base is ${baseMonthly} if you keep it, or you can use OVOA Fit with the free app. Bought on its own, OVOA Fit still comes with the ${days} days, with no card needed: they end on their own and nothing is charged. OVOA Fit is beta hardware, made in small batches, and ships to US addresses.`,
    },
    {
      q: "How do I ask OVOA to do something?",
      a: "Press OVOA Fit's button and speak, or type in the app. OVOA Fit buzzes once to say it heard you, then OVOA gets to work. (That's the assistant, part of Base, Plus and Pro.)",
    },
    {
      q: "How do I take a note?",
      a: "Double-tap OVOA Fit's button and speak, or type it in the app. The note is saved word for word and shows up in the app, searchable. Notes are free.",
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
      q: "Is OVOA Fit water resistant?",
      a: "Yes. Rain, sweat and hand washing are fine.",
    },
    {
      q: "When does the microphone listen?",
      a: "When you ask it to: a press of OVOA Fit's button, a double-tap for a note, or the record button in the app. The hands-free wake word and Always listen are the exception: they're off until you turn them on, and your iPhone itself listens for the name. What it hears stays on the phone unless you say \"OVOA\" (a few words said just before can be included) or keep talking in the few seconds after OVOA answers, and then only the words go, never the audio. OVOA never records your day in the background.",
    },
    {
      q: "What happens to my data?",
      a: "It's used to run OVOA for you and nothing else. We don't sell it, use it for ads or train AI on it, and the app asks before anything goes to an AI company. Deepgram, which speaks OVOA's replies, may use their text to train its models. After 14 days everything is deleted except a short summary of each day and what you entered or set up yourself, and you can delete your account from the app. The privacy policy has the details.",
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
      ...ogImageMeta,
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/faq" }],
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqsFor(loaderData).map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      }),
      jsonLd(breadcrumbs("FAQ", "/faq")),
    ],
  }),
});

function FaqPage() {
  const data = Route.useLoaderData();
  const faqs = faqsFor(data);
  return (
    <main className="min-h-dvh overflow-x-clip bg-landing-canvas text-landing-ink">
      <MembershipHeader />

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
