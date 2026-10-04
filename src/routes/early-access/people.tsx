import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { getPeople, getPerson } from "@/lib/membership/membership.functions";
import type {
  PeopleOverview,
  Person,
  PersonDetail,
  PersonStage,
} from "@/lib/membership/people.server";
import { formatMoney } from "@/lib/membership/plans";

// Owner-only, read-only. Same OVOA_ADMIN_KEY as /early-access/admin (the key
// that page keeps in this tab's session storage works here too).

export const Route = createFileRoute("/early-access/people")({
  component: People,
  ssr: false,
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "People | OVOA" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

const KEY_STORAGE = "ovoa.admin.key";
const RANGES = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];
const STAGES: { id: PersonStage | "all"; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "visitor", label: "Visitors" },
  { id: "signed-in", label: "Signed in" },
  { id: "trial", label: "In trial" },
  { id: "paying", label: "Paying" },
  { id: "free-access", label: "Free access" },
  { id: "ended", label: "Ended" },
];

const smallButton =
  "inline-flex h-8 items-center justify-center rounded-full border border-landing-line px-3 text-xs font-semibold transition-colors hover:border-landing-muted disabled:opacity-50";
const selected = "border-landing-action bg-landing-control";
const input =
  "h-10 rounded-xl border border-landing-line bg-landing-canvas px-3 text-sm outline-none focus:border-landing-action";

const stamp = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const when = (v: string | null) => (v ? stamp.format(new Date(v)) : "-");
const length = (s: number) =>
  s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-[1.25rem] bg-landing-control/70 p-5">
      <p className="text-xs text-landing-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-landing-muted">{sub}</p>}
    </div>
  );
}

function Bars({ rows, empty }: { rows: { label: string; n: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <p className="text-sm text-landing-muted">{empty}</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3">
          <span className="w-44 shrink-0 truncate font-mono text-xs" title={r.label}>
            {r.label}
          </span>
          <span className="h-2 grow rounded-full bg-landing-control">
            <span
              className="block h-2 rounded-full bg-landing-action"
              style={{ width: `${(r.n / max) * 100}%` }}
            />
          </span>
          <span className="w-10 text-right tabular-nums">{r.n}</span>
        </li>
      ))}
    </ul>
  );
}

