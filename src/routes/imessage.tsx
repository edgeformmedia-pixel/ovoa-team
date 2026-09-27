import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/ContentPage";
import { getPlans } from "@/lib/membership/membership.functions";
import { perLabel, planOf } from "@/lib/membership/copy";
import type { PlansResult } from "@/lib/membership/plans";
import { breadcrumbs, faqJsonLd, jsonLd, pageHead, type Faq } from "@/lib/seo";

// Written for people looking for "an AI assistant I can text": what texting
// OVOA is, what to send it, what it sends you, and what it costs. Every claim
// here is how texting works today (ovoa-app docs/texting.md); prices come from
// the live plans.

const PATH = "/imessage";
const TITLE = "OVOA: the AI assistant you text in iMessage";
const DESCRIPTION =
  "Text OVOA in iMessage like a friend. It plans, reminds, remembers and follows through, texts you first when it matters, and builds websites. No app needed.";

function faqsFor(data: PlansResult | undefined): Faq[] {
  const base = perLabel(planOf(data, "base", "monthly"));
  return [
    {
      q: "Do I need to download an app?",
      a: "No. Texting OVOA works on its own, straight from Messages. The iPhone app adds talking out loud, the OVOA Band, and the things that run on your phone itself, like texting someone for you or adding to the Reminders app.",
    },
    {
      q: "Does it work on Android or over SMS?",
      a: "Not yet. OVOA only answers iMessage, because an SMS sender can be faked and OVOA acts on your account. SMS texts get a short note saying to use iMessage.",
    },
    {
      q: "Can OVOA text me first?",
      a: 'Yes, and it does by default: your morning brief, meeting prep, time to leave, reminders, routine check-ins and anything background work found on Plus. At most 12 a day, fewer when you don\'t answer, and it waits out the night. Text "stop texting me first" to turn it off.',
    },
    {
      q: "Can I add OVOA to a group chat?",
      a: "No. OVOA only talks to you one on one, and never to a number that isn't linked to an account.",
    },
    {
      q: "How much does it cost?",
      a: `Your first 5 texts are free with no account. Give OVOA your email and you get 5 more. After that, texting is part of OVOA Base at ${base}, which also includes every other AI feature. Plus and Pro give you more replies a day.`,
    },
    {
      q: "What happens to my texts?",
      a: "A text's words are kept only until OVOA answers it. The conversation is kept like the app's, and deleted after 14 days. OVOA doesn't sell your data, use it for ads or train AI on it.",
    },
  ];
}

export const Route = createFileRoute("/imessage")({
  component: IMessagePage,
  staticData: { sitemap: true },
  loader: () => getPlans(),
  head: ({ loaderData }) => ({
    ...pageHead({ title: TITLE, description: DESCRIPTION, path: PATH }),
    scripts: [
      jsonLd(faqJsonLd(faqsFor(loaderData))),
      jsonLd(breadcrumbs("AI assistant in iMessage", PATH)),
    ],
  }),
});

const EXAMPLES: { text: string; what: string }[] = [
  { text: "remind me to call mom at 6", what: "A reminder, texted back to you at 6." },
  {
    text: "every Sunday night send me the week ahead",
    what: "A standing rule that keeps running and reports back each time.",
  },
  {
    text: "what did I say about the Airbnb?",
    what: "It remembers what you told it and finds it again.",
  },
  { text: "spent $42 on groceries", what: "Money kept track of, with a heads up when it gets tight." },
  {
    text: "find a time with @maria next week",
    what: "It asks Maria's OVOA and texts you when there's a time you both have.",
  },
  {
    text: "build a website for my dog walking business",
    what: "A finished site at your own ovoa.ai address a few minutes later.",
  },
  {
    text: "make a game for me and my girlfriend",
    what: "A two player game, each of you on your own phone.",
  },
  {
    text: "look into the best stroller for running and text me",
    what: "On Plus, longer research runs in the background and comes back as a text.",
  },
];

