import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/ContentPage";
import { breadcrumbs, jsonLd, pageHead } from "@/lib/seo";

// The comparisons and the texting-assistants guide in one place, so each is a
// click from the others (and from the footer).

const PATH = "/compare";
const TITLE = "Compare OVOA with ChatGPT, Siri and other AI assistants";
const DESCRIPTION =
  "How OVOA compares with ChatGPT, Apple's new Siri and the other AI assistants you can text: what each does best, how you reach it and what it costs.";

const PAGES = [
  {
    to: "/compare/best-ai-assistants-you-can-text",
    label: "The best AI assistants you can text in 2026",
    blurb: "OVOA, Poke, Sidekicks, Olly, Arlo and Zo, side by side.",
  },
  {
    to: "/compare/chatgpt",
    label: "OVOA vs ChatGPT",
    blurb: "An assistant you text that acts, or a chat app you open to think.",
  },
  {
    to: "/compare/siri",
    label: "OVOA vs Siri",
    blurb: "Apple's new Siri in iOS 27, and why you might want both.",
  },
];

export const Route = createFileRoute("/compare/")({
  component: ComparePage,
  staticData: { sitemap: true },
  head: () => ({
    ...pageHead({ title: TITLE, description: DESCRIPTION, path: PATH }),
    scripts: [jsonLd(breadcrumbs("Compare", PATH))],
  }),
});

function ComparePage() {
  return (
    <ContentPage
      crumbs={[{ name: "Compare", path: PATH }]}
      eyebrow="Compare"
      title="OVOA next to the others."
      lede={
        <p>
          Honest comparisons with the assistants people ask us about. We make OVOA, so we say where
          the others are better too.
        </p>
      }
    >
      <ul className="!list-none !pl-0 grid gap-3">
        {PAGES.map((page) => (
          <li key={page.to} className="!mt-0">
            <a
              href={page.to}
              className="block rounded-2xl border border-landing-line p-5 !no-underline transition-colors hover:border-landing-muted"
            >
              <span className="block text-lg font-semibold text-landing-ink">{page.label}</span>
              <span className="mt-1 block font-normal text-landing-muted">{page.blurb}</span>
            </a>
          </li>
        ))}
      </ul>
    </ContentPage>
  );
}
