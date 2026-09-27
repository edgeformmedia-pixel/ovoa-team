// What search engines and AI assistants read about OVOA besides the page text:
// the site's name, the social preview image and the schema.org blocks the pages
// share. Only facts the pages already state go in here, and prices always come
// from the page's getPlans() data (Stripe), never typed in.

import { formatMoney, type PlansResult } from "./membership/plans";
import { PLAN_BLURBS, PLAN_NAMES, planOf } from "./membership/copy";

export const SITE_URL = "https://ovoa.ai";
export const SITE_NAME = "OVOA";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

// OVOA's own listings elsewhere. Google uses sameAs to tie them to ovoa.ai as
// one brand, so searches for "ovoa" can show them together. Add each new
// official profile (LinkedIn, YouTube, X, Instagram, TikTok) here as it goes live.
export const APP_STORE_URL = "https://apps.apple.com/us/app/ovoa/id6812987246";
export const SAME_AS: string[] = [APP_STORE_URL];

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
  alternateName: ["Ovoa", "ovoa.ai", "OVOA AI"],
  url: `${SITE_URL}/`,
  inLanguage: "en-US",
  publisher: { "@id": ORGANIZATION_ID },
};

export const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: SITE_NAME,
  alternateName: ["Ovoa", "Ovoa AI", "ovoa.ai"],
  description:
    "OVOA makes an AI assistant you text or talk to, and the OVOA Band, a woven wristband that brings it to your wrist.",
  url: `${SITE_URL}/`,
  sameAs: SAME_AS,
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

// A blog post, for its route's head().
export function articleJsonLd(post: {
  title: string;
  description: string;
  path: string;
  published: string;
  updated?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: `${SITE_URL}${post.path}`,
    mainEntityOfPage: `${SITE_URL}${post.path}`,
    image: OG_IMAGE,
    datePublished: post.published,
    dateModified: post.updated ?? post.published,
    inLanguage: "en-US",
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    about: { "@id": ORGANIZATION_ID },
  };
}

// Home > section > page.
export function breadcrumbs3(section: string, sectionPath: string, name: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: section, item: `${SITE_URL}${sectionPath}` },
      { "@type": "ListItem", position: 3, name, item: `${SITE_URL}${path}` },
    ],
  };
}
