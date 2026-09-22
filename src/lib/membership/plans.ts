// Paid early access, shared by the pages and the server. Prices themselves live
// in Stripe (found by lookup key), so changing a price never needs a deploy:
// run scripts/stripe-setup.mjs again with the new amount.

export type PlanId = "monthly" | "annual" | "lifetime";
export type MemberPlan = PlanId | "comp";

export const PLAN_LOOKUP_KEYS: Record<PlanId, string> = {
  monthly: "ovoa_member_monthly",
  annual: "ovoa_member_annual",
  lifetime: "ovoa_member_lifetime",
};

export const PLAN_IDS: PlanId[] = ["monthly", "annual", "lifetime"];

// Free days before the first charge on monthly and annual. A card is taken up
// front, and Stripe emails a reminder before the trial ends (turn that on in
// Stripe → Settings → Billing → Subscriptions and emails).
export const TRIAL_DAYS = 7;

// Partner program.
export const AFFILIATE_PERCENT = 20;
export const COMMISSION_MONTHS = 12;
export const REF_COOKIE_DAYS = 90;
export const PAYOUT_MINIMUM_USD = 50;

// Statuses that mean the person should have the app.
export const ENTITLED_STATUSES = ["trialing", "active", "past_due", "lifetime", "comp"] as const;

export function isEntitled(status: string | null | undefined): boolean {
  return (ENTITLED_STATUSES as readonly string[]).includes(status ?? "");
}

export type PublicPlan = {
  id: PlanId;
  amountCents: number;
  currency: string;
  interval: "month" | "year" | null;
};

export type PlansResult =
  | { configured: true; plans: PublicPlan[]; trialDays: number }
  | { configured: false; plans: PublicPlan[]; trialDays: number };

// Shown until Stripe is connected, so the page never renders empty. The
// checkout button stays off in that state.
export const FALLBACK_PLANS: PublicPlan[] = [
  { id: "monthly", amountCents: 999, currency: "usd", interval: "month" },
  { id: "annual", amountCents: 9999, currency: "usd", interval: "year" },
  { id: "lifetime", amountCents: 24900, currency: "usd", interval: null },
];

export function formatMoney(cents: number, currency = "usd"): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function annualSavings(plans: PublicPlan[]) {
  const monthly = plans.find((p) => p.id === "monthly");
  const annual = plans.find((p) => p.id === "annual");
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
