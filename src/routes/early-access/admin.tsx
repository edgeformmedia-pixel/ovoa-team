import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import {
  endCompAccess,
  setMemberAppEmail,
  getAdminOverview,
  grantAccess,
  listTestflightGroups,
  logAffiliateViews,
  markAffiliatePaid,
  retryTestflight,
  setAffiliateCpm,
  setAffiliateStatus,
  setBandOrderStatus,
  type AdminOverview,
} from "@/lib/membership/membership.functions";
import { PLAN_NAMES } from "@/lib/membership/copy";
import { formatMoney, type PaidTier } from "@/lib/membership/plans";

// Owner-only. Unlocked with OVOA_ADMIN_KEY, which stays in this tab's
// session storage and is sent with each request.

export const Route = createFileRoute("/early-access/admin")({
  component: Admin,
  ssr: false,
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Members admin | OVOA" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

const KEY_STORAGE = "ovoa.admin.key";
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const withYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const date = (v: string | null) => {
  if (!v) return "-";
  const d = new Date(v);
  return (d.getFullYear() === new Date().getFullYear() ? shortDate : withYear).format(d);
};

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-[1.25rem] bg-landing-control/70 p-5">
      <p className="text-xs text-landing-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-landing-muted">{sub}</p>}
    </div>
  );
}

