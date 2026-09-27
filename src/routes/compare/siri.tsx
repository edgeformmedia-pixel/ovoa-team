import { createFileRoute } from "@tanstack/react-router";
import { CompareTable, ContentPage } from "@/components/ContentPage";
import { getPlans } from "@/lib/membership/membership.functions";
import { perLabel, planOf } from "@/lib/membership/copy";
import type { PlansResult } from "@/lib/membership/plans";
import { articleJsonLd, breadcrumbs, faqJsonLd, jsonLd, pageHead, type Faq } from "@/lib/seo";

// OVOA vs Siri. Siri facts are from Apple's own announcement of Siri AI in
// iOS 27 (apple.com/newsroom, 2026-09-14); anything Apple didn't say isn't
// claimed. Recheck when Apple ships changes, and update CHECKED.

const PATH = "/compare/siri";
const TITLE = "OVOA vs Siri: which AI assistant for your iPhone?";
const DESCRIPTION =
  "Siri is free, built in and reaches deep into your iPhone. OVOA you text, it texts you first, and it follows through. What each does best, and why to use both.";
const CHECKED = "September 27, 2026";
const CHECKED_ISO = "2026-09-27";

function faqsFor(data: PlansResult | undefined): Faq[] {
  const base = perLabel(planOf(data, "base", "monthly"));
  return [
    {
      q: "Can I text Siri?",
      a: "Not as a contact in Messages. Siri works by voice, and the new Siri app on iPhone keeps your history. OVOA is a contact you text in iMessage, from anywhere you'd text a friend.",
    },
    {
      q: "Is OVOA free like Siri?",
      a: `Your first texts to OVOA are free, with no account. After that, OVOA Base is ${base}. Siri is free, though Apple says some expanded features may cost a fee in the future.`,
    },
    {
      q: "Can I use OVOA and Siri together?",
      a: "Yes, and it makes sense to. Siri is great at your iPhone itself: timers, settings, your photos and messages. OVOA is for the things that need following through over days.",
    },
    {
      q: "Does OVOA need a new iPhone?",
      a: "Texting OVOA works on any iPhone with iMessage. Apple's new Siri needs an iPhone 15 Pro or later.",
    },
  ];
}

export const Route = createFileRoute("/compare/siri")({
  component: SiriPage,
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
      jsonLd(faqJsonLd(faqsFor(loaderData))),
      jsonLd(breadcrumbs("OVOA vs Siri", PATH, { name: "Compare", path: "/compare" })),
    ],
  }),
});

function SiriPage() {
  const data = Route.useLoaderData();
  const base = perLabel(planOf(data, "base", "monthly"));
  return (
    <ContentPage
      crumbs={[
        { name: "Compare", path: "/compare" },
        { name: "OVOA vs Siri", path: PATH },
      ]}
      eyebrow="Compare"
      title="OVOA vs Siri"
      updated={CHECKED}
      lede={
        <p>
          Apple&rsquo;s new Siri, built with Google&rsquo;s Gemini models and released with iOS 27
          in September 2026, is a real step up. It&rsquo;s free, it&rsquo;s already on your
          iPhone, and it can see into your apps. OVOA is a different kind of assistant: one you
          text, that texts you back first, and that keeps going until the thing is done. We make
          OVOA, so read this knowing that; we&rsquo;ve tried to be fair.
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
          to: "/compare/best-ai-assistants-you-can-text",
          label: "The best AI assistants you can text",
          blurb: "Every texting assistant worth knowing, side by side.",
        },
      ]}
    >
      <section>
        <h2>The short version</h2>
        <ul>
          <li>
            <strong>Pick Siri</strong> for your iPhone itself: timers, settings, calls, finding a
            photo or a message, doing things inside your apps. It&rsquo;s free and hands-free.
          </li>
          <li>
            <strong>Pick OVOA</strong> for things that take follow-through: reminders that come
            back as texts, routines it checks in on, plans with other people, research, even a
            website for your business. You text it like a person, and it texts you first.
          </li>
          <li>
            <strong>Most people can use both.</strong> They don&rsquo;t get in each other&rsquo;s
            way.
          </li>
        </ul>
      </section>

      <section>
        <h2>Side by side</h2>
        <CompareTable
          columns={["OVOA", "Siri (iOS 27)"]}
          rows={[
            {
              label: "How you reach it",
              values: [
                "Text it in iMessage, talk to it in the OVOA app, or press the OVOA Band",
                "Your voice, or the Siri app on iPhone",
              ],
            },
            {
              label: "Texts you first",
              values: [
                "Yes: briefs, reminders, meeting prep, routine check-ins, up to 12 a day",
                "Apple hasn't said so",
              ],
            },
            {
              label: "Your iPhone's data",
              values: [
                "Its own memory, notes, lists and reminders; Gmail and Calendar once you connect Google",
                "Searches your messages, email and photos, and sees what's on screen",
              ],
            },
            {
              label: "Acts in other apps",
              values: [
                "Gmail and Google Calendar; phone actions wait for you in the OVOA app",
                "Inside Apple's apps and some third-party apps, like WhatsApp and Outlook",
              ],
            },
            {
              label: "Builds things",
              values: ["Websites and small games, by text", "Writing help (Write with Siri)"],
            },
            {
              label: "Works with other people",
              values: [
                "Finds a time with a friend's OVOA, asks them things, shares games",
                "Not a feature Apple lists",
              ],
            },
            {
              label: "Which iPhones",
              values: ["Any iPhone with iMessage (texting)", "iPhone 15 Pro and later"],
            },
            {
              label: "Price",
              values: [`First texts free, then ${base} (Base)`, "Free for now"],
            },
            {
              label: "Privacy",
              values: [
                "Deleted after 14 days except a daily summary; no ads, no selling, no training",
                "On the device where it can, otherwise Apple's Private Cloud Compute",
              ],
            },
          ]}
        />
      </section>

      <section>
        <h2>Where Siri is better</h2>
        <p>
          Siri is part of the iPhone. It can find the photo from last weekend, read the message
          your landlord sent, turn on Do Not Disturb, and do things inside your apps without you
          opening them. OVOA can&rsquo;t read your iPhone&rsquo;s messages or photos, and anything
          that has to happen on the phone (texting someone for you, adding to the Reminders app)
          waits for you in the OVOA app. Siri is also free, and hands-free.
        </p>
        <p>
          The catch: the new Siri is in beta, English only at launch, not available in the EU or
          China yet, and it needs an iPhone 15 Pro or newer.
        </p>
      </section>

      <section>
        <h2>Where OVOA is better</h2>
        <p>
          <strong>It lives in your texts.</strong> OVOA is a contact in Messages. You can text it
          from a meeting, reply to it later, and scroll back through what it did.
        </p>
        <p>
          <strong>It speaks up.</strong> OVOA texts you your morning brief, prep before a meeting,
          when to leave, and check-ins on your routines. Reply &ldquo;done&rdquo; or &ldquo;move it
          to 4&rdquo; and it takes care of it.
        </p>
        <p>
          <strong>It follows through.</strong> Standing rules keep running and report back. When
          it asks you something and you go quiet, it can follow up. On Plus, longer research runs
          in the background and comes back as a text.
        </p>
        <p>
          <strong>It makes things.</strong> Text &ldquo;build a website for my dog walking
          business&rdquo; and a few minutes later there&rsquo;s a live site with a contact form
          that texts you. <a href="/websites">More about websites by text</a>.
        </p>
      </section>
    </ContentPage>
  );
}
