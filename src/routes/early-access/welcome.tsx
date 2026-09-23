import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Loader2, Package } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import {
  changePlan,
  getWelcome,
  setAppEmail,
  type WelcomeBand,
  type WelcomeData,
  type WelcomeOffer,
  type WelcomeTestflight,
} from "@/lib/membership/membership.functions";
import type { TrialOffer } from "@/lib/membership/email.server";
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
const field =
  "h-11 w-full rounded-xl border border-landing-line bg-landing-canvas px-4 text-[15px] text-landing-ink outline-none transition-colors placeholder:text-landing-muted focus:border-landing-action focus:ring-2 focus:ring-landing-action/15";

// Members only: the app account the plan goes to, and a way to move it when
// the app account uses another email (Apple Pay or Link filled in a different
// one, or they signed up in the app before paying).
type AppLink = {
  paidWith: string;
  appEmail: string;
  save: (appEmail: string) => Promise<string | null>;
};

function AppEmailSwitch({ link }: { link: AppLink }) {
  const moved = link.appEmail !== link.paidWith;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(moved ? link.appEmail : "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const error = await link.save(value);
    setBusy(false);
    if (error) setMessage(error);
    else {
      setOpen(false);
      setMessage("Saved. In the app, open Settings, then Your plan, and tap Refresh.");
    }
  }

  return (
    <div className="mt-3 text-sm">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-semibold text-landing-action"
        >
          {moved ? "Change the app email" : "Use a different email in the app"}
        </button>
      ) : (
        <form onSubmit={submit} className="grid gap-2">
          <label className="grid gap-1.5 font-medium text-landing-ink">
            The email you sign in to OVOA with
            <input
              className={field}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={link.paidWith}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <p>
            Your plan moves to that account; {link.paidWith} goes back to the free app. Leave it
            empty to keep it on {link.paidWith}.
          </p>
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className={`${primaryButton} mt-1`}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`${secondaryButton} mt-1`}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {message && (
        <p role="status" className="mt-2">
          {message}
        </p>
      )}
    </div>
  );
}

