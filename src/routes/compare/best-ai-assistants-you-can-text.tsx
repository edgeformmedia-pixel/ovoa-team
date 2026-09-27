import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/ContentPage";
import { getPlans } from "@/lib/membership/membership.functions";
import { perLabel, planOf } from "@/lib/membership/copy";
import type { PlansResult } from "@/lib/membership/plans";
import {
  SITE_URL,
  articleJsonLd,
  breadcrumbs,
  faqJsonLd,
  jsonLd,
  pageHead,
  type Faq,
} from "@/lib/seo";

// The guide people search for ("best AI assistant you can text"). Each entry
// says only what that company's own site (or, where noted, recent news) said
// on CHECKED; anything that couldn't be confirmed is left out rather than
// guessed. Recheck every entry before changing CHECKED.

const PATH = "/compare/best-ai-assistants-you-can-text";
const TITLE = "The best AI assistants you can text in 2026";
const DESCRIPTION =
  "OVOA, Poke, Sidekicks, Olly, Arlo and Zo: the AI assistants you can text, what each is best at, how you reach it and what it costs. Checked September 2026.";
const CHECKED = "September 27, 2026";
const CHECKED_ISO = "2026-09-27";

type Pick = {
  id: string;
  name: string;
  site: string;
  bestFor: string;
  reach: string;
  price: string;
  good: string;
  catch: string;
};

function picksFor(data: PlansResult | undefined): Pick[] {
  const base = perLabel(planOf(data, "base", "monthly"));
  return [
    {
      id: "ovoa",
      name: "OVOA",
      site: `${SITE_URL}/imessage`,
      bestFor: "Running your day from iMessage, with an assistant that texts you first",
      reach: "iMessage, the OVOA iPhone app, and the OVOA Band wristband",
      price: `First 5 texts free with no account, 5 more with an email, then Base at ${base}`,
      good: "Texts you your brief, reminders, meeting prep and routine check-ins, and follows up when a thread goes quiet. Builds live websites and small games by text, and finds times with friends through their OVOA. Conversations are deleted after 14 days.",
      catch: "iMessage only, so no Android or group chats. It's in beta.",
    },
    {
      id: "poke",
      name: "Poke",
      site: "https://poke.com",
      bestFor: "Connecting lots of apps and building your own automations",
      reach: "iMessage, WhatsApp and Telegram",
      price: "Free, Pro $19/month, Ultra $199/month",
      good: "Connects to 30+ apps like Gmail and Notion, texts you first, and runs custom automations it calls Recipes. Apple approved it to run in Messages.",
      catch:
        "Its privacy policy lets it train on your data unless you choose Maximum Privacy. Cognition, the company behind the coding agent Devin, bought it in July 2026.",
    },
    {
      id: "sidekicks",
      name: "Sidekicks",
      site: "https://sidekicks.chat",
      bestFor: "Android users and group chats",
      reach: "iMessage and SMS, including group chats",
      price: "Free with limited messages, Pro $19.99/month",
      good: "Pick a persona (assistant, health coach, wellness coach, friend). Reminders, to-dos, meal tracking from photos and shared reminders in group chats.",
      catch: "Proactive check-ins, web search and image generation are Pro only.",
    },
    {
      id: "olly",
      name: "Olly",
      site: "https://olly.bot",
      bestFor: "Quick answers, documents and images in iMessage",
      reach: "iMessage, plus Siri on iPhone, Apple Watch, Mac and CarPlay, and the web",
      price: "Free to start; paid plan prices aren't listed on its site",
      good: "Answers from the web, summarizes PDFs and documents, sets reminders, edits and makes images, and takes voice messages.",
      catch: "More of a question answerer than an assistant that runs things for you.",
    },
    {
      id: "arlo",
      name: "Arlo",
      site: "https://arlo.sh",
      bestFor: "Work, across thousands of tools",
      reach: "iMessage and SMS, WhatsApp, Slack, Microsoft Teams and phone calls",
      price: "Free with $25 in credits; $20/month subscription with credit top-ups",
      good: "Acts across 3,000+ work tools, asks before it sends or writes anything, keeps an audit trail, and makes and takes phone calls.",
      catch: "Built for work, and priced by credits, so heavy use costs more.",
    },
    {
      id: "zo",
      name: "Zo Computer",
      site: "https://zo.computer",
      bestFor: "Power users who want their own AI computer in the cloud",
      reach: "iMessage and SMS, email, Telegram, Discord, Slack, the web and a desktop app",
      price: "14-day free trial, then Basic $18/month, Pro $64/month, Ultra $200/month",
      good: "A cloud computer with an agent that runs around the clock: it hosts sites, runs automations and keeps your files, and every channel reaches the same Zo.",
      catch: "More than most people need for reminders and plans, and priced like it.",
    },
  ];
}

function faqsFor(data: PlansResult | undefined): Faq[] {
  const base = perLabel(planOf(data, "base", "monthly"));
  return [
    {
      q: "Can I text ChatGPT or Siri?",
      a: "Not as a contact in Messages. ChatGPT lives in its own app (its WhatsApp number ended in January 2026), and Siri works by voice and in the Siri app. The assistants on this list are ones you text like a person.",
    },
    {
      q: "Which AI assistant can I text for free?",
      a: `Most have a free start. OVOA gives you 5 texts with no account and 5 more with an email, then Base is ${base}. Poke and Sidekicks have free plans with limits, Olly is free to start, Arlo gives you starting credits, and Zo has a 14-day trial.`,
    },
    {
      q: "Which one works on Android?",
      a: "Sidekicks answers SMS, so it works on Android. Poke works on WhatsApp and Telegram, and Arlo on WhatsApp, Slack and Teams. OVOA and Olly are iMessage only.",
    },
    {
      q: "Which one texts you first?",
      a: "OVOA and Poke both text you first. Sidekicks does proactive check-ins on Pro, and Arlo sends a daily briefing.",
    },
  ];
}

