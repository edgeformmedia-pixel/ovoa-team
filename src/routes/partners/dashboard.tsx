import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { useState } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import {
  getPartnerStats,
  getPlans,
  type PartnerStats,
} from "@/lib/membership/membership.functions";
import {
  COMMISSION_MONTHS,
  PAYOUT_MINIMUM_USD,
  bandCommissionCents,
  formatMoney,
} from "@/lib/membership/plans";

// Each partner's private page: /partners/dashboard?code=<code>&key=<dashboard_key>.
// The admin page gives you this link to send them.

export const Route = createFileRoute("/partners/dashboard")({
  component: Dashboard,
  staticData: { sitemap: false },
  validateSearch: (
    search: Record<string, unknown>,
  ): { code?: string | undefined; key?: string | undefined } => ({
    code: typeof search["code"] === "string" ? search["code"] : undefined,
    key: typeof search["key"] === "string" ? search["key"] : undefined,
  }),
  loaderDeps: ({ search }) => ({ code: search.code, key: search.key }),
  loader: async ({ deps }) => {
    if (!deps.code || !deps.key) return null;
    try {
      const [stats, plans] = await Promise.all([
        getPartnerStats({ data: { code: deps.code, key: deps.key } }),
        getPlans(),
      ]);
      return stats && { stats, bandCents: bandCommissionCents(plans.band) };
    } catch {
      return null;
    }
  },
  head: () => ({
    meta: [{ title: "Partner dashboard | OVOA" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1.5rem] bg-landing-control/70 p-6">
      <p className="text-sm text-landing-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

const KIND_LABELS: Record<PartnerStats["recent"][number]["kind"], string> = {
  plan: "Plan payment",
  band: "Band",
  views: "Views",
};

function Dashboard() {
  const loaded = Route.useLoaderData();
  const [copied, setCopied] = useState(false);

  if (!loaded) {
    return (
      <main className="min-h-dvh bg-landing-canvas text-landing-ink">
        <MembershipHeader />
        <div className="mx-auto max-w-[620px] px-5 py-16">
          <h1 className="text-3xl font-semibold">This link doesn&rsquo;t open a dashboard</h1>
          <p className="mt-3 text-landing-muted">
            Use the full link from your approval email. Lost it? Email support@ovoa.ai.
          </p>
          <Link to="/partners" className="mt-6 inline-block font-semibold text-landing-action">
            About the partner program
          </Link>
        </div>
      </main>
    );
  }

  const { stats, bandCents } = loaded;
  const link = `https://ovoa.ai/?ref=${stats.code}`;

  return (
    <main className="min-h-dvh bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <span className="text-xs text-landing-muted">Partner dashboard</span>
      </MembershipHeader>
      <div className="mx-auto max-w-[1000px] px-5 pb-24 pt-12">
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-semibold leading-tight">
          Hi {stats.name.split(" ")[0]}.
        </h1>
        {stats.status !== "approved" ? (
          <p className="mt-3 text-landing-muted">
            {stats.status === "pending"
              ? "Your application is being reviewed. Your link starts counting once it's approved."
              : "This partnership isn't active."}
          </p>
        ) : (
          <p className="mt-3 text-landing-muted">
            You earn {stats.percent}% of each payment your members make for their first{" "}
            {COMMISSION_MONTHS} months, {formatMoney(bandCents)} on every Band
            {stats.cpmCents > 0
              ? `, and ${formatMoney(stats.cpmCents)} per 1,000 views of your OVOA posts`
              : ""}
            .
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-landing-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-landing-muted">Your link</p>
            <p className="truncate text-lg font-semibold">{link}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard
                .writeText(link)
                .then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                })
                .catch(() => undefined);
            }}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-landing-action px-5 text-sm font-semibold text-landing-action-foreground"
          >
            <Copy aria-hidden="true" className="size-4" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Clicks" value={stats.clicks} />
          <Tile label="Sign-ups" value={stats.signups} />
          <Tile label="Paying" value={stats.paying} />
          <Tile label="Owed to you" value={formatMoney(stats.owedCents)} />
        </div>
        <p className="mt-3 text-sm text-landing-muted">
          Paid so far: {formatMoney(stats.paidCents)}. Payouts go out on the 1st once you&rsquo;re
          owed ${PAYOUT_MINIMUM_USD}. Sign-ups include free trials; commission starts when they pay.
        </p>

        <h2 className="mt-12 text-xl font-semibold">Recent commissions</h2>
        {stats.recent.length === 0 ? (
          <p className="mt-3 text-landing-muted">
            None yet. Share your link and they&rsquo;ll show up here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-landing-line">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-landing-control/60 text-landing-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">For</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Your share</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-landing-line">
                {stats.recent.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">{dateFormat.format(new Date(r.date))}</td>
                    <td className="px-4 py-3">{KIND_LABELS[r.kind]}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {r.kind === "views"
                        ? `${(r.views ?? 0).toLocaleString("en-US")} views`
                        : formatMoney(r.amountCents)}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {formatMoney(r.commissionCents)}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {r.status === "void" ? "Refunded" : r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
