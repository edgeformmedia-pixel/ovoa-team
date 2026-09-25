import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { applyAffiliate, getPlans } from "@/lib/membership/membership.functions";
import {
  AFFILIATE_PERCENT,
  AFFILIATE_PLATFORMS,
  AUDIENCE_SIZES,
  COMMISSION_MONTHS,
  PAYOUT_MINIMUM_USD,
  REF_COOKIE_DAYS,
  REF_PATTERN,
  bandCommissionCents,
  formatMoney,
  type PlansResult,
} from "@/lib/membership/plans";
import { breadcrumbs, jsonLd, ogImageMeta } from "@/lib/seo";

// The affiliate program: what it pays, how it works, and the application.
// Applications go to D1 (affiliates) and show up in the affiliate inbox on
// admin.ovoa.ai, which approves them and emails the link and dashboard.

const PAGE_TITLE = "OVOA Affiliates: earn from every member you send";

function describe(data: PlansResult | undefined) {
  return `Share OVOA and earn ${AFFILIATE_PERCENT}% of every payment your referrals make for ${COMMISSION_MONTHS} months, ${formatMoney(bandCommissionCents(data?.band ?? null))} on every Band, plus a CPM on your posts.`;
}

export const Route = createFileRoute("/affiliates/")({
  component: Affiliates,
  staticData: { sitemap: true },
  loader: () => getPlans(),
  head: ({ loaderData }) => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: describe(loaderData) },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: describe(loaderData) },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ovoa.ai/affiliates" },
      ...ogImageMeta,
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/affiliates" }],
    scripts: [jsonLd(breadcrumbs("Affiliates", "/affiliates"))],
  }),
});

function earnings(bandCents: number) {
  return [
    {
      title: `${AFFILIATE_PERCENT}% for ${COMMISSION_MONTHS} months`,
      copy: `You earn ${AFFILIATE_PERCENT}% of every plan payment each person you refer makes, monthly or yearly, for their first ${COMMISSION_MONTHS} months.`,
    },
    {
      title: `${formatMoney(bandCents)} per Band`,
      copy: `Every Band bought through your link earns you ${formatMoney(bandCents)}, on top of the plan commission.`,
    },
    {
      title: "Plus a CPM",
      copy: "We also pay per 1,000 views of your posts about OVOA. Your rate is agreed when you're approved.",
    },
  ];
}

const steps = [
  {
    title: "Apply",
    copy: "Tell us where your audience is. We read every application and reply within a day.",
  },
  {
    title: "Share your link",
    copy: `Post ovoa.ai/?ref=yourcode wherever your people are. Anyone who clicks it and joins within ${REF_COOKIE_DAYS} days is yours, unless they click another affiliate's link after yours.`,
  },
  {
    title: "Get paid",
    copy: `PayPal on the 1st of each month once you're owed $${PAYOUT_MINIMUM_USD}. Refunded payments don't count. Your private dashboard shows clicks, sign-ups and what you're owed, live.`,
  },
];

const field =
  "h-12 w-full rounded-xl border border-landing-line bg-landing-canvas px-4 text-[15px] text-landing-ink outline-none transition-colors placeholder:text-landing-muted focus:border-landing-action focus:ring-2 focus:ring-landing-action/15";

const button =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-landing-action px-8 text-sm font-semibold text-landing-action-foreground shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-action active:translate-y-0 disabled:opacity-60";

type Form = {
  name: string;
  email: string;
  platform: string;
  audienceSize: string;
  links: string;
  audience: string;
  code: string;
  payoutEmail: string;
  company: string;
};

function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: readonly { id: string; label: string }[];
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <span className="relative">
        <select
          className={`${field} appearance-none pr-10 ${value ? "" : "text-landing-muted"}`}
          required
          value={value}
          onChange={onChange}
        >
          <option value="" disabled>
            Pick one
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-landing-muted"
        />
      </span>
    </label>
  );
}

