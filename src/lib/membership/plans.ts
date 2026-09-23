// Plans, shared by the pages and the server. Prices themselves live in Stripe
// (found by lookup key), so changing a price never needs a deploy: run
// scripts/stripe-setup.mjs again with the new amount.
//
// What's sold (docs/paywall/SPEC.md in ovoa-app, §1–2):
//   - Base AI and Pro AI, each monthly or yearly. No free trial without a Band.
//   - The OVOA Band, one-time. Each Band comes with BAND_TRIAL_DAYS of Base AI.
//   - No lifetime plan any more. Old ovoa_member_* prices (and anyone still on
//     them) count as Base.

export type Tier = "free" | "base" | "pro";
export type PaidTier = Exclude<Tier, "free">;
export type BillingPeriod = "monthly" | "annual";
export type PlanId = "base_monthly" | "base_annual" | "pro_monthly" | "pro_annual";

// What a member row's `plan` column holds: the billing period (the tier is its
// own column). lifetime only appears on rows from the old Founder plan; comp is
// free access given from the admin page.
export type MemberPlan = BillingPeriod | "lifetime" | "comp";

export const PAID_TIERS: PaidTier[] = ["base", "pro"];
export const PLAN_IDS: PlanId[] = ["base_monthly", "base_annual", "pro_monthly", "pro_annual"];

export const PLAN_LOOKUP_KEYS: Record<PlanId, string> = {
  base_monthly: "ovoa_base_monthly",
  base_annual: "ovoa_base_annual",
  pro_monthly: "ovoa_pro_monthly",
  pro_annual: "ovoa_pro_annual",
};

export const BAND_LOOKUP_KEY = "ovoa_band";

// Prices from the first early-access setup. Still read so anyone on them keeps
// working; they all count as Base.
export const LEGACY_LOOKUP_KEYS = {
  monthly: "ovoa_member_monthly",
  annual: "ovoa_member_annual",
  lifetime: "ovoa_member_lifetime",
} as const;

export const planId = (tier: PaidTier, period: BillingPeriod): PlanId => `${tier}_${period}`;
export const tierOfPlan = (plan: PlanId): PaidTier => (plan.startsWith("pro_") ? "pro" : "base");
export const periodOfPlan = (plan: PlanId): BillingPeriod =>
  plan.endsWith("_annual") ? "annual" : "monthly";

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as string[]).includes(value);
}

export function isPaidTier(value: unknown): value is PaidTier {
  return value === "base" || value === "pro";
}

// The AI tier a Stripe price unlocks, from its lookup key. The Band (and any
// price that isn't ours) unlocks none.
export function tierOf(lookupKey: string | null | undefined): PaidTier | null {
  if (!lookupKey) return null;
  if (lookupKey.startsWith("ovoa_pro_")) return "pro";
  if (lookupKey.startsWith("ovoa_base_")) return "base";
  if (lookupKey.startsWith("ovoa_member_")) return "base";
  return null;
}

// Free days before the first charge.
//   - Buying a plan on its own: none, you pay from day one.
//   - Buying a Band with AI: BAND_TRIAL_DAYS of Base monthly, then Base until
//     they cancel. The Band can take weeks to arrive, so the free days start
//     when the buyer chooses, from the link in their order email (or their
//     welcome page), not at checkout. Checkout charges the Band and saves the
//     card; starting the free days makes the subscription (startBandTrial in
//     sync.server.ts), and Stripe charges Base when they end. Stripe emails a
//     reminder before that (turn it on in Stripe → Settings → Billing →
//     Subscriptions and emails).
//   - Buying the Band on its own: the same BAND_TRIAL_DAYS of Base, started
//     the same way, but no card is saved, so they end on their own and nothing
//     is charged. The buyer can give them away by starting them and moving
//     them to another app email on the welcome page.
export const NO_BAND_TRIAL_DAYS = 0;
export const BAND_TRIAL_DAYS = 7;

