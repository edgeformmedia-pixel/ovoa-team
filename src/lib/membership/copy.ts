// What each plan includes, in the words the pages use. One place, so the plans
// page, the FAQ and the checkout never disagree. Prices are NOT here: they come
// from Stripe through getPlans() (plans.ts has the fallbacks).
//
// The Free / Base / Pro split is SPEC §1 in ovoa-app/docs/paywall. The Pro
// extras are still a proposal the owner has to OK: change PLAN_FEATURES and
// every page follows.

import {
  FALLBACK_BAND,
  FALLBACK_PLANS,
  formatMoney,
  planId,
  type BillingPeriod,
  type PaidTier,
  type PlansResult,
  type PublicBand,
  type PublicPlan,
} from "./plans";

export type PlanColumn = "free" | PaidTier;

export const PLAN_NAMES: Record<PlanColumn, string> = { free: "Free", base: "Base", pro: "Pro" };

export const PLAN_BLURBS: Record<PlanColumn, string> = {
  free: "Health tracking and notes, on your iPhone.",
  base: "Turns on the OVOA assistant.",
  pro: "Everything in Base, hands-free, with more room.",
};

// true = included, false = not, a string = included with that detail.
export type FeatureCell = boolean | string;
export const PLAN_FEATURES: {
  label: string;
  free: FeatureCell;
  base: FeatureCell;
  pro: FeatureCell;
}[] = [
  {
    label: "Health: Apple Health, Band heart rate and activity",
    free: true,
    base: true,
    pro: true,
  },
  {
    label: "Notes, typed or spoken into the Band, written out on your iPhone",
    free: true,
    base: true,
    pro: true,
  },
  {
    label: "Chat and talk with OVOA: reminders, email, calendar, money, memory, morning brief",
    free: false,
    base: true,
    pro: true,
  },
  { label: "Press the Band, ask, and hear OVOA answer", free: false, base: true, pro: true },
  { label: "Hands-free wake word, no button needed", free: false, base: false, pro: true },
  {
    label: "Background agent: jobs that run on their own and report back",
    free: false,
    base: false,
    pro: true,
  },
  {
    label: "Daily AI replies",
    free: false,
    base: "Everyday use",
    pro: "About 3× Base",
  },
];

// Shown by the plans. No "was" prices anywhere: the founding price is simply
// the price, and it stays while the member does.
export const FOUNDING_PRICE_LINE = "Your founding price, kept while you're a member.";

// schema.org availability for the Band's Offer. The Band is beta hardware sold
// in small batches that ship when ready, so it's on sale but not stocked in
// quantity: LimitedAvailability. Switch to PreOrder if orders are taken before
// any Bands exist to ship.
export const BAND_AVAILABILITY = "https://schema.org/LimitedAvailability";

export function bandOf(result: Pick<PlansResult, "band"> | undefined): PublicBand {
  return result?.band ?? FALLBACK_BAND;
}

export function planOf(
  result: Pick<PlansResult, "plans"> | undefined,
  tier: PaidTier,
  period: BillingPeriod,
): PublicPlan {
  const id = planId(tier, period);
  return (result?.plans.find((p) => p.id === id) ??
    FALLBACK_PLANS.find((p) => p.id === id)) as PublicPlan;
}

export const bandPrice = (result: Pick<PlansResult, "band"> | undefined) => {
  const band = bandOf(result);
  return formatMoney(band.amountCents, band.currency);
};

// "$9.95/month"
export function perLabel(plan: PublicPlan) {
  return `${formatMoney(plan.amountCents, plan.currency)}/${plan.interval}`;
}

// The Band's schema.org Product, from the live price.
export function bandProductJsonLd(
  result: Pick<PlansResult, "band"> | undefined,
  description: string,
) {
  const band = bandOf(result);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "OVOA Band",
    description,
    image: "https://ovoa.ai/og-band.jpg",
    brand: { "@type": "Brand", name: "OVOA" },
    offers: {
      "@type": "Offer",
      price: (band.amountCents / 100).toFixed(2),
      priceCurrency: band.currency.toUpperCase(),
      availability: BAND_AVAILABILITY,
      url: "https://ovoa.ai/checkout",
    },
  };
}
