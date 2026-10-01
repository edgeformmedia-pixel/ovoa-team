import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { EmbeddedCheckout } from "@/components/membership/EmbeddedCheckout";
import { PLAN_BLURBS, PLAN_NAMES, isSold, perLabel, planOf } from "@/lib/membership/copy";
import type { PaidTier, PlansResult } from "@/lib/membership/plans";

// Base, Plus or Pro, paid in place (Stripe's embedded Checkout), for someone
// signed in. `from` is where Stripe sends them back: /text/link to add their
// number, /join to go back to Messages (checkout.server.ts). `start` opens
// straight on one plan's checkout, with the others a tap away; `lead` goes
// above it.

export function PickPlan({
  plans,
  name,
  from,
  start,
  lead,
}: {
  plans: PlansResult;
  name: string;
  from: "text" | "join";
  start?: PaidTier;
  lead?: ReactNode;
}) {
  const [tier, setTier] = useState<PaidTier | null>(
    start && isSold(plans, start, "monthly") ? start : null,
  );
  const first = name.split(" ")[0];
  if (tier) {
    const plan = planOf(plans, tier, "monthly");
    return (
      <>
        {lead}
        <h1 className="mt-6 text-2xl font-semibold">
          OVOA {PLAN_NAMES[tier]}, {perLabel(plan)}
        </h1>
        <p className="mt-1 text-sm text-landing-muted">
          {PLAN_BLURBS[tier]} Cancel anytime.{" "}
          <button
            type="button"
            onClick={() => setTier(null)}
            className="font-medium text-landing-ink underline underline-offset-2"
          >
            Other plans
          </button>
        </p>
        <div className="mt-6 rounded-[1.25rem] bg-white p-2">
          <EmbeddedCheckout order={{ plan: plan.id, from }} />
        </div>
      </>
    );
  }
  return (
    <>
      <h1 className="mt-8 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.05]">
        Pick a plan{first ? `, ${first}` : ""}.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-landing-muted">
        Texting OVOA is the assistant, and the assistant comes with Base, Plus or Pro.
        {from === "text" ? " Pay here, then add your number." : ""} No app needed.
      </p>
      {!plans.configured && (
        <p
          role="status"
          className="mt-6 rounded-2xl bg-landing-control px-5 py-4 text-sm font-medium"
        >
          Plans open shortly. Check back in a little while, or email support@ovoa.ai.
        </p>
      )}
      <div className="mt-8 grid gap-3">
        {(["base", "plus", "pro"] as const).map((t) => (
          <button
            key={t}
            type="button"
            disabled={!isSold(plans, t, "monthly")}
            onClick={() => setTier(t)}
            className="rounded-2xl border border-landing-line p-5 text-left transition-colors hover:border-landing-action disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-lg font-semibold">OVOA {PLAN_NAMES[t]}</span>
              <span className="text-sm font-semibold">{perLabel(planOf(plans, t, "monthly"))}</span>
            </span>
            <span className="mt-1 block text-sm text-landing-muted">{PLAN_BLURBS[t]}</span>
          </button>
        ))}
      </div>
      <p className="mt-5 text-center text-xs leading-relaxed text-landing-muted">
        Already paid with another email?{" "}
        <Link to="/account" className="underline underline-offset-2">
          Your account
        </Link>
      </p>
    </>
  );
}
