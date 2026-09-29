import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/ContentPage";
import { ORGANIZATION, SITE_URL, breadcrumbs, jsonLd, pageHead } from "@/lib/seo";

// Who OVOA is and how it's built, for people and for search engines telling
// OVOA apart from the other "OVO"s. Only what the privacy policy, terms and FAQ
// already promise. (How OVOA Fit works is /ai-wristband.)

const PATH = "/about";
const TITLE = "About OVOA: the AI assistant you text or talk to";
const DESCRIPTION =
  "OVOA makes an AI assistant for iPhone you text in iMessage or talk to, and the OVOA Fit. What it's for, how it treats your data, and how to reach us.";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  staticData: { sitemap: true },
  head: () => ({
    ...pageHead({ title: TITLE, description: DESCRIPTION, path: PATH }),
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@type": "AboutPage",
        url: `${SITE_URL}${PATH}`,
        name: TITLE,
        description: DESCRIPTION,
        mainEntity: ORGANIZATION,
      }),
      jsonLd(breadcrumbs("About", PATH)),
    ],
  }),
});

function AboutPage() {
  return (
    <ContentPage
      crumbs={[{ name: "About", path: PATH }]}
      eyebrow="About OVOA"
      title="An assistant that actually does the thing."
      lede={
        <p>
          OVOA is an AI assistant for iPhone. You text it in
          iMessage or talk to it, and it plans, reminds, remembers and follows through, then tells
          you when it&rsquo;s done or when it needs you. The OVOA Fit puts it on your wrist.
        </p>
      }
      related={[
        {
          to: "/imessage",
          label: "Texting OVOA",
          blurb: "What it does in Messages, and what it texts you.",
        },
        {
          to: "/ai-wristband",
          label: "The OVOA Fit",
          blurb: "The wristband you press and talk to.",
        },
        { to: "/faq", label: "FAQ", blurb: "Plans, the beta, TestFlight and privacy." },
        { to: "/privacy", label: "Privacy policy", blurb: "Who gets what, and for how long." },
      ]}
    >
      <section>
        <h2>What OVOA is for</h2>
        <p>
          Most of life&rsquo;s admin is small stuff that slips: the reminder you meant to set, the
          email you meant to answer, the thing you said you&rsquo;d do on Sunday. OVOA is built to
          take those off your plate. Ask once, in plain words, and it handles it from start to
          finish. When a decision is yours, it asks instead of guessing.
        </p>
        <p>You can reach it three ways, and they all share one memory:</p>
        <ul>
          <li>
            <a href="/imessage">By text in iMessage</a>, with no app needed.
          </li>
          <li>
            By voice or typing in the <a href="/">OVOA iPhone app</a>.
          </li>
          <li>
            With the <a href="/ai-wristband">OVOA Fit</a>: press the button and talk.
          </li>
        </ul>
      </section>

      <section>
        <h2>How it treats your data</h2>
        <ul>
          <li>
            <strong>Talking stays on your iPhone.</strong> When you talk to OVOA in the app or on
            OVOA Fit, speech is turned into words on the phone, and only the words go on.
          </li>
          <li>
            <strong>You agree first.</strong> Nothing goes to an AI company until you say it can.
          </li>
          <li>
            <strong>It forgets on purpose.</strong> After 14 days, everything is deleted except a
            short summary of each day and what you set up yourself.
          </li>
          <li>
            <strong>No ads, no selling.</strong> Your data runs OVOA for you and nothing else. It
            isn&rsquo;t sold, used for ads, or used to train AI.
          </li>
        </ul>
        <p>
          The <a href="/privacy">privacy policy</a> has every detail, including each company that
          helps run OVOA.
        </p>
      </section>

      <section>
        <h2>Where things stand</h2>
        <p>
          OVOA is in beta. The iPhone app comes through Apple&rsquo;s TestFlight, texting works
          today in iMessage, and the OVOA Fit is beta hardware shipped to US addresses. New
          builds come often, and some things will break along the way.
        </p>
      </section>

      <section>
        <h2>Get in touch</h2>
        <p>
          Questions, bugs, press or partnerships: <a href="mailto:support@ovoa.ai">support@ovoa.ai</a>.
          Creators can join the <a href="/affiliates">affiliate program</a>.
        </p>
      </section>
    </ContentPage>
  );
}