// Partner program. Partners earn three ways:
//   - AFFILIATE_PERCENT of every subscription payment (Base or Pro, monthly or
//     yearly) for COMMISSION_MONTHS after the member joins.
//   - BAND_COMMISSION_PERCENT of each Band they sell: $10 of the $89.99 Band.
//     The Band's amount is kept out of the subscription commission, even when
//     it's on the same invoice as the first AI payment.
//   - A CPM on views of their posts about OVOA, at a rate set per partner on
//     the admin page (affiliates.cpm_cents, per 1,000 views). Views are
//     logged by hand on the admin page once you've checked them.
export const AFFILIATE_PERCENT = 15;
export const COMMISSION_MONTHS = 6;
export const BAND_COMMISSION_PERCENT = 11.11;
export const REF_COOKIE_DAYS = 90;
export const PAYOUT_MINIMUM_USD = 50;

// Statuses that mean the person has their tier.
export const ENTITLED_STATUSES = ["trialing", "active", "past_due", "lifetime", "comp"] as const;

export function isEntitled(status: string | null | undefined): boolean {
  return (ENTITLED_STATUSES as readonly string[]).includes(status ?? "");
}

export type PublicPlan = {
  id: PlanId;
  tier: PaidTier;
  period: BillingPeriod;
  amountCents: number;
  currency: string;
  interval: "month" | "year";
};

export type PublicBand = { amountCents: number; currency: string };

export type PlansResult = {
  configured: boolean;
  plans: PublicPlan[];
  band: PublicBand | null;
  // Free days when buying a plan on its own (0), and with a Band.
  trialDays: number;
  bandTrialDays: number;
  // The public TestFlight link, when one is set. The free app is free, so the
  // plans page can hand it to anyone (Apple 2.2: nobody pays for beta access).
  betaUrl: string | null;
};

// Shown until Stripe is connected, so the page never renders empty. The
// checkout button stays off in that state.
export const FALLBACK_PLANS: PublicPlan[] = [
  {
    id: "base_monthly",
    tier: "base",
    period: "monthly",
    amountCents: 995,
    currency: "usd",
    interval: "month",
  },
  {
    id: "base_annual",
    tier: "base",
    period: "annual",
    amountCents: 9599,
    currency: "usd",
    interval: "year",
  },
  {
    id: "pro_monthly",
    tier: "pro",
    period: "monthly",
    amountCents: 2595,
    currency: "usd",
    interval: "month",
  },
  {
    id: "pro_annual",
    tier: "pro",
    period: "annual",
    amountCents: 19599,
    currency: "usd",
    interval: "year",
  },
];

export const FALLBACK_BAND: PublicBand = { amountCents: 8999, currency: "usd" };

// What a partner earns on one Band at today's price.
export function bandCommissionCents(band: PublicBand | null): number {
  return Math.round(((band ?? FALLBACK_BAND).amountCents * BAND_COMMISSION_PERCENT) / 100);
}

export function formatMoney(cents: number, currency = "usd"): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

// What paying yearly saves over twelve monthly payments, for one tier.
export function annualSavings(plans: PublicPlan[], tier: PaidTier) {
  const monthly = plans.find((p) => p.id === planId(tier, "monthly"));
  const annual = plans.find((p) => p.id === planId(tier, "annual"));
  if (!monthly || !annual) return null;
  const saveCents = monthly.amountCents * 12 - annual.amountCents;
  if (saveCents <= 0) return null;
  return {
    saveCents,
    percent: Math.round((saveCents / (monthly.amountCents * 12)) * 100),
    perMonthCents: Math.round(annual.amountCents / 12),
  };
}

export const REF_COOKIE = "ovoa_ref";
export const REF_PATTERN = /^[a-z0-9-]{3,24}$/;

export function cleanRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ref = value.trim().toLowerCase();
  return REF_PATTERN.test(ref) ? ref : null;
}

export const CHECKOUT_SESSION_PATTERN = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

export const TESTFLIGHT_APP_URL = "https://apps.apple.com/us/app/testflight/id899247664";
