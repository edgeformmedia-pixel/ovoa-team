import { createFileRoute, Link } from "@tanstack/react-router";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { APP_STORE_URL, breadcrumbs, jsonLd, ogImageMeta, SITE_URL } from "@/lib/seo";

const PAGE_TITLE = "OVOA press kit: facts, logo and contact";
const PAGE_DESCRIPTION =
  "Press kit for OVOA (ovoa.ai): the one-paragraph description, key facts about the OVOA assistant and the OVOA Band, the logo and product images, and how to reach the team.";

export const Route = createFileRoute("/press")({
  component: PressPage,
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/press` },
      ...ogImageMeta,
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/press` }],
    scripts: [jsonLd(breadcrumbs("OVOA press kit", "/press"))],
  }),
});

const FACTS: { term: string; detail: string }[] = [
  { term: "Name", detail: "OVOA (sometimes written Ovoa). The wristband is the OVOA Band." },
  { term: "Website", detail: "ovoa.ai" },
  {
    term: "What it is",
    detail: "An AI assistant you text or talk to that schedules, remembers and follows through.",
  },
  {
    term: "OVOA Band",
    detail:
      "A woven wristband with one button, heart rate and motion sensing, a microphone and a vibration motor.",
  },
  { term: "Platform", detail: "iPhone, with the app in beta through Apple's TestFlight." },
  { term: "Status", detail: "Public beta. The Band is beta hardware and ships to US addresses." },
  { term: "Contact", detail: "support@ovoa.ai" },
];

function PressPage() {
  return (
    <main className="min-h-dvh bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <Link to="/blog" className="text-xs text-landing-muted transition-colors hover:text-landing-ink">
          Blog
        </Link>
      </MembershipHeader>
      <div className="mx-auto max-w-[680px] px-5 pb-16 pt-12 sm:pt-16">
        <h1 className="text-[clamp(2.1rem,7vw,3rem)] font-semibold leading-[1.04]">
          OVOA press kit
        </h1>
        <section className="mt-8">
          <h2 className="text-2xl font-semibold">About OVOA</h2>
          <p className="mt-3 text-lg leading-relaxed text-landing-muted">
            OVOA is an AI assistant you text or talk to. It schedules, remembers and follows
            through, then tells you when it's done or when it needs you. The OVOA Band, a woven
            wristband with one button, brings OVOA to your wrist: press it to ask, double-tap to
            save a note word for word, and feel the answer in a buzz. OVOA is in public beta at
            ovoa.ai.
          </p>
        </section>
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Key facts</h2>
          <dl className="mt-4 divide-y divide-landing-line">
            {FACTS.map((fact) => (
              <div key={fact.term} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr]">
                <dt className="font-medium">{fact.term}</dt>
                <dd className="text-landing-muted">{fact.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Logo and images</h2>
          <ul className="mt-3 space-y-2 text-lg text-landing-muted">
            <li>
              <a href="/logo.png" className="underline hover:text-landing-ink">
                OVOA logo (PNG, 512 by 512)
              </a>
            </li>
            <li>
              <a href="/og-band.jpg" className="underline hover:text-landing-ink">
                OVOA Band product image (JPG, 1200 by 630)
              </a>
            </li>
          </ul>
        </section>
        <section className="mt-10">
          <h2 className="text-2xl font-semibold">Find OVOA</h2>
          <ul className="mt-3 space-y-2 text-lg text-landing-muted">
            <li>
              Website: <a href="/" className="underline hover:text-landing-ink">ovoa.ai</a>
            </li>
            <li>
              <a href={APP_STORE_URL} className="underline hover:text-landing-ink" rel="noopener">
                Ovoa on the App Store
              </a>
            </li>
            <li>
              Press and partnerships:{" "}
              <a href="mailto:support@ovoa.ai" className="underline hover:text-landing-ink">
                support@ovoa.ai
              </a>
            </li>
          </ul>
        </section>
        <SiteFooter />
      </div>
    </main>
  );
}
