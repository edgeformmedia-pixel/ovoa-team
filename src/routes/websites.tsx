import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/ContentPage";
import { getShowcase } from "@/lib/showcase.functions";
import { getPlans } from "@/lib/membership/membership.functions";
import { perLabel, planOf } from "@/lib/membership/copy";
import type { PlansResult } from "@/lib/membership/plans";
import { breadcrumbs, faqJsonLd, jsonLd, pageHead, type Faq } from "@/lib/seo";

// Websites by text (ovoa-app docs/sites.md): what you get, how changes work,
// where it lives, and the sites people chose to show off (their owners asked
// OVOA to put them in the gallery; none are shown without that).

const PATH = "/websites";
const TITLE = "Build a website by text with OVOA";
const DESCRIPTION =
  "Text OVOA about your business and get a finished, hosted website back a few minutes later, with a contact form that texts you. Change it by texting.";

function faqsFor(data: PlansResult | undefined): Faq[] {
  const base = perLabel(planOf(data, "base", "monthly"));
  return [
    {
      q: "How long does a website take?",
      a: "A few minutes. OVOA answers right away that it's on its way, then texts you the link when the site is live.",
    },
    {
      q: "Where does my site live?",
      a: "At your username on ovoa.ai, like thomas.ovoa.ai/tonys-pizza. Ask for an address of its own and it can be tonyspizza.ovoa.ai instead. Your own domain isn't supported yet.",
    },
    {
      q: "Can I build sites for my clients?",
      a: "Yes. Tell OVOA who the site is for (\"build a website for my client Tony's Pizza\") and it keeps track of which site is whose. You can have up to 25 sites.",
    },
    {
      q: "Will my site show up on Google?",
      a: "It's built to: every page gets a title and description written for search, a sitemap, and schema.org data about the business, using only the facts you gave.",
    },
    {
      q: "What does it cost?",
      a: `Building and changing websites is part of OVOA Base at ${base}, with every other AI feature. Hosting is included. Up to 30 builds or changes a day.`,
    },
    {
      q: "Can I take it down?",
      a: 'Text "take my pizza site down" and it goes offline; ask and it comes back. A deleted site can be brought back for 30 days.',
    },
  ];
}

export const Route = createFileRoute("/websites")({
  component: WebsitesPage,
  staticData: { sitemap: true },
  loader: async () => {
    const [plans, showcase] = await Promise.all([getPlans(), getShowcase()]);
    return { plans, showcase };
  },
  head: ({ loaderData }) => ({
    ...pageHead({ title: TITLE, description: DESCRIPTION, path: PATH }),
    scripts: [
      jsonLd(faqJsonLd(faqsFor(loaderData?.plans))),
      jsonLd(breadcrumbs("Websites by text", PATH)),
    ],
  }),
});

function WebsitesPage() {
  const { plans, showcase } = Route.useLoaderData();
  return (
    <ContentPage
      crumbs={[{ name: "Websites by text", path: PATH }]}
      eyebrow="Websites by text"
      title="Text OVOA. Get a website back."
      lede={
        <p>
          Tell OVOA about your business, or your client&rsquo;s, in a text. A few minutes later it
          sends you the link to a finished website that works on a phone and a laptop, hosted for
          you, with a contact form that texts you every message.
        </p>
      }
      faqs={faqsFor(plans)}
      related={[
        {
          to: "/imessage",
          label: "The AI assistant you text",
          blurb: "Everything else OVOA does in Messages.",
        },
        {
          to: "/compare/best-ai-assistants-you-can-text",
          label: "The best AI assistants you can text",
          blurb: "OVOA and the others, side by side.",
        },
      ]}
    >
      <section>
        <h2>How it works</h2>
        <ol>
          <li>
            <strong>Text what it&rsquo;s for.</strong> &ldquo;Build a website for my client
            Tony&rsquo;s Pizza. Wood fired, open till 11, 12 Main St.&rdquo; Everything you tell it
            goes in, and nothing you didn&rsquo;t: OVOA never makes up an address or a phone
            number.
          </li>
          <li>
            <strong>Get the link.</strong> The first time, OVOA asks you to pick a username. Then
            your site goes up at <strong>yourname.ovoa.ai/tonys-pizza</strong>, and OVOA texts you
            when it&rsquo;s live.
          </li>
          <li>
            <strong>Change it by texting.</strong> &ldquo;Open till 1am on Fridays.&rdquo;
            &ldquo;Make the call button bigger.&rdquo; Each change is added to the site&rsquo;s
            brief, so it can always be rebuilt from scratch.
          </li>
        </ol>
      </section>

      <section>
        <h2>Messages from your site come to you</h2>
        <p>
          Every site has a contact form. When a visitor sends a message, OVOA texts it to you and
          emails it too, with the visitor as the reply-to, so you can answer straight from your
          inbox. Ask &ldquo;any new leads?&rdquo; to see the last two weeks of them.
        </p>
      </section>

      <section>
        <h2>Fast, safe and ready for search</h2>
        <ul>
          <li>
            <strong>No scripts.</strong> Sites are plain HTML and CSS, so they load fast and
            there&rsquo;s nothing on them to hack.
          </li>
          <li>
            <strong>Written for search.</strong> A title and description for Google, a sitemap,
            and schema.org data about the business with only the facts you gave.
          </li>
          <li>
            <strong>Yours to run.</strong> Take a site down, put it back, move it to a new name,
            or delete it (it can come back for 30 days). Up to 25 sites.
          </li>
        </ul>
      </section>

      <section>
        <h2>Games, too</h2>
        <p>
          &ldquo;Make a game for me and my girlfriend, a quiz about each other.&rdquo; OVOA builds
          a small game at your ovoa.ai address. Two players each play on their own phone, or pass
          one phone around, or play against the computer. Games stay out of search and off your
          public page; they&rsquo;re just for the people you send them to.
        </p>
      </section>

      {showcase.length > 0 && (
        <section>
          <h2>Made with OVOA</h2>
          <p>Sites whose owners asked OVOA to show them here.</p>
          <ul className="!list-none !pl-0 grid gap-3 sm:grid-cols-2">
            {showcase.map((site) => (
              <li key={site.url} className="!mt-0">
                <a
                  href={site.url}
                  className="block h-full rounded-2xl border border-landing-line p-4 !no-underline transition-colors hover:border-landing-muted"
                >
                  <span className="block font-semibold text-landing-ink">{site.name}</span>
                  {site.description && (
                    <span className="mt-1 block text-sm font-normal leading-relaxed text-landing-muted">
                      {site.description}
                    </span>
                  )}
                  <span className="mt-2 block text-xs font-normal text-landing-muted">
                    {site.url.replace(/^https:\/\//, "")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p>
            Want yours here? Text OVOA &ldquo;put my site in the OVOA gallery&rdquo;, and
            &ldquo;take it out of the gallery&rdquo; whenever you like.
          </p>
        </section>
      )}
    </ContentPage>
  );
}