function Section({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const smallButton =
  "inline-flex h-8 items-center justify-center rounded-full border border-landing-line px-3 text-xs font-semibold transition-colors hover:border-landing-muted disabled:opacity-50";
const input =
  "h-10 rounded-xl border border-landing-line bg-landing-canvas px-3 text-sm outline-none focus:border-landing-action";

function ConfigRow({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2.5 shrink-0 rounded-full ${ok ? "bg-emerald-500" : "bg-landing-line"}`}
      />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-landing-muted">{ok ? "Set" : hint}</span>
      </span>
    </li>
  );
}

function Admin() {
  const [key, setKey] = useState("");
  const [draft, setDraft] = useState("");
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof listTestflightGroups>> | null>(
    null,
  );
  const [grant, setGrant] = useState<{ email: string; name: string; note: string; tier: PaidTier }>(
    { email: "", name: "", note: "", tier: "base" },
  );

  const load = useServerFn(getAdminOverview);
  const approve = useServerFn(setAffiliateStatus);
  const markPaid = useServerFn(markAffiliatePaid);
  const setCpm = useServerFn(setAffiliateCpm);
  const logViews = useServerFn(logAffiliateViews);
  const retry = useServerFn(retryTestflight);
  const findGroups = useServerFn(listTestflightGroups);
  const giveAccess = useServerFn(grantAccess);
  const endAccess = useServerFn(endCompAccess);
  const setAppEmail = useServerFn(setMemberAppEmail);
  const setBandStatus = useServerFn(setBandOrderStatus);

  const refresh = useCallback(
    async (k: string) => {
      setError(null);
      try {
        setData(await load({ data: { key: k } }));
        setKey(k);
        try {
          sessionStorage.setItem(KEY_STORAGE, k);
        } catch {
          /* fine: they'll paste it again */
        }
      } catch (err) {
        setData(null);
        setKey("");
        setError(err instanceof Error ? err.message : "Couldn't load.");
      }
    },
    [load],
  );

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(KEY_STORAGE);
    } catch {
      saved = null;
    }
    if (saved) void refresh(saved);
  }, [refresh]);

  async function act(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await fn();
      await refresh(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(null);
    }
  }

  if (!data) {
    return (
      <main className="min-h-dvh bg-landing-canvas text-landing-ink">
        <MembershipHeader />
        <form
          className="mx-auto flex max-w-[420px] flex-col gap-3 px-5 py-16"
          onSubmit={(e) => {
            e.preventDefault();
            void refresh(draft.trim());
          }}
        >
          <h1 className="text-2xl font-semibold">Members admin</h1>
          <p className="text-sm text-landing-muted">Paste your OVOA_ADMIN_KEY.</p>
          <input
            className={input}
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Admin key"
          />
          <button
            type="submit"
            className="h-11 rounded-full bg-landing-action text-sm font-semibold text-landing-action-foreground"
          >
            Open
          </button>
          {error && <p className="text-sm text-landing-ink">{error}</p>}
        </form>
      </main>
    );
  }

  const { config, stats, members, affiliates, bandOrders } = data;
  const pending = affiliates.filter((a) => a.status === "pending");
  const approved = affiliates.filter((a) => a.status === "approved");
  const origin = typeof window === "undefined" ? "https://ovoa.ai" : window.location.origin;

  return (
    <main className="min-h-dvh bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <button type="button" className={smallButton} onClick={() => void refresh(key)}>
          Refresh
        </button>
        <button
          type="button"
          className={smallButton}
          onClick={() => {
            try {
              sessionStorage.removeItem(KEY_STORAGE);
            } catch {
              /* ignore */
            }
            setData(null);
            setKey("");
          }}
        >
          Lock
        </button>
      </MembershipHeader>

      <div className="mx-auto max-w-[1200px] px-5 pb-24 pt-10 sm:px-8">
        <h1 className="text-3xl font-semibold">Members</h1>
        {error && (
          <p role="status" className="mt-4 rounded-xl bg-landing-control px-4 py-3 text-sm">
            {error}
          </p>
        )}

        {!config.database && (
          <p className="mt-4 rounded-xl bg-landing-control px-4 py-3 text-sm">
            The members tables aren&rsquo;t there yet. Run <code>npm run db:migrate</code>, then
            refresh.
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Tile
            label="Monthly revenue"
            value={formatMoney(stats.mrrCents)}
            sub="Paying members, at today's prices"
          />
          <Tile label="Paying" value={stats.paying} />
          <Tile
            label="In free trial"
            value={stats.trialing}
            sub={`${formatMoney(stats.trialMrrCents)}/mo if they stay`}
          />
          <Tile
            label="Bands to ship"
            value={stats.bandsToShip}
            sub={`${formatMoney(stats.bandCents)} in Band sales`}
          />
          <Tile label="Free access" value={stats.comp} />
          <Tile label="Owed to partners" value={formatMoney(stats.owedCents)} />
        </div>

        <Section title="Setup">
          <ul className="grid gap-x-8 rounded-2xl border border-landing-line px-5 py-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <ConfigRow ok={config.stripe} label="Stripe key" hint="Add STRIPE_SECRET_KEY" />
            <ConfigRow
              ok={config.webhook}
              label="Stripe webhook"
              hint="Add STRIPE_WEBHOOK_SECRET"
            />
            <ConfigRow ok={config.database} label="Database tables" hint="Apply the migration" />
            <ConfigRow
              ok={config.publicLink}
              label="TestFlight public link"
              hint="Add TESTFLIGHT_PUBLIC_URL"
            />
            <ConfigRow
              ok={config.invites}
              label="Automatic TestFlight invites (optional)"
              hint="Add the four ASC_* / TESTFLIGHT_GROUP_ID secrets"
            />
            <ConfigRow
              ok={config.membershipApi}
              label="App membership check (optional)"
              hint="Add MEMBERSHIP_API_KEY"
            />
            <ConfigRow
              ok={config.email}
              label="Emails from no-reply@ovoa.ai"
              hint="Add RESEND_API_KEY (setup.md, Part E)"
            />
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={smallButton}
              disabled={busy === "groups"}
              onClick={() =>
                void act("groups", async () => setGroups(await findGroups({ data: { key } })))
              }
            >
              {busy === "groups" ? "Looking…" : "Find my TestFlight group ids"}
            </button>
            <span className="text-xs text-landing-muted">Needs the three ASC_* secrets.</span>
          </div>
          {groups && (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-landing-line">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-landing-control/60 text-landing-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Group</th>
                    <th className="px-4 py-2.5 font-medium">App</th>
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">TESTFLIGHT_GROUP_ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-landing-line">
                  {groups.map((g) => (
                    <tr key={g.id}>
                      <td className="px-4 py-2.5 font-medium">{g.name}</td>
                      <td className="px-4 py-2.5">{g.app ?? "-"}</td>
                      <td className="px-4 py-2.5">
                        {g.internal ? "Internal (can't use)" : "External"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">{g.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Give free access">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void act("grant", async () => {
                await giveAccess({ data: { key, ...grant } });
                setGrant({ email: "", name: "", note: "", tier: "base" });
              });
            }}
          >
            <input
              className={`${input} sm:flex-[2]`}
              type="email"
              required
              placeholder="Email"
              value={grant.email}
              onChange={(e) => setGrant((g) => ({ ...g, email: e.target.value }))}
            />
            <input
              className={`${input} sm:flex-1`}
              placeholder="Name"
              value={grant.name}
              onChange={(e) => setGrant((g) => ({ ...g, name: e.target.value }))}
            />
            <input
              className={`${input} sm:flex-[2]`}
              placeholder="Note (App Review, friend, creator…)"
              value={grant.note}
              onChange={(e) => setGrant((g) => ({ ...g, note: e.target.value }))}
            />
            <div
              role="radiogroup"
              aria-label="Plan"
              className="inline-flex h-10 shrink-0 self-start rounded-full bg-landing-control p-1"
            >
              {(["base", "pro"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  role="radio"
                  aria-checked={grant.tier === tier}
                  onClick={() => setGrant((g) => ({ ...g, tier }))}
                  className={`rounded-full px-4 text-sm font-semibold transition-colors ${
                    grant.tier === tier
                      ? "bg-landing-canvas text-landing-ink shadow-sm"
                      : "text-landing-muted hover:text-landing-ink"
                  }`}
                >
                  {PLAN_NAMES[tier]}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={busy === "grant"}
              className="h-10 rounded-full bg-landing-action px-5 text-sm font-semibold text-landing-action-foreground disabled:opacity-60"
            >
              Give access
            </button>
          </form>
          <p className="mt-2 text-xs text-landing-muted">
            App Review&rsquo;s login needs Pro, so the reviewers can see every feature.
          </p>
        </Section>

        <Section
          title={`Band orders (${bandOrders.length})`}
          aside={
            stats.bandsToShip > 0 ? (
              <span className="text-sm text-landing-muted">{stats.bandsToShip} to ship</span>
            ) : undefined
          }
        >
          {bandOrders.length === 0 ? (
            <p className="text-sm text-landing-muted">No Band orders yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-landing-line">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-landing-control/60 text-landing-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Buyer</th>
                    <th className="px-4 py-2.5 font-medium">Ship to</th>
                    <th className="px-4 py-2.5 font-medium">With Base</th>
                    <th className="px-4 py-2.5 font-medium">Paid</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-landing-line">
                  {bandOrders.map((b) => (
                    <tr key={b.id} className="align-top">
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{b.email}</span>
                        <span className="block text-xs text-landing-muted">
                          {[b.name, b.phone, date(b.createdAt)].filter(Boolean).join(" · ")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <address className="text-xs not-italic leading-5">
                          {b.shipTo.length === 0
                            ? "-"
                            : b.shipTo.map((line) => (
                                <span key={line} className="block">
                                  {line}
                                </span>
                              ))}
                        </address>
                        {b.shipTo.length > 0 && (
                          <button
                            type="button"
                            className="mt-1 text-xs font-semibold text-landing-action"
                            onClick={() =>
                              void navigator.clipboard
                                .writeText(b.shipTo.join("\n"))
                                .catch(() => undefined)
                            }
                          >
                            Copy address
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {!b.withAi && (
                          <span className="block text-xs text-landing-muted">
                            Band only, free days with no card
                          </span>
                        )}
                        {b.baseStartedAt ? (
                          <>
                            Started
                            <span className="block text-xs text-landing-muted">
                              {date(b.baseStartedAt)}
                            </span>
                          </>
                        ) : (
                          <>
                            Not started
                            {b.status !== "refunded" && (
                              <button
                                type="button"
                                className="mt-1 block text-xs font-semibold text-landing-action"
                                onClick={() =>
                                  void navigator.clipboard
                                    .writeText(
                                      `${origin}/early-access/welcome?session_id=${b.checkoutSessionId}#start`,
                                    )
                                    .catch(() => undefined)
                                }
                              >
                                Copy start link
                              </button>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {formatMoney(b.amountCents, b.currency)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={b.status === "paid" ? "font-semibold" : ""}>
                          {b.status === "paid" ? "To ship" : b.status}
                        </span>
                        {b.shippedAt && (
                          <span className="block text-xs text-landing-muted">
                            {date(b.shippedAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end">
                          {b.status === "paid" && (
                            <button
                              type="button"
                              className={smallButton}
                              disabled={busy === b.id}
                              onClick={() => {
                                const note = config.email
                                  ? " This emails them that it's on its way."
                                  : "";
                                if (window.confirm(`Mark ${b.email}'s Band as shipped?${note}`)) {
                                  void act(b.id, () =>
                                    setBandStatus({ data: { key, id: b.id, status: "shipped" } }),
                                  );
                                }
                              }}
                            >
                              Mark shipped
                            </button>
                          )}
                          {b.status === "shipped" && (
                            <button
                              type="button"
                              className={smallButton}
                              disabled={busy === b.id}
                              onClick={() =>
                                void act(b.id, () =>
                                  setBandStatus({ data: { key, id: b.id, status: "paid" } }),
                                )
                              }
                            >
                              Undo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-landing-muted">
            Band-only buyers get the free app. Without a TestFlight public link set, email them an
            invite. With Base, the free days start when the buyer taps Start on their order page
            (the order email and the shipped email link to it). Without emails set up, send them the
            start link, only to their own address.
          </p>
        </Section>

        {pending.length > 0 && (
          <Section title={`Partner applications (${pending.length})`}>
            <div className="grid gap-3 md:grid-cols-2">
              {pending.map((a) => (
                <article key={a.id} className="rounded-2xl border border-landing-line p-5 text-sm">
                  <p className="text-base font-semibold">
                    {a.name} <span className="font-normal text-landing-muted">· {a.code}</span>
                  </p>
                  <p className="text-landing-muted">{a.email}</p>
                  {a.audience && <p className="mt-2 whitespace-pre-wrap">{a.audience}</p>}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className={smallButton}
                      disabled={busy === a.id}
                      onClick={() =>
                        void act(a.id, () =>
                          approve({ data: { key, id: a.id, status: "approved" } }),
                        )
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className={smallButton}
                      disabled={busy === a.id}
                      onClick={() =>
                        void act(a.id, () =>
                          approve({ data: { key, id: a.id, status: "rejected" } }),
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </Section>
        )}

        <Section title={`Partners (${approved.length})`}>
          {approved.length === 0 ? (
            <p className="text-sm text-landing-muted">
              No approved partners yet. Applications from /partners show up above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-landing-line">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-landing-control/60 text-landing-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Partner</th>
                    <th className="px-4 py-2.5 font-medium">CPM</th>
                    <th className="px-4 py-2.5 font-medium">Clicks</th>
                    <th className="px-4 py-2.5 font-medium">Sign-ups</th>
                    <th className="px-4 py-2.5 font-medium">Owed</th>
                    <th className="px-4 py-2.5 font-medium">Paid</th>
                    <th className="px-4 py-2.5 font-medium">Pay to</th>
                    <th className="px-4 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-landing-line">
                  {approved.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{a.name}</span>
                        <span className="block text-xs text-landing-muted">
                          ?ref={a.code} · {a.percent}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {a.cpmCents > 0 ? formatMoney(a.cpmCents) : "-"}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">{a.clicks}</td>
                      <td className="px-4 py-2.5 tabular-nums">{a.signups}</td>
                      <td className="px-4 py-2.5 font-semibold tabular-nums">
                        {formatMoney(a.owedCents)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">{formatMoney(a.paidCents)}</td>
                      <td className="px-4 py-2.5 text-xs">{a.payoutEmail ?? a.email}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className={smallButton}
                            onClick={() =>
                              void navigator.clipboard
                                .writeText(
                                  `${origin}/partners/dashboard?code=${a.code}&key=${a.dashboardKey}`,
                                )
                                .catch(() => undefined)
                            }
                          >
                            Copy dashboard link
                          </button>
                          <button
                            type="button"
                            className={smallButton}
                            disabled={busy === a.id}
                            onClick={() => {
                              const answer = window.prompt(
                                `${a.name}'s CPM, in dollars per 1,000 views:`,
                                a.cpmCents > 0 ? (a.cpmCents / 100).toFixed(2) : "",
                              );
                              if (answer == null) return;
                              const dollars = Number(answer.replace(/[$,\s]/g, ""));
                              if (!answer.trim() || !Number.isFinite(dollars) || dollars < 0) {
                                setError("Enter the CPM in dollars, like 5 or 7.50.");
                                return;
                              }
                              const cpmCents = Math.round(dollars * 100);
                              void act(a.id, () => setCpm({ data: { key, id: a.id, cpmCents } }));
                            }}
                          >
                            Set CPM
                          </button>
                          <button
                            type="button"
                            className={smallButton}
                            disabled={a.cpmCents === 0 || busy === a.id}
                            title={a.cpmCents === 0 ? "Set a CPM first" : undefined}
                            onClick={() => {
                              const answer = window.prompt(
                                `Views on ${a.name}'s OVOA posts since you last logged them:`,
                              );
                              if (answer == null) return;
                              const views = Number(answer.replace(/[,\s]/g, ""));
                              if (!Number.isInteger(views) || views <= 0) {
                                setError("Enter the number of views, like 12500.");
                                return;
                              }
                              const earned = Math.round((views * a.cpmCents) / 1000);
                              if (
                                window.confirm(
                                  `Log ${views.toLocaleString("en-US")} views at a ${formatMoney(a.cpmCents)} CPM? ${a.name} will be owed ${formatMoney(earned)} more.`,
                                )
                              ) {
                                void act(a.id, () =>
                                  logViews({ data: { key, code: a.code, views } }),
                                );
                              }
                            }}
                          >
                            Log views
                          </button>
                          <button
                            type="button"
                            className={smallButton}
                            disabled={a.owedCents === 0 || busy === a.id}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Mark ${formatMoney(a.owedCents)} to ${a.name} as paid? Do this after you've sent the PayPal payment.`,
                                )
                              ) {
                                void act(a.id, () => markPaid({ data: { key, code: a.code } }));
                              }
                            }}
                          >
                            Mark paid
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title={`Everyone (${members.length})`}>
          {members.length === 0 ? (
            <p className="text-sm text-landing-muted">No members yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-landing-line">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-landing-control/60 text-landing-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Member</th>
                    <th className="px-4 py-2.5 font-medium">Plan</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Trial ends / renews</th>
                    <th className="px-4 py-2.5 font-medium">Partner</th>
                    <th className="px-4 py-2.5 font-medium">TestFlight</th>
                    <th className="px-4 py-2.5 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-landing-line">
                  {members.map((m) => (
                    <tr key={m.id} className="align-top">
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{m.email}</span>
                        {m.appEmail && (
                          <span className="block text-xs text-landing-muted">
                            App account: {m.appEmail}
                          </span>
                        )}
                        {(m.name || m.note) && (
                          <span className="block text-xs text-landing-muted">
                            {[m.name, m.note].filter(Boolean).join(" · ")}
                          </span>
                        )}
                        {m.checkoutSessionId && (
                          <button
                            type="button"
                            className="mt-1 block text-xs font-semibold text-landing-action"
                            title="Their private page: TestFlight steps and Manage billing. Treat it like a password."
                            onClick={() =>
                              void navigator.clipboard
                                .writeText(
                                  `${origin}/early-access/welcome?session_id=${m.checkoutSessionId}`,
                                )
                                .catch(() => undefined)
                            }
                          >
                            Copy welcome link
                          </button>
                        )}
                        <button
                          type="button"
                          className="mt-1 block text-xs font-semibold text-landing-action"
                          title="When they sign in to the app with a different email than they paid with"
                          disabled={busy === m.id}
                          onClick={() => {
                            const appEmail = window.prompt(
                              `The email ${m.email} signs in to the OVOA app with (empty: ${m.email} itself)`,
                              m.appEmail ?? "",
                            );
                            if (appEmail === null) return;
                            void act(m.id, () =>
                              setAppEmail({ data: { key, id: m.id, appEmail } }),
                            );
                          }}
                        >
                          {m.appEmail ? "Change app email" : "Set app email"}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        {PLAN_NAMES[m.tier]}
                        <span className="block text-xs text-landing-muted">
                          {m.plan === "comp"
                            ? "Free access"
                            : m.plan === "annual"
                              ? "Yearly"
                              : m.plan === "monthly"
                                ? "Monthly"
                                : "Founder (old)"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {m.status}
                        {m.cancelAtPeriodEnd && (
                          <span className="block text-xs text-landing-muted">cancels at end</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {m.status === "trialing" ? date(m.trialEndsAt) : date(m.renewsAt)}
                      </td>
                      <td className="px-4 py-2.5">{m.ref ?? "-"}</td>
                      <td className="px-4 py-2.5">
                        <span className={m.testflight === "failed" ? "font-semibold" : ""}>
                          {m.testflight}
                        </span>
                        {m.testflightError && (
                          <span className="block max-w-[220px] text-xs text-landing-muted">
                            {m.testflightError}
                          </span>
                        )}
                        {config.invites && ["failed", "pending"].includes(m.testflight) && (
                          <button
                            type="button"
                            className={`${smallButton} mt-1.5`}
                            disabled={busy === m.id}
                            onClick={() => void act(m.id, () => retry({ data: { key, id: m.id } }))}
                          >
                            {busy === m.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              "Retry invite"
                            )}
                          </button>
                        )}
                        {m.plan === "comp" && m.status === "comp" && (
                          <button
                            type="button"
                            className={`${smallButton} mt-1.5`}
                            disabled={busy === m.id}
                            onClick={() => {
                              if (window.confirm(`End free access for ${m.email}?`)) {
                                void act(m.id, () => endAccess({ data: { key, id: m.id } }));
                              }
                            }}
                          >
                            End access
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5">{date(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </main>
  );
}
