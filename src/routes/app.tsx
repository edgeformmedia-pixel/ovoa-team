import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/ContentPage";
import { getPlans } from "@/lib/membership/membership.functions";
import { perLabel, planOf } from "@/lib/membership/copy";
import type { PlansResult } from "@/lib/membership/plans";
import { breadcrumbs, faqJsonLd, jsonLd, pageHead, type Faq } from "@/lib/seo";

// The iPhone app: the same OVOA as the iMessage bot, plus what only a phone
// can do. It ships through Apple TestFlight while it's in beta.

const PATH = "/app";
const TITLE = "OVOA app: the iPhone app for your AI assistant";
const DESCRIPTION =
  "The OVOA iPhone app is the same assistant you text, with voice, your contacts and Reminders, health data and OVOA Fit. Free beta through TestFlight.";

function faqsFor(data: PlansResult | undefined): Faq[] {
  const base = perLabel(planOf(data, "base", "monthly"));
  return [
    {
      q: "Do I need the app to use OVOA?",
      a: "No. Texting OVOA works on its own, straight from Messages. The app adds talking out loud, things that run on your phone itself, and OVOA Fit.",
    },
    {
      q: "Is the app free?",
      a: `Yes, the app is free and in beta through Apple TestFlight. The assistant behind it is part of OVOA Base at ${base}; your first texts are free with no account.`,
    },
    {
      q: "How do I get the beta?",
      a: "Make a free OVOA account. Apple emails you a TestFlight invite; open it on your iPhone, tap View in TestFlight, then Install.",
    },
    {
      q: "Is it the same OVOA as the one I text?",
      a: "Yes. Texts and the app share one memory, one to-do list, and the same reminders and routines. Start by text and finish in the app, or the other way around.",
    },
  ];
}

export const Route = createFileRoute("/app")({
  component: AppPage,
  staticData: { sitemap: true },
  loader: () => getPlans(),
  head: ({ loaderData }) => ({
    ...pageHead({ title: TITLE, description: DESCRIPTION, path: PATH }),
    scripts: [jsonLd(faqJsonLd(faqsFor(loaderData))), jsonLd(breadcrumbs("OVOA app", PATH))],
  }),
});

const FEATURES: { title: string; copy: string }[] = [
  {
    title: "Talk to it",
    copy: "Say it out loud instead of typing. OVOA gets plain, messy, real-life requests.",
  },
  {
    title: "Your phone, handled",
    copy: "Text or call someone for you, use your contacts, and add to the Reminders app.",
  },
  {
    title: "Health",
    copy: "Apple Health and OVOA Fit heart rate and activity, with your history in one place.",
  },
  {
    title: "Everything in one place",
    copy: "Your tasks, notes saved word for word, and the standing rules that run in the background.",
  },
];

function AppPage() {
  const data = Route.useLoaderData();
  const faqs = faqsFor(data);
  return (
    <ContentPage
      crumbs={[{ name: "OVOA app", path: PATH }]}
      eyebrow="OVOA app · Beta"
      title="The OVOA iPhone app."
      lede={
        <p>
          The same assistant you text, with everything a phone can add. Talk to it, let it use your
          contacts and Reminders, and pair OVOA Fit. Free while it&rsquo;s in beta.
        </p>
      }
      faqs={faqs}
      related={[
        {
          to: "/imessage",
          label: "Text OVOA in iMessage",
          blurb: "No app needed: the assistant, straight from Messages.",
        },
        {
          to: "/fit",
          label: "OVOA Fit",
          blurb: "The health tracker whose AI texts you what your data means.",
        },
        {
          to: "/early-access",
          label: "Plans",
          blurb: "Free, Base, Plus and Pro, monthly or yearly.",
        },
      ]}
    >
      <section>
        <h2>What the app adds</h2>
        <ul className="!list-none !pl-0">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-2xl border border-landing-line px-4 py-3">
              <span className="font-semibold text-landing-ink">{f.title}</span>
              <span className="mt-0.5 block text-[15px]">{f.copy}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Get the beta</h2>
        <ol>
          <li>
            <strong>Make a free account.</strong> <a href="/account">Sign in or sign up</a> with
            your email.
          </li>
          <li>
            <strong>Open Apple&rsquo;s invite.</strong> It comes from TestFlight, on your iPhone.
          </li>
          <li>
            <strong>Install.</strong> Tap View in TestFlight, then Install.
          </li>
        </ol>
        <p>
          Prefer not to install anything? <a href="/text">Just text OVOA</a>.
        </p>
      </section>
    </ContentPage>
  );
}
