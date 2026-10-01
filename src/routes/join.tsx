import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, MessageCircle } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { PickPlan } from "@/components/membership/PickPlan";
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
import { getTextPage, joinText, type Joined, type TextPage } from "@/lib/account/texting.functions";
import { perLabel, planOf } from "@/lib/membership/copy";
import { getPlans } from "@/lib/membership/membership.functions";
import type { PlansResult } from "@/lib/membership/plans";

// /join?id=…: the link OVOA texts a trial number once its free texts run out
// (jarvis-api guest.ts joinLink), and under a reminder that goes off after
// that. Sign in with Apple or Google, which makes the account, and the number
// that got the link is linked to it: no code to text back, and what the trial
// made comes along. Then Base's checkout, right here (from: "join"), and
// Stripe comes back to /join?paid=…, which opens Messages with "I'm in!".
// Already on a plan: straight back to Messages.
//
// Sign-in leaves the site and comes back to plain /join (sign-in's next page
// can't carry a query), so the id waits in localStorage meanwhile.

const KEY = "ovoa_join_id";
const DONE_TEXT = "I created my account!";
const PAID_TEXT = "I'm in!";

export const Route = createFileRoute("/join")({
  component: JoinView,
  staticData: { sitemap: false },
  validateSearch: (
    search: Record<string, unknown>,
  ): { id?: string | undefined; error?: string | undefined; paid?: string | undefined } => ({
    id: typeof search["id"] === "string" ? search["id"] : undefined,
    error: typeof search["error"] === "string" ? search["error"] : undefined,
    // Stripe's checkout session id, back from paying here.
    paid: typeof search["paid"] === "string" ? search["paid"] : undefined,
  }),
  loader: async () => {
    const [page, plans] = await Promise.all([getTextPage(), getPlans()]);
    return { page, plans };
  },
  head: () => ({
    meta: [{ title: "Keep OVOA | OVOA" }, { name: "robots", content: "noindex" }],
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
  const { page: data, plans } = Route.useLoaderData();
  const search = Route.useSearch();
  const id = useJoinId(search.id);
  const notice = search.error ? (ERRORS[search.error] ?? null) : null;
  return (
    <main className="min-h-dvh bg-landing-canvas text-landing-ink">
      <MembershipHeader />
      <div className="mx-auto max-w-[480px] px-5 pb-24 pt-12 sm:pt-16">
        {notice && <Notice>{notice}</Notice>}
        {search.paid && data.state === "in" ? (
          <Paid data={data} />
        ) : data.state === "down" ? (
          <Notice>We can&rsquo;t reach OVOA right now. Try again in a minute.</Notice>
        ) : data.state === "out" ? (
          id === null ? (
            <NoLink />
          ) : (
            <SignIn
              apple={data.apple}
              google={data.google}
              price={perLabel(planOf(plans, "base", "monthly"))}
            />
          )
        ) : id ? (
          <Linking id={id} data={data} plans={plans} />
        ) : id === null ? (
          // Signed in with the link already used: its number linked here and no plan yet, pay.
          data.linked && data.paid === false ? (
            <Checkout data={data} plans={plans} phone={data.linked.phone} />
          ) : (
            <NoLink />
          )
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

function SignIn({ apple, google, price }: { apple: boolean; google: boolean; price: string }) {
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
        Keep OVOA.
      </h1>
      <p className="mt-4 text-[16px] leading-relaxed text-landing-muted">
        Sign in so everything you&rsquo;ve texted OVOA is saved to you, then it&rsquo;s {price} for
        Base. Your number links itself. Cancel anytime.
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

function Linking({
  id,
  data,
  plans,
}: {
  id: string;
  data: Extract<TextPage, { state: "in" }>;
  plans: PlansResult;
}) {
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

  // No plan yet: pay here. On one already (or it couldn't be read): back to Messages.
  const pay = result?.ok === true && data.paid === false;
  const mobile = device === "iphone" || device === "android";
  const href =
    result?.ok && !pay && result.number && device
      ? smsHref(result.number, DONE_TEXT, device)
      : null;

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

  if (pay) return <Checkout data={data} plans={plans} phone={result.phone} />;

  return (
    <Done
      title={<>You&rsquo;re all set.</>}
      body={
        <>
          <strong className="text-landing-ink">{pretty(result.phone)}</strong> is linked to your
          account. Text OVOA to keep going.
        </>
      }
      number={result.number}
      text={DONE_TEXT}
    />
  );
}

/** Base's checkout, right here, with the number already linked. */
function Checkout({
  data,
  plans,
  phone,
}: {
  data: Extract<TextPage, { state: "in" }>;
  plans: PlansResult;
  phone: string;
}) {
  return (
    <PickPlan
      plans={plans}
      name={data.name}
      from="join"
      start="base"
      lead={
        <p className="mt-8 flex items-center gap-2 text-sm font-medium text-landing-muted">
          <Check className="size-4 text-landing-ink" aria-hidden="true" />
          {pretty(phone)} is linked. Everything from today is saved.
        </p>
      }
    />
  );
}

/** Back from Stripe, paid. The plan can take a few seconds to reach OVOA (the webhook). */
function Paid({ data }: { data: Extract<TextPage, { state: "in" }> }) {
  return (
    <Done
      title={<>You&rsquo;re in.</>}
      body={
        data.paid === false
          ? "Thanks! Your plan is switching on now. Head back to Messages and pick up where you left off."
          : "Thanks! OVOA is yours. Head back to Messages and pick up where you left off."
      }
      number={data.number}
      text={PAID_TEXT}
      // Not recorded yet: a tap instead, so their first text finds the plan switched on.
      auto={data.paid !== false}
    />
  );
}

function Done({
  title,
  body,
  number,
  text,
  auto = false,
}: {
  title: ReactNode;
  body: ReactNode;
  number: string | null;
  text: string;
  auto?: boolean;
}) {
  const device = useDevice();
  const mobile = device === "iphone" || device === "android";
  const href = number && device ? smsHref(number, text, device) : null;
  // Paid, on a phone: straight back to Messages with the text ready.
  useEffect(() => {
    if (auto && href && mobile) window.location.href = href;
  }, [auto, href, mobile]);
  return (
    <>
      <div className="mt-8 grid size-14 place-items-center rounded-full bg-landing-action text-landing-action-foreground">
        <Check className="size-7" aria-hidden="true" />
      </div>
      <h1 className="mt-6 text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.05]">{title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-landing-muted">{body}</p>
      {number &&
        (mobile && href ? (
          <a href={href} className={`${primaryButton} mt-8 w-full bg-[#0a84ff] text-white`}>
            <MessageCircle className="size-5" aria-hidden="true" />
            Text OVOA
          </a>
        ) : (
          <div className="mt-8 flex flex-col items-center">
            <Qr text={smsQr(number, text)} />
            <p className="mt-4 text-center text-xs text-landing-muted">
              Scan with your iPhone, or text {pretty(number)}.
            </p>
          </div>
        ))}
    </>
  );
}
