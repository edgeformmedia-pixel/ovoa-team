import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, MessageCircle } from "lucide-react";
import qrcode from "qrcode-generator";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { AppleMark, GoogleMark } from "@/components/SignInMarks";
import {
  getLinked,
  getTextPage,
  startTextLink,
  type LinkCode,
  type Linked,
  type TextPage,
} from "@/lib/account/texting.functions";

// Text OVOA: the front door now. Sign in with Apple or Google, give the number
// you'll text from, then send OVOA a ready-made message with a one-time code:
// a QR code on a computer, a tap on a phone. The code proves the number
// (jarvis-api texting.ts), and from then on the thread in Messages is OVOA.

export const Route = createFileRoute("/text")({
  component: TextPageView,
  validateSearch: (search: Record<string, unknown>): { error?: string | undefined } => ({
    error: typeof search["error"] === "string" ? search["error"] : undefined,
  }),
  loader: () => getTextPage(),
  head: () => ({
    meta: [
      { title: "Text OVOA | Your AI assistant in iMessage" },
      {
        name: "description",
        content:
          "Sign in with Apple or Google, then text OVOA from your phone. Your AI assistant lives in iMessage.",
      },
    ],
  }),
});

const primaryButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-landing-action px-6 text-[15px] font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60";
const secondaryButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-landing-line px-6 text-[15px] font-semibold text-landing-ink transition-colors hover:border-landing-muted disabled:pointer-events-none disabled:opacity-50";
const field =
  "h-12 w-full rounded-xl border border-landing-line bg-landing-canvas px-4 text-[16px] text-landing-ink outline-none transition-colors placeholder:text-landing-muted focus:border-landing-action focus:ring-2 focus:ring-landing-action/15";

const ERRORS: Record<string, string> = {
  "google-off": "Continue with Google isn't set up yet. Try Apple.",
  "google-cancel": "Google sign-in was cancelled. Nothing changed.",
  "google-state": "That sign-in took too long or came from another tab. Try again.",
  google: "Google sign-in didn't go through. Try again.",
  "apple-off": "Continue with Apple isn't set up yet. Try Google.",
  "apple-cancel": "Apple sign-in was cancelled. Nothing changed.",
  "apple-state": "That sign-in took too long or came from another tab. Try again.",
  apple: "Apple sign-in didn't go through. Try again.",
};

function TextPageView() {
  const data = Route.useLoaderData();
  const { error } = Route.useSearch();
  const notice = error ? (ERRORS[error] ?? null) : null;
  return (
    <main className="min-h-dvh bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <Link
          to="/account"
          className="text-xs text-landing-muted transition-colors hover:text-landing-ink"
        >
          Account
        </Link>
      </MembershipHeader>
      <div className="mx-auto max-w-[480px] px-5 pb-24 pt-12 sm:pt-16">
        <Steps at={data.state === "in" ? (data.linked ? 3 : 2) : 1} />
        {notice && <Notice>{notice}</Notice>}
        {data.state === "out" && <SignIn data={data} />}
        {data.state === "down" && (
          <Notice>We can&rsquo;t reach OVOA right now. Try again in a minute.</Notice>
        )}
        {data.state === "in" && <Connect data={data} />}
      </div>
    </main>
  );
}

function Steps({ at }: { at: 1 | 2 | 3 }) {
  const labels = ["Sign in", "Your number", "Text OVOA"];
  return (
    <ol className="flex items-center gap-2 text-xs font-medium text-landing-muted">
      {labels.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`grid size-5 place-items-center rounded-full text-[11px] ${
              i + 1 <= at
                ? "bg-landing-action text-landing-action-foreground"
                : "border border-landing-line"
            }`}
          >
            {i + 1 < at ? <Check className="size-3" aria-hidden="true" /> : i + 1}
          </span>
          <span className={i + 1 === at ? "text-landing-ink" : ""}>{label}</span>
          {i < labels.length - 1 && <span aria-hidden="true" className="h-px w-4 bg-landing-line" />}
        </li>
      ))}
    </ol>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mt-6 rounded-2xl bg-landing-control px-5 py-4 text-sm font-medium">
      {children}
    </p>
  );
}

// ---------- 1. Sign in ----------

function SignIn({ data }: { data: Extract<TextPage, { state: "out" }> }) {
  return (
    <>
      <h1 className="mt-8 text-[clamp(2.1rem,7vw,3rem)] font-semibold leading-[1.04]">
        Your assistant, in iMessage.
      </h1>
      <p className="mt-4 text-[16px] leading-relaxed text-landing-muted">
        OVOA plans, reminds, researches and follows through, all by text. Sign in, add your number,
        and start texting it in under a minute.
      </p>
      <div className="mt-8 grid gap-3">
        <SignInButton on={data.apple} href="/api/public/account/apple?next=/text" dark>
          <AppleMark />
          Continue with Apple
        </SignInButton>
        <SignInButton on={data.google} href="/api/public/account/google?next=/text">
          <GoogleMark />
          Continue with Google
        </SignInButton>
      </div>
      <p className="mt-5 text-center text-xs leading-relaxed text-landing-muted">
        One OVOA account for texting, the app and this site. By continuing you agree to the{" "}
        <Link to="/terms" className="underline underline-offset-2">
          Terms
        </Link>{" "}
        and{" "}
        <Link to="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </>
  );
}