function IMessagePage() {
  const data = Route.useLoaderData();
  const faqs = faqsFor(data);
  const base = perLabel(planOf(data, "base", "monthly"));
  return (
    <ContentPage
      crumbs={[{ name: "AI assistant in iMessage", path: PATH }]}
      eyebrow="Texting OVOA"
      title="The AI assistant you text in iMessage."
      lede={
        <p>
          OVOA lives in Messages. Text it like you&rsquo;d text a friend and it gets things done:
          plans, reminders, notes, your calendar, even a website. It texts you first when something
          needs you, and it follows up so nothing gets dropped.
        </p>
      }
      faqs={faqs}
      related={[
        {
          to: "/websites",
          label: "Build a website by text",
          blurb: "Tell OVOA about your business and get a finished site back.",
        },
        {
          to: "/compare/best-ai-assistants-you-can-text",
          label: "The best AI assistants you can text",
          blurb: "OVOA and the others, side by side, with what each is good at.",
        },
        {
          to: "/compare/chatgpt",
          label: "OVOA vs ChatGPT",
          blurb: "An assistant that acts and texts you first, or a chat app you open.",
        },
        {
          to: "/compare/siri",
          label: "OVOA vs Siri",
          blurb: "What each one does, and why you might want both.",
        },
      ]}
    >
      <section>
        <h2>How it works</h2>
        <ol>
          <li>
            <strong>Say hi.</strong> Open <a href="/text">ovoa.ai/text</a> on your iPhone and
            Messages opens with OVOA&rsquo;s number ready. On a computer, scan the QR code.
          </li>
          <li>
            <strong>Ask for anything.</strong> OVOA shows it read your text, types, and answers in a
            text or three.
          </li>
          <li>
            <strong>Say yes when it matters.</strong> Before OVOA sends an email or deletes
            something, it asks. Reply YES or give the text a thumbs up.
          </li>
        </ol>
      </section>

      <section>
        <h2>What you can text it</h2>
        <p>Plain, messy, real life requests. A few that work today:</p>
        <ul className="!list-none !pl-0">
          {EXAMPLES.map((e) => (
            <li key={e.text} className="rounded-2xl border border-landing-line px-4 py-3">
              <span className="font-semibold text-landing-ink">&ldquo;{e.text}&rdquo;</span>
              <span className="mt-0.5 block text-[15px]">{e.what}</span>
            </li>
          ))}
        </ul>
        <p>
          You can also send it a photo (a flyer, a receipt, a screenshot) or a voice note. Once you
          connect Google, it works with your Gmail and Calendar too.
        </p>
      </section>

      <section>
        <h2>It texts you first</h2>
        <p>
          Most assistants wait for you to ask. OVOA speaks up when it has a reason to: your morning
          brief, prep before a meeting, when it&rsquo;s time to leave, a reminder, a check-in on a
          routine (&ldquo;did you do Gym? Text done&rdquo;), what background work found (on Plus), or a
          message someone left on your website.
        </p>
        <p>
          Reply like you would to a person. &ldquo;Done&rdquo; checks off the routine,
          &ldquo;move it to 4&rdquo; moves the meeting, &ldquo;yes&rdquo; approves what it
          suggested. It sends at most 12 texts a day, backs off when you don&rsquo;t answer, and
          waits out the night. Text &ldquo;stop texting me first&rdquo; and it stops.
        </p>
      </section>

      <section>
        <h2>It follows through</h2>
        <p>
          When OVOA asks you something and you go quiet, it can follow up once a few hours later,
          and only if it still matters. On Plus, anything long, like research or a plan, goes to
          background work and the result comes back as a text. When the next step is clear it just does it and tells you
          what it did, instead of asking permission for every little thing.
        </p>
      </section>

      <section>
        <h2>The same OVOA as the app</h2>
        <p>
          Texts and the <a href="/">OVOA iPhone app</a> share one memory, one to-do list, one set
          of reminders and routines. Start something by text and finish it by voice, or the other
          way around. The app adds what only a phone can do: texting or calling someone for you,
          your iPhone&rsquo;s contacts and Reminders, and the{" "}
          <a href="/ai-wristband">OVOA Band</a> on your wrist. Those wait for you in the app, and
          the text tells you so.
        </p>
      </section>

      <section>
        <h2>Why iMessage only</h2>
        <p>
          OVOA acts on your account, so it has to know the text is really from you. An iMessage
          sender is verified by Apple; an SMS sender can be faked. So OVOA answers iMessage, one on
          one, and never in a group chat.
        </p>
      </section>

      <section>
        <h2>What it costs</h2>
        <p>
          Your first 5 texts are free, with no account. Give OVOA your email and you get 5 more.
          After that, texting is part of <a href="/early-access">OVOA Base</a> at {base}, along
          with every other AI feature. Plus and Pro give you more replies a day.
        </p>
      </section>
    </ContentPage>
  );
}
