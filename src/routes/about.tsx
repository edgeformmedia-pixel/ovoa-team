import { createFileRoute, Link } from "@tanstack/react-router";
import bandFront from "@/assets/product/band-front-cutout.png";
import bandSensors from "@/assets/product/band-sensors-cutout.png";
import { SiteFooter } from "@/components/SiteFooter";

const OG_IMAGE = "https://ovoa.ai/og-band.jpg";
const PAGE_TITLE = "About Band — the AI wristband you talk to";
const PAGE_DESCRIPTION =
  "Band is a woven wristband you talk to. Ask it to do a task, double-tap to save a note word for word, or set a standing rule that keeps running. Heart rate and motion sensing, microphone, vibration motor, $99.";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  staticData: { sitemap: true },
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 w-full text-left">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <main className="min-h-dvh overflow-y-auto bg-background px-6 py-12">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="neu-inset relative aspect-square w-full max-w-[260px] overflow-hidden rounded-[2rem]">
          <img
            src={bandFront}
            alt="Band — a black woven AI wristband with sensor light and side button"
            className="h-full w-full object-contain p-6"
          />
        </div>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-foreground">
          What is Band?
        </h1>
        <p className="mt-3 max-w-sm text-base leading-relaxed text-muted-foreground">
          Band is a woven wristband you talk to. Say or type what you want and
          it goes and does it — a task, a note kept word for word, or a
          standing rule that keeps running in the background.
        </p>

        <Section title="How it works">
          <p>
            <strong className="text-foreground">Tasks.</strong> Ask once — out
            loud or in the app — and Band goes and does it. You get a buzz and
            a plain-English result when it's done, or when it needs you.
          </p>
          <p>
            <strong className="text-foreground">Notes.</strong> Double-tap the
            button and speak. The note is saved word for word, searchable in
            the app, with a title Band writes for you.
          </p>
          <p>
            <strong className="text-foreground">Standing rules.</strong> Some
            requests shouldn't happen once — they should keep happening. Band
            turns them into rules that run in the background and reports every
            time they fire.
          </p>
        </Section>

        <Section title="What the buzzes mean">
          <p>
            You never have to look at a screen to know where things stand. One
            short buzz means Band heard you. Two short buzzes means it
            accepted the task. Three short buzzes means it needs an answer
            from you. One long buzz means done. Two long buzzes means it
            couldn't finish.
          </p>
        </Section>

        <Section title="The hardware">
          <p>
            Band carries a heart rate sensor and motion sensing that run
            continuously in the background, a microphone for voice requests, a
            vibration motor for answers, and one physical button. The strap is
            woven, water resistant, and the battery lasts all day.
          </p>
        </Section>

        <div className="neu-inset relative mt-4 aspect-square w-full max-w-[220px] overflow-hidden rounded-[2rem]">
          <img
            src={bandSensors}
            alt="Underside of Band showing the rear heart rate sensors and clasp"
            className="h-full w-full object-contain p-6"
          />
        </div>

        <Section title="The Band app">
          <p>
            The companion app is where everything lands: your tasks and what
            happened with them, your notes word for word, your health history,
            and the connections Band can act on. The band itself is always one
            tap away — battery, connection, and live sensor readings.
          </p>
        </Section>

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
