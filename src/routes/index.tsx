import { createFileRoute } from "@tanstack/react-router";
import { BandHome } from "@/components/band/BandHome";
import bandFront from "@/assets/product/band-front-cutout.webp";
import bandProfile from "@/assets/product/band-profile-cutout.webp";
import bandSensors from "@/assets/product/band-sensors-cutout.webp";
import { getPlans } from "@/lib/membership/membership.functions";
import { bandPrice, bandProductJsonLd } from "@/lib/membership/copy";
import type { PlansResult } from "@/lib/membership/plans";
import { ORGANIZATION, WEBSITE, appJsonLd, jsonLd, ogImageMeta } from "@/lib/seo";

// The home page is OVOA Fit, the band (components/band/BandHome). The blue
// Text OVOA page, with its A/B test, lives at /text.

const PAGE_TITLE = "OVOA Fit: the AI band you talk to";

function describe(data: PlansResult | undefined) {
  // Kept under ~160 characters so search results show all of it.
  return `OVOA Fit is a woven AI wristband: it tracks heart rate, sleep and recovery, and gets things done when you press and ask. ${bandPrice(data)}, one time.`;
}

export const Route = createFileRoute("/")({
  component: Landing,
  staticData: { sitemap: true },
  loader: () => getPlans(),
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
  const data = Route.useLoaderData();
  return <BandHome price={bandPrice(data)} trialDays={data.bandTrialDays} />;
}
