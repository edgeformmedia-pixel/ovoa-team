import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";

const PAGE_TITLE = "Band FAQ — questions and answers";
const PAGE_DESCRIPTION =
  "Answers about Band, the AI wristband you talk to: battery life, water resistance, tasks, notes, standing rules, what the buzzes mean, and privacy.";

const faqs = [
  {
    q: "What is Band?",
    a: "Band is a woven wristband you talk to. Say or type what you want and it goes and does it — a one-off task, a note saved word for word, or a standing rule that keeps running in the background.",
  },
  {
    q: "How do I ask Band to do something?",
    a: "Press the button and speak, or type it in the Band app. Band buzzes once to confirm it heard you, then goes and does it.",
  },
  {
    q: "How do I take a note?",
    a: "Double-tap the button and speak. The note is saved word for word and shows up in the app, searchable, with a title Band writes for you.",
  },
  {
    q: "What is a standing rule?",
    a: "A request that keeps running instead of happening once. Band turns it into a rule that runs in the background and reports every time it fires. You can pause or delete any rule from the app.",
  },
  {
    q: "What do the buzzes mean?",
    a: "One short buzz: heard you. Two short: accepted. Three short: Band needs an answer from you. One long: done. Two long: it couldn't finish.",
  },
  {
    q: "How long does the battery last?",
    a: "All day with continuous heart rate and motion sensing running. You can check the exact level anytime in the Band app.",
  },
  {
    q: "Is Band water resistant?",
    a: "Yes. The woven strap and case are water resistant, so rain, sweat, and hand washing are fine.",
  },
  {
    q: "What health tracking does Band do?",
    a: "Continuous heart rate and motion sensing run in the background, and your history lives in the Band app.",
  },
  {
    q: "When does the microphone listen?",
    a: "The microphone is used when you ask Band something — when you press the button or double-tap for a note. It is not an always-listening recorder.",
  },
  {
    q: "How much does Band cost?",
    a: "$99, one time. That includes the band and the Band app.",
  },
];

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  staticData: { sitemap: true },
  head: () => ({
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
          mainEntity: faqs.map((faq) => ({
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
  return (
    <main className="min-h-dvh overflow-y-auto bg-background px-6 py-12">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Questions
        </h1>
        <p className="mt-3 max-w-sm text-base leading-relaxed text-muted-foreground">
          Everything people ask about Band, answered plainly.
        </p>

        <div className="mt-10 grid w-full gap-3 text-left">
          {faqs.map((faq) => (
            <section key={faq.q} className="neu-raised-sm rounded-2xl px-4 py-4">
              <h2 className="text-sm font-semibold text-foreground">{faq.q}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-10 text-2xl font-medium text-foreground">$99</div>
        <Link
          to="/"
          className="neo-btn mt-4 inline-flex h-12 items-center justify-center px-8 text-[12px] uppercase tracking-[0.18em]"
        >
          <span className="neu-embossed">Buy Band</span>
        </Link>

        <SiteFooter />
      </div>
    </main>
  );
}
