import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Loader2, Package } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import {
  changePlan,
  getWelcome,
  type WelcomeBand,
  type WelcomeData,
  type WelcomeOffer,
  type WelcomeTestflight,
} from "@/lib/membership/membership.functions";
import { PLAN_NAMES } from "@/lib/membership/copy";
import { CHECKOUT_SESSION_PATTERN, TESTFLIGHT_APP_URL, formatMoney } from "@/lib/membership/plans";

export const Route = createFileRoute("/early-access/welcome")({
  component: Welcome,
  staticData: { sitemap: false },
  validateSearch: (
    search: Record<string, unknown>,
  ): { session_id?: string | undefined; error?: string | undefined } => ({
    session_id: typeof search["session_id"] === "string" ? search["session_id"] : undefined,
    error: typeof search["error"] === "string" ? search["error"] : undefined,
  }),
  loaderDeps: ({ search }) => ({ sessionId: search.session_id }),
  loader: async ({ deps }): Promise<WelcomeData | { state: "missing" }> => {
    if (!deps.sessionId || !CHECKOUT_SESSION_PATTERN.test(deps.sessionId))
      return { state: "missing" };
    return getWelcome({ data: { sessionId: deps.sessionId } });
  },
  head: () => ({
    meta: [{ title: "Welcome to OVOA" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });
const yearFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
// "September 29", or "September 22, 2027" when it isn't this year.
const formatDate = (value: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return (d.getFullYear() === new Date().getFullYear() ? dateFormat : yearFormat).format(d);
};

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <a
          href="mailto:support@ovoa.ai"
          className="text-xs text-landing-muted transition-colors hover:text-landing-ink"
        >
          Help
        </a>
      </MembershipHeader>
      <div className="mx-auto max-w-[620px] px-5 pb-24 pt-12 sm:pt-16">{children}</div>
    </main>
  );
}

function Step({
  n,
  title,
  done,
  children,
}: {
  n: number;
  title: string;
  done?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4 border-b border-landing-line py-6 last:border-b-0">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          done
            ? "bg-landing-action text-landing-action-foreground"
            : "bg-landing-ink text-landing-action-foreground"
        }`}
      >
        {done ? <Check aria-hidden="true" className="size-4" strokeWidth={3} /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-1.5 text-[15px] leading-relaxed text-landing-muted">{children}</div>
      </div>
    </li>
  );
}

const primaryButton =
  "mt-4 inline-flex h-11 items-center justify-center rounded-full bg-landing-action px-6 text-sm font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0";
const secondaryButton =
  "inline-flex h-11 items-center justify-center rounded-full border border-landing-line px-6 text-sm font-semibold text-landing-ink transition-colors hover:border-landing-muted";

// Install TestFlight → join the beta → sign up. Same for members and for
// people who bought a Band on its own (they get the free app).
function AppSteps({
  email,
  tf,
  signUpNote,
}: {
  email: string;
  tf: WelcomeTestflight;
  signUpNote: string;
}) {
  const invited = tf.mode === "invite" && tf.state === "invited";
  return (
    <section className="mt-10 rounded-[1.75rem] bg-landing-control/70 px-6 sm:px-8">
      <h2 className="sr-only">Get the app</h2>
      <ol>
        <Step n={1} title="Install TestFlight">
          <p>
            OVOA is in beta, so it comes through TestFlight, Apple&rsquo;s free app for trying apps
            before they reach the App Store. On your iPhone:
          </p>
          <a href={TESTFLIGHT_APP_URL} target="_blank" rel="noreferrer" className={primaryButton}>
            Get TestFlight
          </a>
        </Step>

        <Step n={2} title="Join the OVOA beta" done={invited}>
          {invited && (
            <p>
              Apple is emailing your invite to <strong className="text-landing-ink">{email}</strong>
              . Open it on your iPhone and tap{" "}
              <strong className="text-landing-ink">View in TestFlight</strong>, then Install.
            </p>
          )}
          {tf.mode === "invite" && !invited && !tf.publicUrl && (
            <p>
              Your invite is on its way to <strong className="text-landing-ink">{email}</strong>. If
              it isn&rsquo;t there within the hour, email support@ovoa.ai.
            </p>
          )}
          {tf.mode === "manual" && (
            <p>
              We&rsquo;ll email your TestFlight invite to{" "}
              <strong className="text-landing-ink">{email}</strong> within 24 hours. Open it on your
              iPhone and tap View in TestFlight.
            </p>
          )}
          {tf.publicUrl && (tf.mode === "link" || !invited) && (
            <>
              <p>Open this on your iPhone, then tap Install.</p>
              <a href={tf.publicUrl} target="_blank" rel="noreferrer" className={primaryButton}>
                Join the OVOA beta
              </a>
            </>
          )}
          {tf.publicUrl && invited && (
            <p className="mt-3 text-sm">
              No email?{" "}
              <a
                href={tf.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-landing-action"
              >
                Use the direct link
              </a>
              .
            </p>
          )}
        </Step>

        <Step n={3} title="Open OVOA and sign up">
          <p>
            Create your account with <strong className="text-landing-ink">{email}</strong>, the
            email you paid with. {signUpNote}
          </p>
        </Step>
      </ol>
    </section>
  );
}

function BandCard({ band, email }: { band: WelcomeBand; email: string }) {
  if (band.status === "refunded") {
    return (
      <section className="mt-6 rounded-2xl border border-landing-line p-5 text-sm text-landing-muted">
        Your Band order was refunded.
      </section>
    );
  }
  return (
    <section className="mt-6 flex gap-4 rounded-2xl border border-landing-line p-5">
      <Package aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-landing-action" />
      <div className="text-sm leading-relaxed text-landing-muted">
        <p className="text-base font-semibold text-landing-ink">
          {band.status === "shipped" ? "Your Band has shipped." : "Your Band is on its way."}
        </p>
        <p className="mt-1">
          {band.status === "shipped"
            ? `It's in the post${band.shipTo ? ` to ${band.shipTo}` : ""}.`
            : `The Band is beta hardware, made in small batches. We'll ship it${band.shipTo ? ` to ${band.shipTo}` : ""} and email ${email} when it's sent.`}{" "}
          Set up the app below in the meantime: it works without the Band.
        </p>
      </div>
    </section>
  );
}

