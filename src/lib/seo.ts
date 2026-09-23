// What search engines and AI assistants read about OVOA besides the page text:
// the site's name, the social preview image and the schema.org blocks the pages
// share. Only facts the pages already state go in here, and prices always come
// from the page's getPlans() data (Stripe), never typed in.

import { formatMoney, type PlansResult } from "./membership/plans";
import { PLAN_BLURBS, PLAN_NAMES, planOf } from "./membership/copy";

export const SITE_URL = "https://ovoa.ai";
export const SITE_NAME = "OVOA";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export const OG_IMAGE = `${SITE_URL}/og-band.jpg`;
const OG_IMAGE_ALT = "The OVOA Band: a black woven wristband with one button and a status light";

// The preview image tags every shareable page uses (og-band.jpg is 1200×630).
export const ogImageMeta = [
  { property: "og:image", content: OG_IMAGE },
  { property: "og:image:width", content: "1200" },
  { property: "og:image:height", content: "630" },
  { property: "og:image:alt", content: OG_IMAGE_ALT },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:image", content: OG_IMAGE },
  { name: "twitter:image:alt", content: OG_IMAGE_ALT },
];

// A <script type="application/ld+json"> for a route's head().
export const jsonLd = (data: object) => ({
  type: "application/ld+json",
  children: JSON.stringify(data),
});

// Home > page, for a page one level down.
export function breadcrumbs(name: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name, item: `${SITE_URL}${path}` },
    ],
  };
}

// Google takes the site name in results from WebSite, and the logo and
// knowledge-panel facts from Organization. Both belong on the home page.
export const WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  alternateName: ["ovoa.ai", "OVOA AI"],
  url: `${SITE_URL}/`,
  inLanguage: "en-US",
  publisher: { "@id": ORGANIZATION_ID },
};

export const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  alternateName: "Ovoa AI",
  url: `${SITE_URL}/`,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/logo.png`,
    width: 512,
    height: 512,
  },
  email: "support@ovoa.ai",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "support@ovoa.ai",
    availableLanguage: "English",
  },
};

// The iPhone app, with the Free, Base and Pro prices as offers.
export function appJsonLd(data: PlansResult | undefined) {
  const subscription = (tier: "base" | "pro", period: "monthly" | "annual") => {
    const plan = planOf(data, tier, period);
    const price = (plan.amountCents / 100).toFixed(2);
    const currency = plan.currency.toUpperCase();
    return {
      "@type": "Offer",
      name: `${PLAN_NAMES[tier]}, ${period === "monthly" ? "monthly" : "yearly"}`,
      description: `${PLAN_BLURBS[tier]} ${formatMoney(plan.amountCents, plan.currency)}/${plan.interval}.`,
      price,
      priceCurrency: currency,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price,
        priceCurrency: currency,
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: 1,
          unitCode: plan.interval === "year" ? "ANN" : "MON",
        },
      },
      url: `${SITE_URL}/early-access`,
    };
  };
  return {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    "@id": `${SITE_URL}/#app`,
    name: SITE_NAME,
    description:
      "An AI assistant for iPhone that you text or talk to: it schedules, remembers and follows through, then tells you when it's done or when it needs you. In beta through Apple's TestFlight.",
    operatingSystem: "iOS",
    applicationCategory: "LifestyleApplication",
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/logo.png`,
    publisher: { "@id": ORGANIZATION_ID },
    offers: [
      {
        "@type": "Offer",
        name: PLAN_NAMES.free,
        description: PLAN_BLURBS.free,
        price: "0",
        priceCurrency: "USD",
        url: `${SITE_URL}/early-access`,
      },
      subscription("base", "monthly"),
      subscription("base", "annual"),
      subscription("pro", "monthly"),
      subscription("pro", "annual"),
    ],
  };
}
