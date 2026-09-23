import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { applyAffiliate } from "@/lib/membership/membership.functions";
import {
  AFFILIATE_PERCENT,
  COMMISSION_MONTHS,
  PAYOUT_MINIMUM_USD,
  REF_COOKIE_DAYS,
  REF_PATTERN,
} from "@/lib/membership/plans";

const PAGE_TITLE = "OVOA Partners: earn from every member you send";
const PAGE_DESCRIPTION = `Share OVOA and earn ${AFFILIATE_PERCENT}% of every payment your referrals make for ${COMMISSION_MONTHS} months.`;

export const Route = createFileRoute("/partners/")({
  component: Partners,
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ovoa.ai/partners" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/partners" }],
  }),
});

const TERMS = [
  {
    title: `${AFFILIATE_PERCENT}% for ${COMMISSION_MONTHS} months`,
    copy: `You earn ${AFFILIATE_PERCENT}% of every payment each person you refer makes, for their first ${COMMISSION_MONTHS} months.`,
  },
  {
    title: `${REF_COOKIE_DAYS}-day window`,
    copy: `If someone clicks your link and joins any time in the next ${REF_COOKIE_DAYS} days, they're yours.`,
  },
  {
    title: "Paid monthly",
    copy: `PayPal on the 1st of each month once you're owed $${PAYOUT_MINIMUM_USD}. Refunded payments don't count.`,
  },
  {
    title: "Your own dashboard",
    copy: "Clicks, sign-ups, paying members and what you're owed, live.",
  },
];

const field =
  "h-12 w-full rounded-xl border border-landing-line bg-landing-canvas px-4 text-[15px] text-landing-ink outline-none transition-colors placeholder:text-landing-muted focus:border-landing-action focus:ring-2 focus:ring-landing-action/15";

function Partners() {
  const apply = useServerFn(applyAffiliate);
  const [form, setForm] = useState({
    name: "",
    email: "",
    code: "",
    audience: "",
    payoutEmail: "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({
        ...f,
        [key]:
          key === "code" ? e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") : e.target.value,
      }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = await apply({ data: form });
      if (result.ok) setDone(true);
      else setMessage(result.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "That didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  const codeOk = REF_PATTERN.test(form.code);

  return (
    <main className="min-h-dvh overflow-x-clip bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <Link
          to="/early-access"
          className="text-xs text-landing-muted transition-colors hover:text-landing-ink"
        >
          Early access
        </Link>
      </MembershipHeader>

      <section className="px-5 pb-16 pt-14 sm:px-8 sm:pt-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-sm font-medium text-landing-action">OVOA Partners</p>
          <h1 className="mt-4 max-w-4xl text-[clamp(2.6rem,6.5vw,5.25rem)] font-semibold leading-[0.98] tracking-normal">
            Share OVOA. Earn {AFFILIATE_PERCENT}% for a year.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-landing-muted sm:text-xl">
            For creators, coaches and newsletter writers whose people would love an assistant that
            actually does things. Apply below; we review every application within a day.
          </p>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TERMS.map((t) => (
              <article key={t.title} className="rounded-[1.75rem] bg-landing-control/70 p-7">
                <h2 className="text-xl font-semibold">{t.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-landing-muted">{t.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-landing-line px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05]">
              Apply in a minute.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-landing-muted">
              Once you&rsquo;re approved we email you your link, ovoa.ai/?ref=
              <span className="font-semibold text-landing-ink">{form.code || "yourcode"}</span>, and
              your private dashboard.
            </p>
          </div>

          {done ? (
            <div className="rounded-[1.75rem] bg-landing-control/70 p-8">
              <h3 className="text-2xl font-semibold">Thanks, you&rsquo;re in the queue.</h3>
              <p className="mt-3 text-landing-muted">
                We&rsquo;ll email {form.email} within a day with your link and dashboard.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Your name
                <input
                  className={field}
                  required
                  value={form.name}
                  onChange={set("name")}
                  autoComplete="name"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Email
                <input
                  className={field}
                  required
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  autoComplete="email"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Your code
                <input
                  className={field}
                  required
                  minLength={3}
                  maxLength={24}
                  placeholder="e.g. maria"
                  value={form.code}
                  onChange={set("code")}
                  aria-describedby="code-help"
                />
                <span id="code-help" className="text-xs font-normal text-landing-muted">
                  {form.code && !codeOk
                    ? "3–24 letters, numbers or dashes."
                    : "What people will see in your link."}
                </span>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Where&rsquo;s your audience?
                <textarea
                  className={`${field} h-24 resize-none py-3`}
                  placeholder="Links to your channel, newsletter or community, and roughly how many people"
                  value={form.audience}
                  onChange={set("audience")}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                PayPal email for payouts
                <input
                  className={field}
                  type="email"
                  placeholder="Leave blank to use the email above"
                  value={form.payoutEmail}
                  onChange={set("payoutEmail")}
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-landing-action text-sm font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
                Apply
              </button>
              {message && (
                <p role="status" className="text-sm font-medium text-landing-ink">
                  {message}
                </p>
              )}
            </form>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-md px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}
