import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { getAccount, type AccountPage } from "@/lib/account/account.functions";
import { PLAN_BLURBS, PLAN_NAMES } from "@/lib/membership/copy";
import { TESTFLIGHT_APP_URL } from "@/lib/membership/plans";
import type { Membership } from "@/lib/membership/resolve";

// One OVOA account for the app and this site (src/lib/account/account.server.ts).
// Signed out: Google, or an emailed code, then a name and a password for new
// accounts. Signed in: the account, its plan, and how to get the app.

export const Route = createFileRoute("/account")({
  component: Account,
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { error?: string | undefined } => ({
    error: typeof search["error"] === "string" ? search["error"] : undefined,
  }),
  loader: () => getAccount(),
  head: () => ({
    meta: [
      { title: "Your OVOA account" },
      {
        name: "description",
        content: "Sign in or create your OVOA account: one account for the OVOA app and ovoa.ai.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-landing-action px-6 text-sm font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60";
const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-landing-line px-6 text-sm font-semibold text-landing-ink transition-colors hover:border-landing-muted disabled:pointer-events-none disabled:opacity-50";
const field =
  "h-11 w-full rounded-xl border border-landing-line bg-landing-canvas px-4 text-[15px] text-landing-ink outline-none transition-colors placeholder:text-landing-muted focus:border-landing-action focus:ring-2 focus:ring-landing-action/15";
const linkButton = "font-semibold text-landing-action disabled:text-landing-muted";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
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
      <div className="mx-auto max-w-[460px] px-5 pb-24 pt-12 sm:pt-16">{children}</div>
    </main>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mt-6 rounded-2xl bg-landing-control px-5 py-4 text-sm font-medium">
      {children}
    </p>
  );
}

const SEARCH_ERRORS: Record<string, string> = {
  "google-off": "Continue with Google isn't set up yet. Use your email for now.",
  "google-cancel": "Google sign-in was cancelled. Nothing changed.",
  "google-state": "That Google sign-in took too long or came from another tab. Try again.",
  google: "Google sign-in didn't go through. Try again, or use your email.",
  billing: "Billing didn't open. Try again, or email support@ovoa.ai.",
};

function Account() {
  const data = Route.useLoaderData();
  const { error } = Route.useSearch();
  const notice = error ? (SEARCH_ERRORS[error] ?? null) : null;
  return (
    <Shell>
      {data.state === "in" ? (
        <SignedIn data={data} notice={notice} />
      ) : (
        <SignIn data={data} notice={notice} />
      )}
    </Shell>
  );
}

// ---------- Signed out ----------

type SignInData = Extract<AccountPage, { state: "out" | "down" }>;

type Step =
  | { at: "email" }
  | { at: "code"; email: string }
  // A proven address with no account yet (a code, or Google).
  | { at: "finish"; ticket: string; email: string; name: string };

type Reply = Record<string, unknown> & { error?: string };

// The code steps go from the browser straight to the app's server, so its
// per-address sign-in limits count this visitor (account.server.ts).
async function post(
  apiUrl: string,
  path: string,
  body: unknown,
): Promise<{ ok: boolean; data: Reply }> {
  try {
    const res = await fetch(`${apiUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Reply;
    return { ok: res.ok, data };
  } catch {
    return {
      ok: false,
      data: { error: "Can't reach OVOA right now. Check your connection and try again." },
    };
  }
}

const isToken = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{64}$/.test(v);

function SignIn({ data, notice }: { data: SignInData; notice: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ at: "email" });
  const [message, setMessage] = useState<string | null>(notice);

  // Back from Google with no account yet: the ticket is in the fragment.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const ticket = hash.get("finish");
    const email = hash.get("email");
    if (ticket && email) {
      setStep({ at: "finish", ticket, email, name: hash.get("name") ?? "" });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // What every path ends with: the session goes into this site's cookie.
  async function keep(reply: Reply): Promise<string | null> {
    if (isToken(reply["token"])) {
      try {
        const res = await fetch("/api/public/account/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: reply["token"] }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as Reply;
          return body.error ?? "Signing in didn't finish. Try again.";
        }
      } catch {
        return "Can't reach ovoa.ai right now. Check your connection and try again.";
      }
      await router.invalidate();
      return null;
    }
    if (typeof reply["ticket"] === "string" && typeof reply["email"] === "string") {
      setStep({
        at: "finish",
        ticket: reply["ticket"],
        email: reply["email"],
        name: typeof reply["name"] === "string" ? reply["name"] : "",
      });
      return null;
    }
    return "Something went wrong. Try again.";
  }

  return (
    <>
      {data.state === "down" && (
        <Notice>
          We can&rsquo;t reach your account right now, so you&rsquo;re shown as signed out. Try
          again in a minute.
        </Notice>
      )}
      {message && <Notice>{message}</Notice>}
      {step.at === "email" && (
        <EmailStep
          data={data}
          onSent={(email) => {
            setMessage(null);
            setStep({ at: "code", email });
          }}
        />
      )}
      {step.at === "code" && (
        <CodeStep
          apiUrl={data.apiUrl}
          email={step.email}
          keep={keep}
          back={(why) => {
            setMessage(why);
            setStep({ at: "email" });
          }}
        />
      )}
      {step.at === "finish" && (
        <FinishStep
          apiUrl={data.apiUrl}
          step={step}
          keep={keep}
          back={(why) => {
            setMessage(why);
            setStep({ at: "email" });
          }}
        />
      )}
    </>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="size-[18px]">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function EmailStep({ data, onSent }: { data: SignInData; onSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setBusy(true);
    setError(null);
    const { ok, data: reply } = await post(data.apiUrl, "/auth/email/code", { email: clean });
    setBusy(false);
    // "Just sent one" still means there's a code in their inbox.
    if (ok || typeof reply["retryAfter"] === "number") {
      if (!ok && (reply["retryAfter"] as number) > 60) {
        setError(reply.error ?? "Too many codes for now. Try again later.");
        return;
      }
      onSent(clean);
    } else setError(reply.error ?? "That didn't work. Try again.");
  }

  return (
    <>
      <h1 className="mt-6 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.05]">
        Sign in or create your account
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-landing-muted">
        One OVOA account for the app and this site. Already use the OVOA app? Use the same email and
        you&rsquo;re in.
      </p>

      <div className="mt-8">
        {data.google ? (
          <a href="/api/public/account/google" className={`${secondaryButton} w-full`}>
            <GoogleMark />
            Continue with Google
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="Google sign-in is coming soon"
            className={`${secondaryButton} w-full`}
          >
            <GoogleMark />
            Continue with Google
          </button>
        )}
        {!data.google && (
          <p className="mt-2 text-center text-xs text-landing-muted">Google sign-in opens soon.</p>
        )}
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-landing-muted">
        <span className="h-px flex-1 bg-landing-line" />
        or
        <span className="h-px flex-1 bg-landing-line" />
      </div>

      <form onSubmit={send} className="grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Email
          <input
            className={field}
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-landing-ink">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={`${primaryButton} mt-1 w-full`}>
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          Email me a code
        </button>
      </form>
      <p className="mt-4 text-center text-xs leading-relaxed text-landing-muted">
        We&rsquo;ll send a 6-digit code from no-reply@ovoa.ai.
      </p>
    </>
  );
}

const RESEND_SECONDS = 30;

function CodeStep({
  apiUrl,
  email,
  keep,
  back,
}: {
  apiUrl: string;
  email: string;
  keep: (reply: Reply) => Promise<string | null>;
  back: (why: string | null) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_SECONDS);
  const input = useRef<HTMLInputElement>(null);
  const tried = useRef("");

  useEffect(() => {
    input.current?.focus();
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function verify(value: string) {
    if (busy || value.length !== 6) return;
    tried.current = value;
    setBusy(true);
    setError(null);
    setStatus(null);
    const { ok, data: reply } = await post(apiUrl, "/auth/email/verify", { email, code: value });
    if (!ok) {
      setBusy(false);
      if (reply["expired"]) {
        setCode("");
        setError(reply.error ?? "That code has run out. Send a new one.");
      } else setError(reply.error ?? "That didn't work. Try again.");
      return;
    }
    const problem = await keep(reply);
    setBusy(false);
    if (problem) setError(problem);
  }

  // Six digits typed or pasted: go, once per code.
  function change(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && digits !== tried.current) void verify(digits);
  }

  async function resend() {
    setError(null);
    setStatus(null);
    const { ok, data: reply } = await post(apiUrl, "/auth/email/code", { email });
    if (ok) {
      setStatus("New code sent. The one before it no longer works.");
      setCode("");
      tried.current = "";
      setWait(RESEND_SECONDS);
      input.current?.focus();
    } else {
      if (typeof reply["retryAfter"] === "number") setWait(Math.min(reply["retryAfter"], 3600));
      setError(reply.error ?? "That didn't work. Try again.");
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void verify(code);
  }

  return (
    <>
      <h1 className="mt-6 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.05]">
        Check your email
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-landing-muted">
        We sent a 6-digit code to <strong className="text-landing-ink">{email}</strong>. It works
        for 10 minutes.
      </p>
      <form onSubmit={submit} className="mt-8 grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Code
          <input
            ref={input}
            className={`${field} h-14 text-center font-mono text-2xl tracking-[0.4em]`}
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={12}
            required
            placeholder="000000"
            value={code}
            onChange={(e) => change(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-landing-ink">
            {error}
          </p>
        )}
        {status && (
          <p role="status" className="text-sm text-landing-muted">
            {status}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className={`${primaryButton} mt-1 w-full`}
        >
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          Continue
        </button>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
        <button
          type="button"
          disabled={wait > 0}
          onClick={() => void resend()}
          className={linkButton}
        >
          {wait > 0
            ? `Send a new code in ${wait > 90 ? `${Math.ceil(wait / 60)} min` : `${wait}s`}`
            : "Send a new code"}
        </button>
        <button type="button" onClick={() => back(null)} className={linkButton}>
          Use a different email
        </button>
      </div>
      <p className="mt-4 text-center text-xs leading-relaxed text-landing-muted">
        Not there? Check spam, or search your mail for &ldquo;OVOA code&rdquo;.
      </p>
    </>
  );
}

function FinishStep({
  apiUrl,
  step,
  keep,
  back,
}: {
  apiUrl: string;
  step: Extract<Step, { at: "finish" }>;
  keep: (reply: Reply) => Promise<string | null>;
  back: (why: string | null) => void;
}) {
  const [name, setName] = useState(step.name);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    const { ok, data: reply } = await post(apiUrl, "/auth/email/signup", {
      ticket: step.ticket,
      name: name.trim(),
      password,
    });
    if (!ok) {
      setBusy(false);
      if (reply["expired"]) {
        back(reply.error ?? "This sign-up ran out of time. Start again with your email.");
        return;
      }
      const f = (reply["fields"] ?? {}) as Record<string, string>;
      setFields(f);
      if (Object.keys(f).length === 0) setError(reply.error ?? "That didn't work. Try again.");
      return;
    }
    const problem = await keep(reply);
    setBusy(false);
    if (problem) setError(problem);
  }

  return (
    <>
      <h1 className="mt-6 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.05]">
        Create your OVOA account
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-landing-muted">
        <strong className="text-landing-ink">{step.email}</strong> is confirmed. Add your name and a
        password, and you&rsquo;re done.
      </p>
      <form onSubmit={create} className="mt-8 grid gap-4">
        {/* For password managers: which account this password belongs to. */}
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={step.email}
          readOnly
          hidden
        />
        <label className="grid gap-1.5 text-sm font-medium">
          Your name
          <input
            className={field}
            name="name"
            autoComplete="name"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {fields["name"] && <span className="font-normal text-landing-ink">{fields["name"]}</span>}
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Password
          <input
            className={field}
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={200}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="font-normal text-landing-muted">
            {fields["password"] ??
              `At least 8 characters. You'll sign in to the OVOA app with ${step.email} and this password.`}
          </span>
        </label>
        {error && (
          <p role="alert" className="text-sm text-landing-ink">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={`${primaryButton} mt-1 w-full`}>
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          Create account
        </button>
      </form>
      <p className="mt-4 text-center text-xs leading-relaxed text-landing-muted">
        By creating an account you agree to the{" "}
        <Link to="/terms" className="underline underline-offset-2">
          Terms
        </Link>{" "}
        and the{" "}
        <Link to="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </>
  );
}

// ---------- Signed in ----------

function planSummary(m: Membership | null): { name: string; detail: string } {
  if (!m)
    return {
      name: "Couldn't load",
      detail: "Your plan didn't load just now. Refresh to try again.",
    };
  const name = PLAN_NAMES[m.tier];
  if (m.tier === "free") {
    return {
      name,
      detail:
        m.status === "canceled"
          ? `Your plan has ended. ${PLAN_BLURBS.free}`
          : `${PLAN_BLURBS.free} The assistant comes with Base and Pro.`,
    };
  }
  switch (m.status) {
    case "trialing":
      return { name, detail: `Free days until ${formatDate(m.trialEndsAt) ?? "they end"}.` };
    case "comp":
      return { name, detail: "Free access, from OVOA." };
    case "past_due":
      return { name, detail: "Your last payment didn't go through. Update your card in billing." };
    default:
      return {
        name,
        detail: m.renewsAt ? `Renews ${formatDate(m.renewsAt)}.` : PLAN_BLURBS[m.tier],
      };
  }
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-landing-line py-4 last:border-b-0 sm:flex-row sm:gap-6">
      <dt className="w-24 shrink-0 text-sm text-landing-muted">{label}</dt>
      <dd className="min-w-0 break-words text-[15px]">{children}</dd>
    </div>
  );
}

function SignedIn({
  data,
  notice,
}: {
  data: Extract<AccountPage, { state: "in" }>;
  notice: string | null;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const first = data.name.trim().split(/\s+/)[0];
  const plan = planSummary(data.membership);
  const paid = data.membership && data.membership.tier !== "free";

  async function signOut() {
    setLeaving(true);
    try {
      await fetch("/api/public/account/session", { method: "DELETE" });
    } finally {
      await router.invalidate();
      setLeaving(false);
    }
  }

  return (
    <>
      <h1 className="mt-6 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.05]">
        {first ? `Hi, ${first}.` : "Your OVOA account"}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-landing-muted">
        This is the account you use in the OVOA app. Plans you buy on ovoa.ai while signed in go to
        it.
      </p>
      {notice && <Notice>{notice}</Notice>}

      <dl className="mt-8 rounded-2xl border border-landing-line px-5">
        <Row label="Name">{data.name || "Not set"}</Row>
        <Row label="Email">{data.email}</Row>
        <Row label="Plan">
          <span className="font-semibold">{plan.name}</span>
          <span className="mt-0.5 block text-sm text-landing-muted">{plan.detail}</span>
        </Row>
      </dl>

      <div className="mt-5 flex flex-wrap gap-3">
        {!paid && (
          <Link to="/early-access" hash="plans" className={primaryButton}>
            See plans
          </Link>
        )}
        {data.billing && (
          <form method="post" action="/api/public/account/billing">
            <button type="submit" className={paid ? primaryButton : secondaryButton}>
              Manage billing
            </button>
          </form>
        )}
      </div>

      <section className="mt-10 rounded-[1.75rem] bg-landing-control/70 px-6 py-6 sm:px-7">
        <h2 className="text-lg font-semibold">Get the app</h2>
        <ol className="mt-3 grid list-decimal gap-2 pl-5 text-[15px] leading-relaxed text-landing-muted">
          <li>
            On your iPhone, install{" "}
            <a href={TESTFLIGHT_APP_URL} target="_blank" rel="noreferrer" className={linkButton}>
              TestFlight
            </a>
            , Apple&rsquo;s app for betas.
          </li>
          <li>
            {data.betaUrl ? (
              <>
                <a href={data.betaUrl} target="_blank" rel="noreferrer" className={linkButton}>
                  Join the OVOA beta
                </a>{" "}
                and tap Install.
              </>
            ) : (
              <>
                Join the OVOA beta from your TestFlight invite. No invite? Write to support@ovoa.ai.
              </>
            )}
          </li>
          <li>
            Open OVOA and sign in with <strong className="text-landing-ink">{data.email}</strong>{" "}
            and your password.
          </li>
        </ol>
      </section>

      <button
        type="button"
        onClick={() => void signOut()}
        disabled={leaving}
        className={`${secondaryButton} mt-10`}
      >
        {leaving ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
        Sign out
      </button>
    </>
  );
}
