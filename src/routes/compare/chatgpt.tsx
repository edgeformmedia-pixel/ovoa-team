import { createFileRoute } from "@tanstack/react-router";
import { CompareTable, ContentPage } from "@/components/ContentPage";
import { getPlans } from "@/lib/membership/membership.functions";
import { perLabel, planOf } from "@/lib/membership/copy";
import type { PlansResult } from "@/lib/membership/plans";
import { articleJsonLd, breadcrumbs, faqJsonLd, jsonLd, pageHead, type Faq } from "@/lib/seo";

// OVOA vs ChatGPT. ChatGPT facts as reported in September 2026 (Engadget on
// scheduled tasks for free accounts, 2026-08-25, and the Mac Messages plugin;
// the WhatsApp line ending 2026-01-15; plan prices from OpenAI's announcements
// as covered by TechCrunch and BleepingComputer). Only the prices every report
// agrees on are named. Recheck and update CHECKED.

const PATH = "/compare/chatgpt";
const TITLE = "OVOA vs ChatGPT: an assistant you text, or a chat app?";
const DESCRIPTION =
  "ChatGPT is the best place to think something through. OVOA is an assistant you text in iMessage that texts you first and gets things done. How they differ.";
const CHECKED = "September 27, 2026";
const CHECKED_ISO = "2026-09-27";

function faqsFor(data: PlansResult | undefined): Faq[] {
  const base = perLabel(planOf(data, "base", "monthly"));
  return [
    {
      q: "Can I text ChatGPT in iMessage?",
      a: "Not from an iPhone. ChatGPT lives in its own app, on the web and on the desktop. Its WhatsApp number stopped working in January 2026. A Mac plugin lets ChatGPT draft and send iMessages for you, but you still talk to ChatGPT in its app.",
    },
    {
      q: "Is OVOA built on ChatGPT?",
      a: "No. OVOA runs on other AI models, and asks you before anything you say goes to an AI company.",
    },
    {
      q: "Which is cheaper?",
      a: `ChatGPT has a free plan (with ads) and paid plans, with Plus at $20 a month. OVOA's first texts are free, then Base is ${base} and includes every AI feature.`,
    },
    {
      q: "Should I cancel ChatGPT for OVOA?",
      a: "Probably not, if you use it to write, code or think things through. OVOA is for running your day: reminders, plans, follow-ups and small jobs done for you. Plenty of people use both.",
    },
  ];
}

export const Route = createFileRoute("/compare/chatgpt")({
  component: ChatGptPage,
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
      jsonLd(breadcrumbs("OVOA vs ChatGPT", PATH, { name: "Compare", path: "/compare" })),
    ],
  }),
});

function ChatGptPage() {
  const data = Route.useLoaderData();
  const base = perLabel(planOf(data, "base", "monthly"));
  return (
    <ContentPage
      crumbs={[
        { name: "Compare", path: "/compare" },
        { name: "OVOA vs ChatGPT", path: PATH },
      ]}
      eyebrow="Compare"
      title="OVOA vs ChatGPT"
      updated={CHECKED}
      lede={
        <p>
          ChatGPT is where you go to think: write, research, brainstorm, code. OVOA is where you
          send the stuff you don&rsquo;t want to think about: a text in iMessage, and it gets
          handled, with a text back when it&rsquo;s done. We make OVOA, so take this with that in
          mind; we&rsquo;ve tried to be straight about where ChatGPT wins.
        </p>
      }
      faqs={faqsFor(data)}
      related={[
        {
          to: "/compare/siri",
          label: "OVOA vs Siri",
          blurb: "Apple's new Siri, and what each one is for.",
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
            <strong>Pick ChatGPT</strong> for long conversations, writing, coding, studying and
            anything you want to go back and forth on.
          </li>
          <li>
            <strong>Pick OVOA</strong> to run your day from Messages: reminders that text you back,
            routines it checks in on, email and calendar handled, plans with friends, a website for
            your business. It texts you first, so you don&rsquo;t have to remember to open it.
          </li>
        </ul>
      </section>

      <section>
        <h2>Side by side</h2>
        <CompareTable
          columns={["OVOA", "ChatGPT"]}
          rows={[
            {
              label: "How you reach it",
              values: [
                "Text it in iMessage, talk to it in the OVOA app, or press the OVOA Fit",
                "Its app on iPhone, the web and the desktop",
              ],
            },
            {
              label: "Texts you first",
              values: [
                "Yes: briefs, reminders, meeting prep, routine check-ins, up to 12 a day",
                "Scheduled tasks, delivered as notifications (on the free plan, up to 3, each at most once a day)",
              ],
            },
            {
              label: "Does things for you",
              values: [
                "Reminders, notes, lists, routines, Gmail and Google Calendar, asking before it sends",
                "Answers, writes and researches; can connect to other apps",
              ],
            },
            {
              label: "Memory",
              values: [
                "Remembers what you tell it; conversations are deleted after 14 days, with a daily summary kept",
                "Saved memories and past chats, on by default",
              ],
            },
            {
              label: "Builds things",
              values: [
                "Live websites with a contact form, and small games, by text",
                "Writing, code, images and documents in the chat",
              ],
            },
            {
              label: "Works with other people",
              values: [
                "Finds a time with a friend's OVOA, asks them things, shares games",
                "You can share a chat",
              ],
            },
            {
              label: "Price",
              values: [
                `First texts free, then ${base} (Base)`,
                "Free (with ads), paid plans with Plus at $20/month",
              ],
            },
          ]}
        />
      </section>

      <section>
        <h2>Where ChatGPT is better</h2>
        <p>
          For anything you want to work through, ChatGPT is hard to beat: long answers, drafts you
          edit together, code, images, files, voice conversations. It works on every platform,
          and it has a free plan. OVOA keeps its replies short on purpose, because they arrive as
          texts.
        </p>
      </section>

      <section>
        <h2>Where OVOA is better</h2>
        <p>
          <strong>You don&rsquo;t open anything.</strong> OVOA is a contact in Messages. You text
          it the way you&rsquo;d text a friend, and it lives in the same thread as your life.
        </p>
        <p>
          <strong>It speaks up.</strong> Your morning brief, prep before a meeting, when to leave,
          a check-in on your routines, a heads up when money is tight. Reply
          &ldquo;done&rdquo; or &ldquo;move it to 4&rdquo; and it takes care of it.
        </p>
        <p>
          <strong>It acts, then tells you.</strong> When the next step is clear, OVOA does it and
          says what it did. Before anything that matters, like sending an email, it asks: reply
          YES.
        </p>
        <p>
          <strong>It forgets on purpose.</strong> Conversations are deleted after 14 days, with a
          short summary of each day kept. Nothing is sold, used for ads or used to train AI.
        </p>
        <p>
          <a href="/imessage">See everything OVOA does by text</a>.
        </p>
      </section>
    </ContentPage>
  );
}