function SignInButton({
  on,
  href,
  dark,
  children,
}: {
  on: boolean;
  href: string;
  dark?: boolean;
  children: ReactNode;
}) {
  const style = dark
    ? "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-6 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-black"
    : `${secondaryButton} w-full`;
  if (on)
    return (
      <a href={href} className={style}>
        {children}
      </a>
    );
  return (
    <button type="button" disabled title="Coming soon" className={`${style} opacity-50`}>
      {children}
    </button>
  );
}

// ---------- 2 and 3. Number, then the text ----------

/** A US number or one typed with its country code, as +E.164; null if it doesn't look like one. */
function toE164(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  if (/^\+[1-9]\d{7,14}$/.test(digits)) return digits;
  const bare = digits.replace(/\D/g, "");
  if (bare.length === 10) return `+1${bare}`;
  if (bare.length === 11 && bare.startsWith("1")) return `+${bare}`;
  return null;
}

const pretty = (e164: string) =>
  /^\+1\d{10}$/.test(e164)
    ? `(${e164.slice(2, 5)}) ${e164.slice(5, 8)}-${e164.slice(8)}`
    : e164;

type Device = "iphone" | "android" | "desktop";

function useDevice(): Device | null {
  const [device, setDevice] = useState<Device | null>(null);
  useEffect(() => {
    const ua = navigator.userAgent;
    // iPadOS says it's a Mac; the touch screen gives it away.
    const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    if (/iPhone|iPad|iPod/.test(ua) || ipad) setDevice("iphone");
    else if (/Android/.test(ua)) setDevice("android");
    else setDevice("desktop");
  }, []);
  return device;
}

// iOS wants sms:NUMBER&body=, Android sms:NUMBER?body=. A QR code uses SMSTO:,
// which both phones' cameras open as a message ready to send.
const smsHref = (number: string, body: string, device: Device) =>
  `sms:${number}${device === "android" ? "?" : "&"}body=${encodeURIComponent(body)}`;
const smsQr = (number: string, body: string) => `SMSTO:${number}:${body}`;

