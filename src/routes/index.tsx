import { createFileRoute } from "@tanstack/react-router";
import { TextButtonPage } from "@/components/TextButton";
import bandFront from "@/assets/product/band-front-cutout.webp";
import bandProfile from "@/assets/product/band-profile-cutout.webp";
import bandSensors from "@/assets/product/band-sensors-cutout.webp";
import { getPublicTextNumber } from "@/lib/account/texting.functions";
import { getPlans } from "@/lib/membership/membership.functions";
import { bandProductJsonLd, perLabel, planOf } from "@/lib/membership/copy";
import type { PlansResult } from "@/lib/membership/plans";
import { ORGANIZATION, WEBSITE, appJsonLd, jsonLd, ogImageMeta } from "@/lib/seo";

// The home page is one blue button that opens Messages to OVOA. Everything
// else (plans, OVOA Fit, what OVOA does) has its own page.

const PAGE_TITLE = "OVOA: the AI assistant that gets things done";

function describe(data: PlansResult | undefined) {
  // Kept under ~160 characters so search results show all of it.
  return `OVOA is an AI assistant for iPhone you text or talk to. It schedules, remembers and follows through. Free for health and notes; the assistant is ${perLabel(planOf(data, "base", "monthly"))}.`;
}

export const Route = createFileRoute("/")({
  component: Landing,
  staticData: { sitemap: true },
  loader: async () => ({ ...(await getPlans()), ...(await getPublicTextNumber()) }),
  head: ({ loaderData }) => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: describe(loaderData) },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: describe(loaderData) },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ovoa.ai/" },
      ...ogImageMeta,
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/" }],
    scripts: [
      jsonLd(WEBSITE),
      jsonLd(ORGANIZATION),
      jsonLd(appJsonLd(loaderData)),
      jsonLd(
        bandProductJsonLd(
          loaderData,
          "A woven wristband with one button and heart rate sensing: press it and talk to OVOA. Beta hardware.",
          [bandFront, bandSensors, bandProfile],
        ),
      ),
    ],
  }),
});

function Landing() {
  const { number } = Route.useLoaderData();
  return <TextButtonPage number={number} />;
}
