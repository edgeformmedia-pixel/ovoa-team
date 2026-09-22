import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Loader2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import {
  getWelcome,
  switchToAnnual,
  type WelcomeData,
} from "@/lib/membership/membership.functions";
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
const formatDate = (value: string | null) => (value ? dateFormat.format(new Date(value)) : null);

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

function Welcome() {
  const data = Route.useLoaderData();
  const { session_id: sessionId, error } = Route.useSearch();
  const router = useRouter();
  const [welcome, setWelcome] = useState(data);
  const [tries, setTries] = useState(0);
  const [copied, setCopied] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const doSwitch = useServerFn(switchToAnnual);

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

  const w = welcome;
  const trialEnd = formatDate(w.trialEndsAt);
  const renews = formatDate(w.renewsAt);
  const tf = w.testflight;

  const intro = !w.entitled
    ? "This membership has ended. You can start a new one anytime."
    : w.plan === "lifetime"
      ? "You're a Founder. Paid once, yours for good."
      : w.status === "trialing" && trialEnd
        ? `Your free trial runs until ${trialEnd}. You won't be charged before then${w.cancelAtPeriodEnd ? ", and your membership is set to end with the trial" : ""}.`
        : renews
          ? w.cancelAtPeriodEnd
            ? `Your membership ends on ${renews}.`
            : `Your membership renews on ${renews}.`
          : "Your membership is active.";

  async function upgrade() {
    if (!sessionId) return;
    setSwitching(true);
    setSwitchError(null);
    try {
      setWelcome(await doSwitch({ data: { sessionId } }));
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setSwitching(false);
    }
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

      {w.entitled && (
        <section className="mt-10 rounded-[1.75rem] bg-landing-control/70 px-6 sm:px-8">
          <h2 className="sr-only">Get the app</h2>
          <ol>
            <Step n={1} title="Install TestFlight">
              <p>Apple&rsquo;s free app for beta software. On your iPhone:</p>
              <a
                href={TESTFLIGHT_APP_URL}
                target="_blank"
                rel="noreferrer"
                className={primaryButton}
              >
                Get TestFlight
              </a>
            </Step>

            <Step
              n={2}
              title="Join the OVOA beta"
              done={tf.mode === "invite" && tf.state === "invited"}
            >
              {tf.mode === "invite" && tf.state === "invited" && (
                <p>
                  Apple is emailing your invite to{" "}
                  <strong className="text-landing-ink">{w.email}</strong>. Open it on your iPhone
                  and tap <strong className="text-landing-ink">View in TestFlight</strong>, then
                  Install.
                </p>
              )}
              {tf.mode === "invite" && tf.state !== "invited" && !tf.publicUrl && (
                <p>
                  Your invite is on its way to{" "}
                  <strong className="text-landing-ink">{w.email}</strong>. If it isn&rsquo;t there
                  within the hour, email support@ovoa.ai.
                </p>
              )}
              {tf.mode === "manual" && (
                <p>
                  We&rsquo;ll email your TestFlight invite to{" "}
                  <strong className="text-landing-ink">{w.email}</strong> within 24 hours. Open it
                  on your iPhone and tap View in TestFlight.
                </p>
              )}
              {tf.publicUrl && (tf.mode === "link" || tf.state !== "invited") && (
                <>
                  <p>Open this on your iPhone, then tap Install.</p>
                  <a href={tf.publicUrl} target="_blank" rel="noreferrer" className={primaryButton}>
                    Join the OVOA beta
                  </a>
                </>
              )}
              {tf.publicUrl && tf.mode === "invite" && tf.state === "invited" && (
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
                Create your account with <strong className="text-landing-ink">{w.email}</strong>,
                the email you paid with, so OVOA knows you&rsquo;re a member.
              </p>
            </Step>
          </ol>
        </section>
      )}

      {w.entitled && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-landing-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-landing-muted">
            On a computer? Send this page to your iPhone, and bookmark it: it&rsquo;s your
            membership link.
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
      )}

      {w.upgrade && (
        <section className="mt-10 rounded-[1.75rem] bg-landing-ink p-7 text-landing-action-foreground sm:p-8">
          <p className="text-sm font-medium text-landing-action">One-time offer</p>
          <h2 className="mt-2 text-2xl font-semibold">
            Switch to annual and save {formatMoney(w.upgrade.saveCents, w.upgrade.currency)} a year.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-landing-action-foreground/70">
            Nothing is charged today. {formatMoney(w.upgrade.annualCents, w.upgrade.currency)} a
            year starts when your trial ends{trialEnd ? ` on ${trialEnd}` : ""}, instead of paying
            monthly. Cancel anytime.
          </p>
          <button
            type="button"
            onClick={() => void upgrade()}
            disabled={switching}
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-landing-action px-6 text-sm font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {switching && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            Switch to annual
          </button>
          {switchError && (
            <p className="mt-3 text-sm text-landing-action-foreground/80">{switchError}</p>
          )}
        </section>
      )}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        {w.plan !== "comp" && sessionId && (
          <form method="post" action="/api/public/billing/portal" className="flex-1">
            <input type="hidden" name="session_id" value={sessionId} />
            <button type="submit" className={`${secondaryButton} w-full`}>
              Manage billing
            </button>
          </form>
        )}
        {!w.entitled ? (
          <Link to="/early-access" className={`${secondaryButton} flex-1`}>
            See plans
          </Link>
        ) : (
          <a href="mailto:support@ovoa.ai" className={`${secondaryButton} flex-1`}>
            Email the team
          </a>
        )}
      </div>
    </Shell>
  );
}