function Affiliates() {
  const data = Route.useLoaderData();
  const bandCents = bandCommissionCents(data.band);
  const apply = useServerFn(applyAffiliate);
  const [form, setForm] = useState<Form>({
    name: "",
    email: "",
    platform: "",
    audienceSize: "",
    links: "",
    audience: "",
    code: "",
    payoutEmail: "",
    company: "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set =
    (key: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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
          <p className="text-sm font-medium text-landing-action">OVOA Affiliates</p>
          <h1 className="mt-4 max-w-4xl text-[clamp(2.6rem,6.5vw,5.25rem)] font-semibold leading-[0.98] tracking-normal">
            Share OVOA. Earn {AFFILIATE_PERCENT}%, {formatMoney(bandCents)} a Band, and a CPM.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-landing-muted sm:text-xl">
            For creators, coaches and newsletter writers whose people would love an assistant that
            actually does things. Apply in a minute; we review every application within a day.
          </p>
          <a href="#apply" className={`mt-8 ${button}`}>
            Apply now
          </a>

          <h2 className="mt-16 text-sm font-medium text-landing-muted">What you earn</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {earnings(bandCents).map((t) => (
              <article key={t.title} className="rounded-[1.75rem] bg-landing-control/70 p-7">
                <h3 className="text-xl font-semibold">{t.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-landing-muted">{t.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-landing-line bg-landing-control/35 px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05]">How it works</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-full bg-landing-ink text-sm font-semibold text-landing-canvas"
                >
                  {i + 1}
                </span>
                <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-landing-muted">
                  {s.copy}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="apply"
        className="scroll-mt-14 border-t border-landing-line px-5 py-16 sm:px-8 sm:py-24"
      >
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05]">
              Apply in a minute.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-landing-muted">
              Once you&rsquo;re approved we email you your link,{" "}
              <span className="whitespace-nowrap">
                ovoa.ai/?ref=
                <span className="font-semibold text-landing-ink">{form.code || "yourcode"}</span>
              </span>
              , and your private dashboard.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-landing-muted">
              Questions first? Write to{" "}
              <a className="font-medium text-landing-ink underline" href="mailto:support@ovoa.ai">
                support@ovoa.ai
              </a>
              .
            </p>
          </div>

          {done ? (
            <div role="status" className="rounded-[1.75rem] bg-landing-control/70 p-8">
              <h3 className="text-2xl font-semibold">Thanks, you&rsquo;re in the queue.</h3>
              <p className="mt-3 text-landing-muted">
                We&rsquo;ll email {form.email} within a day with your link and dashboard.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice
                  label="Where’s your audience?"
                  value={form.platform}
                  onChange={set("platform")}
                  options={AFFILIATE_PLATFORMS}
                />
                <Choice
                  label="Roughly how many people?"
                  value={form.audienceSize}
                  onChange={set("audienceSize")}
                  options={AUDIENCE_SIZES}
                />
              </div>
              <label className="grid gap-1.5 text-sm font-medium">
                Link to it
                <textarea
                  className={`${field} h-[4.5rem] resize-none py-3`}
                  required
                  placeholder="youtube.com/@you (one link per line)"
                  value={form.links}
                  onChange={set("links")}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Tell us about them
                <textarea
                  className={`${field} h-24 resize-none py-3`}
                  placeholder="Who they are, what you make, and how you'd share OVOA"
                  value={form.audience}
                  onChange={set("audience")}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
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
                <label className="grid gap-1.5 self-start text-sm font-medium">
                  PayPal email for payouts
                  <input
                    className={field}
                    type="email"
                    placeholder="Blank uses the email above"
                    value={form.payoutEmail}
                    onChange={set("payoutEmail")}
                  />
                </label>
              </div>
              {/* People never see this field; bots fill it in. */}
              <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
                <label>
                  Company
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.company}
                    onChange={set("company")}
                  />
                </label>
              </div>
              <button type="submit" disabled={busy} className={`mt-2 ${button}`}>
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
