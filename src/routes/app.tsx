import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { ContentPage } from "@/components/ContentPage";
import { getPlans } from "@/lib/membership/membership.functions";
import { perLabel, planOf } from "@/lib/membership/copy";
import { TESTFLIGHT_APP_URL, type PlansResult } from "@/lib/membership/plans";
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
      a: "On your iPhone, install TestFlight, Apple's app for betas, from the App Store. Then open the OVOA beta link on ovoa.ai/app (or ovoa.ai/account), tap Accept and Install, and sign in to OVOA with your email.",
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
    copy: "Tap once and OVOA listens. Say it out loud instead of typing; it gets plain, messy, real-life requests, and you tap again to stop.",
  },
  {
    title: "Friends",
    copy: "Add friends by @username and your OVOA talks to theirs: finding a time, asking something, passing on a reminder. You choose how much each friend's OVOA can reach, and anything beyond that comes to you first.",
  },
  {
    title: "Apps",
    copy: "Add-ons made by OVOA, like Morning Brief, Day and Activity, install in a tap. Each one says up front whether it uses credits.",
  },
  {
    title: "Create your own app",
    copy: "Say or type what you want, and OVOA makes it into an app.",
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

const SCREENS = [
  { src: "/img/app-listening.webp", alt: "The OVOA app listening, with a sphere of moving dots" },
  { src: "/img/app-friends.webp", alt: "The Friends screen, where you add friends by @username" },
  {
    src: "/img/app-apps.webp",
    alt: "The Apps screen with Create, Morning Brief, Day and Activity",
  },
];

const ADDONS: { title: string; copy: string; credits: string }[] = [
  {
    title: "Morning Brief",
    copy: "Your day, read out to you each morning.",
    credits: "Uses some credits: a few moments of it each morning.",
  },
  {
    title: "Day",
    copy: "Today on one timeline: what's next and what's done.",
    credits: "Uses no credits",
  },
  {
    title: "Activity",
    copy: "Steps, heart rate and sleep from your band and Health.",
    credits: "Uses no credits",
  },
];

function Step({
  n,
  title,
  icon,
  children,
}: {
  n: number;
  title: string;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4 rounded-2xl border border-landing-line px-4 py-4">
      {icon ? (
        <img src={icon} alt="" width={48} height={48} className="size-12 shrink-0 rounded-[11px]" />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0a84ff] text-sm font-semibold text-white"
        >
          {n}
        </span>
      )}
      <div className="min-w-0 text-[15px]">
        <span className="block font-semibold text-landing-ink">{title}</span>
        <span className="mt-0.5 block">{children}</span>
      </div>
    </li>
  );
}

function StepButton({
  href,
  children,
  newTab = true,
}: {
  href: string;
  children: ReactNode;
  newTab?: boolean;
}) {
  return (
    <a
      href={href}
      {...(newTab ? { target: "_blank", rel: "noreferrer" } : {})}
      className="mt-3 flex h-10 w-fit items-center rounded-full bg-landing-ink px-5 text-sm font-semibold !text-landing-canvas !no-underline"
    >
      {children}
    </a>
  );
}

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
      cta={
        <a
          href="#get-the-app"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0a84ff] px-6 text-[15px] font-semibold text-white no-underline transition-transform hover:-translate-y-0.5"
        >
          <Download className="size-5" aria-hidden="true" />
          Get the app
        </a>
      }
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
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {SCREENS.map((s) => (
            <img
              key={s.src}
              src={s.src}
              alt={s.alt}
              width={920}
              height={2000}
              loading="lazy"
              className="h-auto w-full rounded-2xl border border-landing-line"
            />
          ))}
        </div>
      </section>

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
        <h2>Add-ons</h2>
        <ul className="!list-none !pl-0">
          {ADDONS.map((a) => (
            <li key={a.title} className="rounded-2xl border border-landing-line px-4 py-3">
              <span className="font-semibold text-landing-ink">{a.title}</span>
              <span className="mt-0.5 block text-[15px]">{a.copy}</span>
              <span className="mt-0.5 block text-[13px] opacity-70">{a.credits}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="get-the-app" className="scroll-mt-24">
        <h2>Get the app in three steps</h2>
        <p>On your iPhone. It&rsquo;s free, and takes about a minute.</p>
        <ol className="!list-none !pl-0">
          <Step n={1} title="Install TestFlight" icon="/img/testflight-icon.png">
            TestFlight is Apple&rsquo;s app for trying apps before they reach the App Store.
            <StepButton href={TESTFLIGHT_APP_URL}>Get TestFlight</StepButton>
          </Step>
          <Step n={2} title="Join the OVOA beta">
            {data?.betaUrl ? (
              <>
                Open the link below, tap <strong>Accept</strong>, then <strong>Install</strong>.
                <StepButton href={data.betaUrl}>Join the OVOA beta</StepButton>
              </>
            ) : (
              <>
                Make a free account and your beta invite comes by email from TestFlight. Open it,
                tap <strong>View in TestFlight</strong>, then <strong>Install</strong>.
                <StepButton href="/account" newTab={false}>
                  Make a free account
                </StepButton>
              </>
            )}
          </Step>
          <Step n={3} title="Open OVOA and sign in" icon="/img/ovoa-app-icon.svg">
            Use your email. New to OVOA? The app makes your free account, or{" "}
            <a href="/account">make it here first</a>.
          </Step>
        </ol>
        <p>
          On a computer? Open <strong>ovoa.ai/app</strong> on your iPhone. Prefer not to install
          anything? <a href="/text">Just text OVOA</a>.
        </p>
      </section>
    </ContentPage>
  );
}