export const Route = createFileRoute("/compare/best-ai-assistants-you-can-text")({
  component: GuidePage,
  staticData: { sitemap: true },
  loader: () => getPlans(),
  head: ({ loaderData }) => ({
    ...pageHead({ title: TITLE, description: DESCRIPTION, path: PATH, type: "article" }),
    scripts: [
      jsonLd(
        articleJsonLd({
          title: TITLE,
          description: DESCRIPTION,
          path: PATH,
          published: CHECKED_ISO,
          modified: CHECKED_ISO,
        }),
      ),
      jsonLd({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: TITLE,
        itemListOrder: "https://schema.org/ItemListUnordered",
        itemListElement: picksFor(loaderData).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.name,
          url: `${SITE_URL}${PATH}#${p.id}`,
        })),
      }),
      jsonLd(faqJsonLd(faqsFor(loaderData))),
      jsonLd(
        breadcrumbs("Best AI assistants you can text", PATH, { name: "Compare", path: "/compare" }),
      ),
    ],
  }),
});

function GuidePage() {
  const data = Route.useLoaderData();
  const picks = picksFor(data);
  return (
    <ContentPage
      crumbs={[
        { name: "Compare", path: "/compare" },
        { name: "Best AI assistants you can text", path: PATH },
      ]}
      eyebrow="Guide"
      title="The best AI assistants you can text in 2026"
      updated={CHECKED}
      lede={
        <p>
          An assistant you text is one you&rsquo;ll actually use: no app to open, just a thread in
          Messages. Here are the ones worth knowing, what each is best at, and what it costs. We
          make OVOA, so it&rsquo;s first; everything about the others comes from their own sites
          and recent news, checked on {CHECKED}.
        </p>
      }
      faqs={faqsFor(data)}
      related={[
        {
          to: "/compare/chatgpt",
          label: "OVOA vs ChatGPT",
          blurb: "An assistant that acts, or a chat app you open.",
        },
        {
          to: "/compare/siri",
          label: "OVOA vs Siri",
          blurb: "Apple's new Siri, and what each one is for.",
        },
        {
          to: "/imessage",
          label: "Texting OVOA",
          blurb: "What OVOA does in Messages, in detail.",
        },
        {
          to: "/websites",
          label: "Websites by text",
          blurb: "Get a finished website back from a text.",
        },
      ]}
    >
      <section>
        <h2>Quick picks</h2>
        <ul>
          {picks.map((p) => (
            <li key={p.id}>
              <a href={`#${p.id}`}>{p.name}</a>: {p.bestFor.charAt(0).toLowerCase() + p.bestFor.slice(1)}.
            </li>
          ))}
        </ul>
      </section>

      {picks.map((p, i) => (
        <section key={p.id} id={p.id} className="scroll-mt-20">
          <h2>
            {i + 1}. {p.name}
          </h2>
          <p className="!mt-1 text-sm">
            <a href={p.site} rel={p.id === "ovoa" ? undefined : "noopener"}>
              {p.site.replace(/^https:\/\/(www\.)?/, "")}
            </a>
          </p>
          <dl className="mt-4 grid gap-x-6 gap-y-2 rounded-2xl border border-landing-line p-4 text-[15px] sm:grid-cols-[9rem_1fr]">
            <dt className="font-semibold text-landing-ink">Best for</dt>
            <dd>{p.bestFor}</dd>
            <dt className="font-semibold text-landing-ink">How you reach it</dt>
            <dd>{p.reach}</dd>
            <dt className="font-semibold text-landing-ink">Price</dt>
            <dd>{p.price}</dd>
          </dl>
          <p>{p.good}</p>
          <p>
            <strong>The catch:</strong> {p.catch}
          </p>
        </section>
      ))}

      <section>
        <h2>What about ChatGPT and Siri?</h2>
        <p>
          You can&rsquo;t text either one like a contact. ChatGPT is a chat app (and its WhatsApp
          number ended in January 2026); the new Siri in iOS 27 works by voice and in the Siri
          app. Both are great at what they do. We compared them with OVOA in{" "}
          <a href="/compare/chatgpt">OVOA vs ChatGPT</a> and <a href="/compare/siri">OVOA vs Siri</a>
          .
        </p>
      </section>

      <section>
        <h2>How to choose</h2>
        <ul>
          <li>
            <strong>On an iPhone and want your day handled?</strong> OVOA.
          </li>
          <li>
            <strong>Need Android, SMS or group chats?</strong> Sidekicks.
          </li>
          <li>
            <strong>Want to wire up lots of apps yourself?</strong> Poke.
          </li>
          <li>
            <strong>It&rsquo;s for work, across Slack and Teams?</strong> Arlo.
          </li>
          <li>
            <strong>Mostly want quick answers?</strong> Olly.
          </li>
          <li>
            <strong>Want a whole AI computer?</strong> Zo.
          </li>
        </ul>
      </section>
    </ContentPage>
  );
}
