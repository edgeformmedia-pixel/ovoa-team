import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, MessageCircle } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { AppleMark, GoogleMark } from "@/components/SignInMarks";
import {
  Qr,
  pretty,
  primaryButton,
  secondaryButton,
  smsHref,
  smsQr,
  useDevice,
} from "@/components/texting";
import { getTextPage, joinText, type Joined } from "@/lib/account/texting.functions";

// /join?id=…: the link OVOA texts a trial number once its free texts (and the
// ones for an email) run out (jarvis-api guest.ts joinLink). Sign in with
// Apple or Google, which makes the account, and the number that got the link
// is linked to it: no code to text back. Then Messages opens to OVOA with
// "I created my account!" ready to send.
//
// Sign-in leaves the site and comes back to plain /join (sign-in's next page
// can't carry a query), so the id waits in localStorage meanwhile.

const KEY = "ovoa_join_id";
const DONE_TEXT = "I created my account!";

export const Route = createFileRoute("/join")({
  component: JoinView,
  staticData: { sitemap: false },
  validateSearch: (
    search: Record<string, unknown>,
  ): { id?: string | undefined; error?: string | undefined } => ({
    id: typeof search["id"] === "string" ? search["id"] : undefined,
    error: typeof search["error"] === "string" ? search["error"] : undefined,
  }),
  loader: () => getTextPage(),
  head: () => ({
    meta: [{ title: "Make your OVOA account | OVOA" }, { name: "robots", content: "noindex" }],
  }),
});

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

function useJoinId(fromUrl: string | undefined): string | null | undefined {
  const [id, setId] = useState<string | null | undefined>(fromUrl);
  useEffect(() => {
    try {
      if (fromUrl) localStorage.setItem(KEY, fromUrl);
      else setId(localStorage.getItem(KEY));
    } catch {
      if (!fromUrl) setId(null);
    }
  }, [fromUrl]);
  return id;
}

function JoinView() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const id = useJoinId(search.id);
  const notice = search.error ? (ERRORS[search.error] ?? null) : null;
  return (
    <main className="min-h-dvh bg-landing-canvas text-landing-ink">
      <MembershipHeader />
      <div className="mx-auto max-w-[480px] px-5 pb-24 pt-12 sm:pt-16">
        {notice && <Notice>{notice}</Notice>}
        {id === null ? (
          <NoLink />
        ) : data.state === "down" ? (
          <Notice>We can&rsquo;t reach OVOA right now. Try again in a minute.</Notice>
        ) : data.state === "out" ? (
          <SignIn apple={data.apple} google={data.google} />
        ) : id ? (
          <Linking id={id} />
        ) : (
          <Loader2 className="mx-auto mt-16 size-6 animate-spin" aria-hidden="true" />
        )}
      </div>
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

function NoLink() {
  return (
    <>
      <h1 className="mt-8 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.05]">
        Open the link OVOA texted you.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-landing-muted">
        This page links your number to your new account, so it needs the link from your texts with
        OVOA. Already have an account?
      </p>
      <Link to="/text/link" className={`${secondaryButton} mt-8 w-full`}>
        Link my number
      </Link>
    </>
  );
}

function SignIn({ apple, google }: { apple: boolean; google: boolean }) {
  const button = (on: boolean, href: string, dark: boolean, children: ReactNode) => {
    const style = dark
      ? "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-6 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-black"
      : `${secondaryButton} w-full`;
    return on ? (
      <a href={href} className={style}>
        {children}
      </a>
    ) : (
      <button type="button" disabled title="Coming soon" className={`${style} opacity-50`}>
        {children}
      </button>
    );
  };
  return (
    <>
      <h1 className="mt-8 text-[clamp(2.1rem,7vw,3rem)] font-semibold leading-[1.04]">
        Make your free OVOA account.
      </h1>
      <p className="mt-4 text-[16px] leading-relaxed text-landing-muted">
        One tap. Your number links itself, everything you&rsquo;ve texted OVOA comes along, and you
        get 5 more free texts.
      </p>
      <div className="mt-8 grid gap-3">
        {button(
          apple,
          "/api/public/account/apple?next=/join",
          true,
          <>
            <AppleMark />
            Continue with Apple
          </>,
        )}
        {button(
          google,
          "/api/public/account/google?next=/join",
          false,
          <>
            <GoogleMark />
            Continue with Google
          </>,
        )}
      </div>
      <p className="mt-5 text-center text-xs leading-relaxed text-landing-muted">
        By continuing you agree to the{" "}
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

function Linking({ id }: { id: string }) {
  const join = useServerFn(joinText);
  const device = useDevice();
  const [result, setResult] = useState<Joined | null>(null);

  useEffect(() => {
    let stop = false;
    join({ data: { id } })
      .catch((): Joined => ({ ok: false, error: "That didn't work. Try again." }))
      .then((r) => {
        if (stop) return;
        if (r.ok) {
          try {
            localStorage.removeItem(KEY);
          } catch {
            // Nothing to clean up.
          }
        }
        setResult(r);
      });
    return () => {
      stop = true;
    };
  }, [id, join]);

  const mobile = device === "iphone" || device === "android";
  const href =
    result?.ok && result.number && device ? smsHref(result.number, DONE_TEXT, device) : null;

  // Done on a phone: straight back to Messages with the text ready.
  useEffect(() => {
    if (href && mobile) window.location.href = href;
  }, [href, mobile]);

  if (!result)
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-sm text-landing-muted">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        Linking your number&hellip;
      </div>
    );

  if (!result.ok)
    return (
      <>
        <Notice>{result.error}</Notice>
        <Link to="/account" className={`${secondaryButton} mt-6 w-full`}>
          Your account
        </Link>
      </>
    );

  return (
    <>
      <div className="mt-8 grid size-14 place-items-center rounded-full bg-landing-action text-landing-action-foreground">
        <Check className="size-7" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.05]">
        You&rsquo;re all set.
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-landing-muted">
        <strong className="text-landing-ink">{pretty(result.phone)}</strong> is linked to your
        account. Text OVOA to keep going.
      </p>
      {result.number &&
        (mobile && href ? (
          <a href={href} className={`${primaryButton} mt-8 w-full bg-[#0a84ff] text-white`}>
            <MessageCircle className="size-5" aria-hidden="true" />
            Text OVOA
          </a>
        ) : (
          <div className="mt-8 flex flex-col items-center">
            <Qr text={smsQr(result.number, DONE_TEXT)} />
            <p className="mt-4 text-center text-xs text-landing-muted">
              Scan with your iPhone, or text {pretty(result.number)}.
            </p>
          </div>
        ))}
    </>
  );
}
