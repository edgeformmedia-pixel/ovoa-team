// What the membership API answers for one email (docs/paywall/SPEC.md §2 in
// ovoa-app). The tier is resolved here, so the app server never reads Stripe.

import { isEntitled, type PaidTier, type Tier } from "./plans";

export type MembershipStatus = "trialing" | "active" | "past_due" | "canceled" | "comp" | "none";
export type MembershipSource = "stripe" | "band_trial" | "comp" | "none";

export type Membership = {
  tier: Tier;
  status: MembershipStatus;
  trialEndsAt: string | null;
  renewsAt: string | null;
  source: MembershipSource;
};

export type MembershipRow = {
  plan: string;
  tier: PaidTier | null | undefined;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean;
  created_at: string;
};

export const NO_MEMBERSHIP: Membership = {
  tier: "free",
  status: "none",
  trialEndsAt: null,
  renewsAt: null,
  source: "none",
};

const TIER_RANK: Record<PaidTier, number> = { base: 1, pro: 2 };
// Among rows with the same tier: settled beats free days beats a failing card.
const STATUS_RANK: Record<string, number> = {
  active: 4,
  lifetime: 4,
  comp: 3,
  trialing: 2,
  past_due: 1,
};

const tierOfRow = (row: MembershipRow): PaidTier => (row.tier === "pro" ? "pro" : "base");

function describe(row: MembershipRow): Membership {
  const tier = tierOfRow(row);
  switch (row.status) {
    case "comp":
      return { tier, status: "comp", trialEndsAt: null, renewsAt: null, source: "comp" };
    // The old Founder plan: Base with no end date.
    case "lifetime":
      return { tier, status: "active", trialEndsAt: null, renewsAt: null, source: "stripe" };
    // A plan bought on its own has no free days (NO_BAND_TRIAL_DAYS = 0), so a
    // trial is the Base AI that came with a Band.
    case "trialing":
      return {
        tier,
        status: "trialing",
        trialEndsAt: row.trial_ends_at,
        renewsAt: row.cancel_at_period_end ? null : row.trial_ends_at,
        source: "band_trial",
      };
    default:
      return {
        tier,
        status: row.status === "past_due" ? "past_due" : "active",
        trialEndsAt: null,
        renewsAt: row.cancel_at_period_end ? null : row.current_period_end,
        source: "stripe",
      };
  }
}

// rows: every member row for the email. The best live one wins: the higher
// tier first, then the steadier status. With none live, the person is free.
export function resolveMembership(rows: MembershipRow[]): Membership {
  const live = rows.filter((r) => isEntitled(r.status));
  if (live.length === 0) {
    if (rows.length === 0) return NO_MEMBERSHIP;
    // Only a checkout that never went through: as good as nothing.
    if (rows.every((r) => r.status === "incomplete" || r.status === "incomplete_expired"))
      return NO_MEMBERSHIP;
    const ended = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]!;
    return {
      tier: "free",
      status: "canceled",
      trialEndsAt: null,
      renewsAt: null,
      source: ended.plan === "comp" ? "comp" : "stripe",
    };
  }
  const best = [...live].sort(
    (a, b) =>
      TIER_RANK[tierOfRow(b)] - TIER_RANK[tierOfRow(a)] ||
      (STATUS_RANK[b.status] ?? 0) - (STATUS_RANK[a.status] ?? 0) ||
      b.created_at.localeCompare(a.created_at),
  )[0]!;
  return describe(best);
}