// Install TestFlight → join the beta → sign up. Same for members and for
// people who bought a Band on its own (they get the free app).
function AppSteps({
  email,
  tf,
  signUpNote,
  link,
}: {
  email: string;
  tf: WelcomeTestflight;
  signUpNote: string;
  link?: AppLink | undefined;
}) {
  const appEmail = link?.appEmail ?? email;
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
            Create your account with <strong className="text-landing-ink">{appEmail}</strong>
            {appEmail === email ? ", the email you paid with" : ""}, or sign in if you already have
            one. {signUpNote}
          </p>
          {link && <AppEmailSwitch link={link} />}
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

// A Band's free days of Base wait until the buyer starts them: with Base, on
// the card saved at checkout; Band only (trial.noCard), with no card, so they
// end on their own. A form POST (see /api/public/billing/start-trial), never a
// link, so a mail scanner opening the email's link can't start them.
function TrialCard({
  trial,
  sessionId,
  emailed,
}: {
  trial: TrialOffer;
  sessionId: string;
  emailed: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const { days, planName, price } = trial;
  const ends = formatDate(new Date(Date.now() + days * 86_400_000).toISOString());
  const then = trial.noCard
    ? "Then they end on their own. Nothing is charged."
    : price
      ? `Then it's ${price}${trial.card ? ` on your ${trial.card}` : ""}, until you cancel.`
      : "Then it's the monthly price, until you cancel.";
  return (
    <section
      id="start"
      className="mt-8 scroll-mt-20 rounded-[1.75rem] bg-landing-ink p-7 text-landing-action-foreground sm:p-8"
    >
      <h2 className="text-2xl font-semibold">{`Your ${days} free days of ${planName} are waiting.`}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-landing-action-foreground/70">
        They haven&rsquo;t started, so they won&rsquo;t run out while your Band is on its way. Start
        them when it arrives, or now if you&rsquo;d like to try the assistant in the app first.
        {emailed ? " The link to this page is in your order email." : ""}
      </p>
      {trial.noCard ? (
        <p className="mt-3 text-[15px] leading-relaxed text-landing-action-foreground/70">
          No card needed: your free days of {planName} end on their own after {days} days, and
          nothing is charged. Giving them to someone? Start them, then choose &ldquo;Use a different
          email in the app&rdquo; and enter theirs.
        </p>
      ) : (
        <p className="mt-3 text-[15px] leading-relaxed text-landing-action-foreground/70">
          Nothing is charged for {planName} until your {days} days are up. {then} Cancel before they
          end and you pay nothing more.
        </p>
      )}
      <form
        method="post"
        action="/api/public/billing/start-trial"
        onSubmit={(e) => {
          const ok = window.confirm(
            `Start your ${days} free days of ${planName} now? They run until ${ends}. ${then}`,
          );
          if (ok) setBusy(true);
          else e.preventDefault();
        }}
      >
        <input type="hidden" name="session_id" value={sessionId} />
        <button
          type="submit"
          disabled={busy}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-landing-action px-6 text-sm font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Start my {days} free days
        </button>
      </form>
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
  const doSetAppEmail = useServerFn(setAppEmail);

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

  const errorBanner =
    error === "portal"
      ? "Billing didn't open. Try again, or email support@ovoa.ai."
      : error === "start"
        ? "Your free days didn't start. Try again, or email support@ovoa.ai."
        : error === "no-trial"
          ? "There are no free days waiting on this order."
          : null;
  const errorRow = errorBanner && (
    <p role="status" className="mt-6 rounded-2xl bg-landing-control px-5 py-4 text-sm font-medium">
      {errorBanner}
    </p>
  );

  // A Band order and the free app, with its free days of Base still waiting
  // to be started (with Base, or Band only's with no card), or refunded with
  // nothing to start. Once they're started it's the member view below, and
  // back here when that plan ends (b.ended): the Band keeps the free app.
  if (welcome.state === "band") {
    const b = welcome;
    const refunded = b.band.status === "refunded";
    const name = b.firstName ? `, ${b.firstName}` : "";
    return (
      <Shell>
        <h1 className="text-[clamp(2.25rem,6vw,3.25rem)] font-semibold leading-[1.04]">
          {refunded
            ? "This Band order was refunded."
            : b.ended
              ? `Welcome back${name}.`
              : `Thanks${name}. Your Band is ordered.`}
        </h1>
        {errorRow}
        {!refunded && (
          <>
            <p className="mt-4 text-lg leading-relaxed text-landing-muted">
              {b.ended
                ? `Your ${PLAN_NAMES[b.ended]} plan has ended. Your Band keeps working with the free OVOA app: health tracking and notes.`
                : "Your Band works with the free OVOA app: health tracking and notes. Get the app ready now."}
            </p>
            {b.trial && sessionId && (
              <TrialCard trial={b.trial} sessionId={sessionId} emailed={b.emailed} />
            )}
            <BandCard band={b.band} email={b.email} />
            <AppSteps
              email={b.email}
              tf={b.testflight}
              signUpNote="Then pair your Band from the app when it arrives."
            />
            {copyRow}
            {!b.trial && (
              <section className="mt-10 rounded-[1.75rem] bg-landing-ink p-7 text-landing-action-foreground sm:p-8">
                <h2 className="text-2xl font-semibold">Want the assistant too?</h2>
                <p className="mt-3 text-[15px] leading-relaxed text-landing-action-foreground/70">
                  Base turns on OVOA&rsquo;s assistant: press the Band, ask, and hear the answer.
                  Pro is Base with three times as many AI replies a day.
                </p>
                <Link
                  to="/early-access"
                  hash="plans"
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-landing-action px-6 text-sm font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5"
                >
                  See plans
                </Link>
              </section>
            )}
          </>
        )}
        {b.ended && sessionId && (
          <form method="post" action="/api/public/billing/portal" className="mt-10">
            <input type="hidden" name="session_id" value={sessionId} />
            <button type="submit" className={`${secondaryButton} w-full sm:w-auto`}>
              Manage billing
            </button>
          </form>
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
          ? w.noCard
            ? `Your free days of OVOA ${planName} run until ${trialEnd}. They end on their own then, and nothing is charged: there's no card for them.`
            : w.cancelAtPeriodEnd
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

      {errorRow}

      {w.band && <BandCard band={w.band} email={w.email} />}

      {w.entitled && (
        <AppSteps
          email={w.email}
          tf={w.testflight}
          signUpNote={`That's how OVOA knows you're on ${planName}.`}
          link={
            sessionId
              ? {
                  paidWith: w.email,
                  appEmail: w.appEmail,
                  save: async (appEmail) => {
                    try {
                      setWelcome(await doSetAppEmail({ data: { sessionId, appEmail } }));
                      return null;
                    } catch (err) {
                      return err instanceof Error ? err.message : "That didn't save. Try again.";
                    }
                  },
                }
              : undefined
          }
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
              title="Get three times the daily replies with Pro."
              body={`Pro is Base with three times as many AI replies a day. ${money(pro)} a ${pro.interval}, starting today${w.status === "trialing" ? " (your free Base days end)" : ", less what's left of your current payment"}. Cancel anytime.`}
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