function Connect({ data }: { data: Extract<TextPage, { state: "in" }> }) {
  const start = useServerFn(startTextLink);
  const poll = useServerFn(getLinked);
  const device = useDevice();
  const [phone, setPhone] = useState("");
  const [entered, setEntered] = useState<string | null>(null);
  const [code, setCode] = useState<Extract<LinkCode, { ok: true }> | null>(null);
  const [linked, setLinked] = useState<Linked>(data.linked);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // While the code is up, look every few seconds for the text to arrive.
  useEffect(() => {
    if (!code || linked) return;
    let stop = false;
    const timer = window.setInterval(async () => {
      try {
        const { linked: now } = await poll();
        if (!stop && now && now.linkedAt >= code.expiresAt - 15 * 60 * 1000) setLinked(now);
      } catch {
        // Try again next tick.
      }
    }, 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [code, linked, poll]);

  async function next(e: FormEvent) {
    e.preventDefault();
    const e164 = toE164(phone);
    if (!e164) {
      setError("Enter the mobile number you'll text from, like (555) 123-4567.");
      return;
    }
    setBusy(true);
    setError(null);
    const reply = await start().catch(() => null);
    setBusy(false);
    if (!reply?.ok) {
      setError(reply?.error ?? "That didn't work. Try again.");
      return;
    }
    setEntered(e164);
    setLinked(null);
    setCode(reply);
  }

  const first = data.name.split(" ")[0];

  if (linked && (code || !entered))
    return <Done linked={linked} number={code?.number ?? data.number} device={device} entered={entered} />;

  if (!data.available)
    return (
      <>
        <h1 className="mt-8 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.05]">
          You&rsquo;re in{first ? `, ${first}` : ""}.
        </h1>
        <Notice>
          Texting OVOA isn&rsquo;t open right this minute. Try again shortly, or email
          support@ovoa.ai.
        </Notice>
      </>
    );

  if (!code || !entered)
    return (
      <>
        <h1 className="mt-8 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.05]">
          What&rsquo;s your number{first ? `, ${first}` : ""}?
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-landing-muted">
          The iPhone number you&rsquo;ll text OVOA from. Next you&rsquo;ll send one ready-made
          message to prove it&rsquo;s yours.
        </p>
        <form onSubmit={next} className="mt-8 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Mobile number
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={field}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Continue
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-landing-muted">
          Signed in as {data.email}. Standard messaging rates may apply.
        </p>
      </>
    );

  return (
    <SendCode
      code={code}
      entered={entered}
      device={device}
      onBack={() => setCode(null)}
      onAgain={async () => {
        const reply = await start().catch(() => null);
        if (reply?.ok) setCode(reply);
      }}
    />
  );
}

function SendCode({
  code,
  entered,
  device,
  onBack,
  onAgain,
}: {
  code: Extract<LinkCode, { ok: true }>;
  entered: string;
  device: Device | null;
  onBack: () => void;
  onAgain: () => void;
}) {
  const [left, setLeft] = useState(() => code.expiresAt - Date.now());
  useEffect(() => {
    setLeft(code.expiresAt - Date.now());
    const t = window.setInterval(() => setLeft(code.expiresAt - Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [code]);
  const expired = code.expiresAt > 0 && left <= 0;
  const mobile = device === "iphone" || device === "android";

  return (
    <>
      <h1 className="mt-8 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.05]">
        {mobile ? "Send OVOA your code." : "Scan to text OVOA."}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-landing-muted">
        {mobile ? (
          <>
            Tap below. Messages opens with the text ready, just hit send from{" "}
            <strong className="text-landing-ink">{pretty(entered)}</strong>.
          </>
        ) : (
          <>
            Point your iPhone&rsquo;s camera at the code. Messages opens with the text ready, just
            hit send from <strong className="text-landing-ink">{pretty(entered)}</strong>.
          </>
        )}
      </p>

      {expired ? (
        <div className="mt-8 grid gap-3">
          <Notice>That code ran out of time.</Notice>
          <button type="button" onClick={onAgain} className={primaryButton}>
            Get a new code
          </button>
        </div>
      ) : mobile ? (
        <a
          href={smsHref(code.number, code.body, device)}
          className={`${primaryButton} mt-8 w-full bg-[#0a84ff] text-white`}
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          Text OVOA in Messages
        </a>
      ) : (
        <div className="mt-8 flex flex-col items-center">
          <Qr text={smsQr(code.number, code.body)} />
          <p className="mt-4 text-center text-xs text-landing-muted">
            No camera handy? Text{" "}
            <strong className="font-semibold text-landing-ink">{code.body}</strong> to{" "}
            <strong className="font-semibold text-landing-ink">{pretty(code.number)}</strong>.
          </p>
        </div>
      )}

      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-landing-muted">
        {!expired && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {!expired && <span>Waiting for your text&hellip;</span>}
      </div>
      {!expired && code.expiresAt > 0 && (
        <p className="mt-1 text-center text-xs text-landing-muted">
          Code good for {Math.max(0, Math.ceil(left / 60000))} more min.
        </p>
      )}
      <button
        type="button"
        onClick={onBack}
        className="mx-auto mt-6 block text-xs text-landing-muted underline underline-offset-2"
      >
        Use a different number
      </button>
    </>
  );
}

function Qr({ text }: { text: string }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }, [text]);
  return (
    <div
      role="img"
      aria-label="QR code that opens Messages with your code to OVOA"
      className="w-[240px] rounded-3xl bg-white p-3 shadow-sm ring-1 ring-landing-line [&_svg]:h-auto [&_svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function Done({
  linked,
  number,
  device,
  entered,
}: {
  linked: NonNullable<Linked>;
  number: string | null;
  device: Device | null;
  entered: string | null;
}) {
  const mobile = device === "iphone" || device === "android";
  const other = entered && linked.phone !== entered;
  const hello = "Hey OVOA, what can you do?";
  return (
    <>
      <div className="mt-8 grid size-14 place-items-center rounded-full bg-landing-action text-landing-action-foreground">
        <Check className="size-7" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.05]">
        You&rsquo;re connected.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-landing-muted">
        OVOA just texted <strong className="text-landing-ink">{pretty(linked.phone)}</strong>. Reply
        in that thread like you would a friend: &ldquo;remind me to call Mom at 6&rdquo;,
        &ldquo;plan a date night Friday&rdquo;, &ldquo;what&rsquo;s on my calendar tomorrow?&rdquo;
      </p>
      {other && (
        <Notice>
          Heads up: the text came from {pretty(linked.phone)}, not {pretty(entered)}. OVOA answers
          the number that texted it.
        </Notice>
      )}
      {number &&
        (mobile ? (
          <a
            href={smsHref(number, hello, device)}
            className={`${primaryButton} mt-8 w-full bg-[#0a84ff] text-white`}
          >
            <MessageCircle className="size-5" aria-hidden="true" />
            Open OVOA in Messages
          </a>
        ) : (
          <div className="mt-8 flex flex-col items-center">
            <Qr text={smsQr(number, hello)} />
            <p className="mt-4 text-center text-xs text-landing-muted">
              Scan to start a conversation, or save {pretty(number)} as &ldquo;OVOA&rdquo;.
            </p>
          </div>
        ))}
      <div className="mt-10 grid gap-3">
        <Link to="/early-access" className={`${secondaryButton} w-full`}>
          See plans
        </Link>
        <Link to="/account" className="text-center text-xs text-landing-muted underline">
          Your account
        </Link>
      </div>
    </>
  );
}