function People() {
  const [key, setKey] = useState("");
  const [draft, setDraft] = useState("");
  const [days, setDays] = useState(30);
  const [stage, setStage] = useState<PersonStage | "all">("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<PeopleOverview | null>(null);
  const [open, setOpen] = useState<Person | null>(null);
  const [detail, setDetail] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPeople = useServerFn(getPeople);
  const loadPerson = useServerFn(getPerson);

  const refresh = useCallback(
    async (k: string, range: number) => {
      setError(null);
      setLoading(true);
      try {
        setData(await loadPeople({ data: { key: k, days: range } }));
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
      } finally {
        setLoading(false);
      }
    },
    [loadPeople],
  );

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(KEY_STORAGE);
    } catch {
      saved = null;
    }
    if (saved) void refresh(saved, 30);
  }, [refresh]);

  async function show(person: Person) {
    setOpen(person);
    setDetail(null);
    try {
      setDetail(await loadPerson({ data: { key, person: person.key } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load that person.");
    }
  }

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.people ?? []).filter(
      (p) =>
        (stage === "all" || p.stage === stage) &&
        (!q ||
          [p.email, p.name, p.source, p.landing, p.country].some((v) =>
            v?.toLowerCase().includes(q),
          )),
    );
  }, [data, stage, search]);

  if (!data) {
    return (
      <main className="min-h-dvh bg-landing-canvas text-landing-ink">
        <MembershipHeader />
        <form
          className="mx-auto flex max-w-[420px] flex-col gap-3 px-5 py-16"
          onSubmit={(e) => {
            e.preventDefault();
            void refresh(draft.trim(), days);
          }}
        >
          <h1 className="text-2xl font-semibold">People</h1>
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

  const { totals } = data;
  return (
    <main className="min-h-dvh bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <Link to="/early-access/admin" className={smallButton}>
          Members
        </Link>
        <button
          type="button"
          className={smallButton}
          disabled={loading}
          onClick={() => void refresh(key, days)}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </MembershipHeader>

      <div className="mx-auto max-w-[1200px] px-5 pb-24 pt-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-semibold">People</h1>
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                className={`${smallButton} ${days === r.days ? selected : ""}`}
                onClick={() => {
                  setDays(r.days);
                  void refresh(key, r.days);
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p role="status" className="mt-4 rounded-xl bg-landing-control px-4 py-3 text-sm">
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Tile label="People who visited" value={totals.visitors} />
          <Tile
            label="Signed in"
            value={totals.signedIn}
            sub={`${totals.visitors ? Math.round((totals.signedIn / totals.visitors) * 100) : 0}% of visitors`}
          />
          <Tile label="In free trial" value={totals.trial} />
          <Tile label="Paying" value={totals.paying} />
          <Tile label="Bought a Band" value={totals.band} />
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <section>
            <h2 className="text-lg font-semibold">Pages people open</h2>
            <p className="mb-3 text-xs text-landing-muted">Distinct people per page</p>
            <Bars
              rows={data.pages.map((p) => ({ label: p.path, n: p.people }))}
              empty="No visits in this range."
            />
          </section>
          <section>
            <h2 className="text-lg font-semibold">Where visits end</h2>
            <p className="mb-3 text-xs text-landing-muted">
              The last page of each visit: where people drop off
            </p>
            <Bars
              rows={data.exits.map((p) => ({ label: p.path, n: p.visits }))}
              empty="No visits in this range."
            />
          </section>
        </div>

        <section className="mt-12">
          <div className="flex flex-wrap items-center gap-2">
            {STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`${smallButton} ${stage === s.id ? selected : ""}`}
                onClick={() => setStage(s.id)}
              >
                {s.label}
              </button>
            ))}
            <input
              className={`${input} ml-auto h-8 w-56 text-xs`}
              placeholder="Search email, source, page, country"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search people"
            />
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-landing-line">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-landing-control/60 text-landing-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Person</th>
                  <th className="px-4 py-2.5 font-medium">Stage</th>
                  <th className="px-4 py-2.5 font-medium">Came from</th>
                  <th className="px-4 py-2.5 font-medium">Visits</th>
                  <th className="px-4 py-2.5 font-medium">Pages</th>
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Where</th>
                  <th className="px-4 py-2.5 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-landing-line">
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-landing-muted">
                      Nobody matches.
                    </td>
                  </tr>
                )}
                {shown.map((p) => (
                  <tr
                    key={p.key}
                    className={`cursor-pointer align-top hover:bg-landing-control/40 ${open?.key === p.key ? "bg-landing-control/60" : ""}`}
                    onClick={() => void show(p)}
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium">
                        {p.email ?? `Visitor ${p.key.slice(2, 8)}`}
                      </span>
                      {p.name && <span className="block text-xs text-landing-muted">{p.name}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.stage}
                      {p.bandOrders > 0 && (
                        <span className="block text-xs text-landing-muted">
                          Band ×{p.bandOrders}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.source}
                      {p.landing && (
                        <span className="block font-mono text-xs text-landing-muted">
                          {p.landing}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{p.sessions}</td>
                    <td className="px-4 py-2.5 tabular-nums">{p.pageviews}</td>
                    <td className="px-4 py-2.5 tabular-nums">{length(p.seconds)}</td>
                    <td className="px-4 py-2.5">
                      {p.country ?? "-"}
                      {p.device && (
                        <span className="block text-xs text-landing-muted">{p.device}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">{when(p.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.people.length >= 500 && (
            <p className="mt-2 text-xs text-landing-muted">
              Showing the 500 most recent. Pick a shorter range to see the rest.
            </p>
          )}
        </section>

        {open && (
          <section className="mt-12" aria-live="polite">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-semibold">
                {open.email ?? `Visitor ${open.key.slice(2, 8)}`}
              </h2>
              <button type="button" className={smallButton} onClick={() => setOpen(null)}>
                Close
              </button>
            </div>
            {!detail && <p className="mt-4 text-sm text-landing-muted">Loading…</p>}
            {detail && (
              <div className="mt-4 space-y-6">
                {(detail.member || detail.bands.length > 0) && (
                  <div className="rounded-2xl border border-landing-line px-5 py-4 text-sm">
                    {detail.member && (
                      <p>
                        {detail.member.plan} · {detail.member.status} · since{" "}
                        {when(detail.member.since)}
                        {detail.member.trialEndsAt &&
                          ` · trial ends ${when(detail.member.trialEndsAt)}`}
                        {detail.member.canceledAt &&
                          ` · canceled ${when(detail.member.canceledAt)}`}
                        {detail.member.ref && ` · partner ${detail.member.ref}`}
                      </p>
                    )}
                    {detail.bands.map((b) => (
                      <p key={b.at}>
                        OVOA Fit {formatMoney(b.amountCents)} · {b.status} · {when(b.at)}
                      </p>
                    ))}
                  </div>
                )}
                {detail.visits.length === 0 && (
                  <p className="text-sm text-landing-muted">No recorded visits.</p>
                )}
                {detail.visits.map((v) => (
                  <div key={v.id} className="rounded-2xl border border-landing-line">
                    <div className="border-b border-landing-line bg-landing-control/60 px-5 py-3 text-sm">
                      <span className="font-medium">{when(v.startedAt)}</span>
                      <span className="text-landing-muted">
                        {" "}
                        · from {v.source} · {length(v.seconds)} · scrolled {v.maxScroll}%
                        {v.place && ` · ${v.place}`}
                        {v.device && ` · ${v.device}`}
                      </span>
                    </div>
                    <ol className="divide-y divide-landing-line text-sm">
                      {v.steps.length === 0 && (
                        <li className="px-5 py-2.5 text-landing-muted">Nothing recorded.</li>
                      )}
                      {v.steps.map((s, i) => (
                        <li key={`${s.ts}-${i}`} className="flex gap-4 px-5 py-2">
                          <span className="w-16 shrink-0 text-xs text-landing-muted">
                            {new Date(s.ts).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                          <span className="w-16 shrink-0 text-xs text-landing-muted">
                            {s.type === "pageview"
                              ? "viewed"
                              : s.type === "click"
                                ? "clicked"
                                : s.type === "rage"
                                  ? "rage-clicked"
                                  : "left"}
                          </span>
                          <span className="font-mono text-xs">
                            {s.path}
                            {s.type === "click" || s.type === "rage"
                              ? ` → ${s.target ?? "(unlabelled)"}`
                              : s.type === "leave" && s.value != null
                                ? ` after ${length(s.value)}`
                                : ""}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