function OfferCard({
  title,
  body,
  cta,
  busy,
  onTake,
}: {
  title: string;
  body: string;
  cta: string;
  busy: boolean;
  onTake: () => void;
}) {
  return (
    <section className="mt-4 rounded-[1.75rem] bg-landing-ink p-7 text-landing-action-foreground sm:p-8">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-landing-action-foreground/70">{body}</p>
      <button
        type="button"
        onClick={onTake}
        disabled={busy}
        className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-landing-action px-6 text-sm font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        {cta}
      </button>
    </section>
  );
}

const money = (o: WelcomeOffer) => formatMoney(o.cents, o.currency);

function Welcome() {
  const data = Route.useLoaderData();
  const { session_id: sessionId, error } = Route.useSearch();
  const router = useRouter();
  const [welcome, setWelcome] = useState(data);
  const [tries, setTries] = useState(0);
  const [copied, setCopied] = useState(false);
  const [switching, setSwitching] = useState<"annual" | "pro" | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const doChange = useServerFn(changePlan);

  useEffect(() => setWelcome(data), [data]);

  // A card payment finishes in a second or two; keep checking briefly.
  useEffect(() => {
    if (welcome.state !== "pending" || tries >= 10) return;
    const timer = setTimeout(() => {
      setTries((t) => t + 1);
      void router.invalidate();
    }, 2500);
    return () => clearTimeout(timer);
  }, [welcome.state, tries, router]);

  if (welcome.state === "missing") {
    return (
      <Shell>
        <h1 className="text-3xl font-semibold">Nothing to show here</h1>
        <p className="mt-3 text-landing-muted">
          This page opens right after checkout. Lost your link? Email support@ovoa.ai from the
          address you paid with and we&rsquo;ll send it again.
        </p>
        <Link to="/early-access" className={primaryButton}>
          See plans
        </Link>
      </Shell>
    );
  }

  if (welcome.state === "pending") {
    return (
      <Shell>
        <Loader2 aria-hidden="true" className="size-8 animate-spin text-landing-action" />
        <h1 className="mt-6 text-3xl font-semibold">Finishing your checkout…</h1>
        <p className="mt-3 text-landing-muted">
          {tries >= 10
            ? "This is taking longer than usual. Refresh in a minute, or email support@ovoa.ai if you were charged."
            : "This only takes a moment."}
        </p>
      </Shell>
    );
  }

  if (welcome.state === "error") {
    return (
      <Shell>
        <h1 className="text-3xl font-semibold">Almost there</h1>
        <p className="mt-3 text-landing-muted">{welcome.message}</p>
        <button type="button" onClick={() => void router.invalidate()} className={primaryButton}>
          Try again
        </button>
      </Shell>
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the address bar still has it */
    }
  }

  const copyRow = (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-landing-line p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-landing-muted">
        On a computer? Send this page to your iPhone, and bookmark it: it&rsquo;s your order link.
      </p>
      <button
        type="button"
        onClick={() => void copyLink()}
        className={`${secondaryButton} h-10 shrink-0 gap-2`}
      >
        <Copy aria-hidden="true" className="size-4" />
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );

  // "Band only": a Band order and the free app.
  if (welcome.state === "band") {
    const b = welcome;
    const refunded = b.band.status === "refunded";
    return (
      <Shell>
        <h1 className="text-[clamp(2.25rem,6vw,3.25rem)] font-semibold leading-[1.04]">
          {refunded
            ? "This Band order was refunded."
            : `Thanks${b.firstName ? `, ${b.firstName}` : ""}. Your Band is ordered.`}
        </h1>
        {!refunded && (
          <>
            <p className="mt-4 text-lg leading-relaxed text-landing-muted">
              Your Band works with the free OVOA app: health tracking and notes. Get the app ready
              now.
            </p>
            <BandCard band={b.band} email={b.email} />
            <AppSteps
              email={b.email}
              tf={b.testflight}
              signUpNote="Then pair your Band from the app when it arrives."
            />
            {copyRow}
            <section className="mt-10 rounded-[1.75rem] bg-landing-ink p-7 text-landing-action-foreground sm:p-8">
              <h2 className="text-2xl font-semibold">Want the assistant too?</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-landing-action-foreground/70">
                Base turns on OVOA&rsquo;s assistant: press the Band, ask, and hear the answer. Pro
                adds hands-free and the background agent.
              </p>
              <Link
                to="/early-access"
                hash="plans"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-landing-action px-6 text-sm font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5"
              >
                See plans
              </Link>
            </section>
          </>
        )}
      </Shell>
    );
  }

  const w = welcome;
  const trialEnd = formatDate(w.trialEndsAt);
  const renews = formatDate(w.renewsAt);
  const planName = PLAN_NAMES[w.tier];
  const priceText = w.price
    ? `${formatMoney(w.price.cents, w.price.currency)} a ${w.price.interval}`
    : null;

  const intro = !w.entitled
    ? "This plan has ended. You can start a new one anytime."
    : w.plan === "comp"
      ? `You have OVOA ${planName}, on us.`
      : w.plan === "lifetime"
        ? `You're a Founder: OVOA ${planName}, paid once.`
        : w.status === "trialing" && trialEnd
          ? w.cancelAtPeriodEnd
            ? `Your free days of OVOA ${planName} run until ${trialEnd}, and your plan is set to end then.`
            : `Your free days of OVOA ${planName} run until ${trialEnd}. After that it's ${priceText ?? "the plan price"} until you cancel, and nothing is charged before then.`
          : renews
            ? w.cancelAtPeriodEnd
              ? `You're on OVOA ${planName} until ${renews}.`
              : `You're on OVOA ${planName}${priceText ? `, ${priceText}` : ""}. It renews on ${renews}.`
            : `You're on OVOA ${planName}.`;

  async function take(to: "annual" | "pro", offer: WelcomeOffer) {
    if (!sessionId) return;
    if (
      offer.chargedToday &&
      !window.confirm(
        to === "pro"
          ? `Switch to Pro for ${money(offer)} a ${offer.interval}? It starts today and your card is charged now${w.status === "trialing" ? "; your free days end" : ", less what's left of your current payment"}.`
          : `Switch to yearly for ${money(offer)} a year? Your card is charged today, less what's left of this month's payment.`,
      )
    )
      return;
    setSwitching(to);
    setSwitchError(null);
    try {
      setWelcome(await doChange({ data: { sessionId, to } }));
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setSwitching(null);
    }
  }

  const { annual, pro } = w.offers;

  return (
    <Shell>
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-landing-action/12"
      >
        <Check className="size-7 text-landing-action" strokeWidth={2.5} />
      </span>
      <h1 className="mt-7 text-[clamp(2.25rem,6vw,3.25rem)] font-semibold leading-[1.04]">
        {w.entitled ? `You're in${w.firstName ? `, ${w.firstName}` : ""}.` : "Welcome back."}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-landing-muted">{intro}</p>

      {error === "portal" && (
        <p
          role="status"
          className="mt-6 rounded-2xl bg-landing-control px-5 py-4 text-sm font-medium"
        >
          Billing didn&rsquo;t open. Try again, or email support@ovoa.ai.
        </p>
      )}

      {w.band && <BandCard band={w.band} email={w.email} />}

      {w.entitled && (
        <AppSteps
          email={w.email}
          tf={w.testflight}
          signUpNote={`That's how OVOA knows you're on ${planName}.`}
        />
      )}

      {w.entitled && copyRow}

      {(annual || pro) && (
        <div className="mt-10">
          {annual && (
            <OfferCard
              title={`Pay yearly and save ${formatMoney(annual.saveCents ?? 0, annual.currency)} a year.`}
              body={
                annual.chargedToday
                  ? `${planName} yearly is ${money(annual)} a year instead of paying monthly. It starts today; what's left of this month's payment comes off. Cancel anytime.`
                  : `Nothing is charged today. ${money(annual)} a year starts when your free days end${trialEnd ? ` on ${trialEnd}` : ""}, instead of paying monthly. Cancel anytime.`
              }
              cta="Switch to yearly"
              busy={switching === "annual"}
              onTake={() => void take("annual", annual)}
            />
          )}
          {pro && (
            <OfferCard
              title="Go hands-free with Pro."
              body={`Pro adds the hands-free wake word, the background agent that runs jobs on its own, and almost three times the daily replies. ${money(pro)} a ${pro.interval}, starting today${w.status === "trialing" ? " (your free Base days end)" : ", less what's left of your current payment"}. Cancel anytime.`}
              cta={`Switch to Pro, ${money(pro)}/${pro.interval}`}
              busy={switching === "pro"}
              onTake={() => void take("pro", pro)}
            />
          )}
          {switchError && <p className="mt-3 text-sm text-landing-muted">{switchError}</p>}
        </div>
      )}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        {w.plan !== "comp" && sessionId && (
          <form method="post" action="/api/public/billing/portal" className="sm:flex-1">
            <input type="hidden" name="session_id" value={sessionId} />
            <button type="submit" className={`${secondaryButton} w-full`}>
              Manage billing
            </button>
          </form>
        )}
        {!w.entitled ? (
          <Link to="/early-access" className={`${secondaryButton} sm:flex-1`}>
            See plans
          </Link>
        ) : (
          <a href="mailto:support@ovoa.ai" className={`${secondaryButton} sm:flex-1`}>
            Email the team
          </a>
        )}
      </div>
    </Shell>
  );
}
