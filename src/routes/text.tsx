import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Qr, pretty, smsHref, smsQr, useDevice } from "@/components/texting";
import { getPublicTextNumber } from "@/lib/account/texting.functions";
import { breadcrumbs, faqJsonLd, jsonLd, pageHead, type Faq } from "@/lib/seo";

// Text OVOA: the front door. No sign-in, no number to type: a phone opens
// Messages with a ready-made hello to OVOA, a computer shows a QR code for it.
// The first texts are free with no account; OVOA itself asks for an email and
// then a plan as the thread goes on. Linking a number to an existing account
// lives on /text/link. What texting OVOA can do, at length, is /imessage.

const HELLO = "Hi OVOA!";

const FAQS: Faq[] = [
  {
    q: "What can I text OVOA?",
    a: "Anything you'd ask a good assistant: reminders, plans, notes, your calendar and email once you connect Google, a website for your business, a game for two. It texts you first too, with your brief and reminders.",
  },
  {
    q: "Does it work on Android?",
    a: "Not yet. OVOA only answers iMessage, because an SMS sender can be faked.",
  },
  {
    q: "Do I need the app?",
    a: "No. The app adds talking out loud, the OVOA Band, and things that run on your iPhone, like texting someone for you.",
  },
];

export const Route = createFileRoute("/text")({
  component: TextPageView,
  staticData: { sitemap: true },
  loader: () => getPublicTextNumber(),
  head: () => ({
    ...pageHead({
      title: "Text OVOA: your AI assistant in iMessage, no app needed",
      description:
        "Just text OVOA. No app, no sign-up: your first 5 texts are free. Open Messages from your iPhone, or scan the QR code on a computer.",
      path: "/text",
    }),
    scripts: [jsonLd(faqJsonLd(FAQS)), jsonLd(breadcrumbs("Text OVOA", "/text"))],
  }),
});

function TextPageView() {
  const { number } = Route.useLoaderData();
  const device = useDevice();
  const opened = useRef(false);
  const phone = device === "iphone" || device === "android";

  // On a phone, go straight to Messages once. A browser may block it; the
  // button below does the same thing.
  useEffect(() => {
    if (!number || !phone || !device || opened.current) return;
    opened.current = true;
    window.location.href = smsHref(number, HELLO, device);
  }, [number, phone, device]);

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
        <h1 className="text-[clamp(2.1rem,7vw,3rem)] font-semibold leading-[1.04]">
          Just text OVOA.
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-landing-muted">
          No app and no sign-up. Say hi and ask for anything: OVOA plans, schedules, remembers and
          follows through, right in Messages.
        </p>

        {!number ? (
          <p
            role="status"
            className="mt-8 rounded-2xl bg-landing-control px-5 py-4 text-sm font-medium"
          >
            Texting opens soon. Check back in a little while.
          </p>
        ) : phone && device ? (
          <>
            <a
              href={smsHref(number, HELLO, device)}
              className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0a84ff] px-6 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              <MessageCircle className="size-5" aria-hidden="true" />
              Open Messages
            </a>
            <p className="mt-3 text-center text-xs text-landing-muted">
              Messages didn&rsquo;t open? Tap the button, or text {pretty(number)}.
            </p>
          </>
        ) : device === "desktop" ? (
          <div className="mt-8 flex flex-col items-center">
            <Qr text={smsQr(number, HELLO)} />
            <p className="mt-4 text-center text-sm text-landing-muted">
              Scan with your phone&rsquo;s camera, or text{" "}
              <strong className="font-semibold text-landing-ink">{pretty(number)}</strong>.
            </p>
          </div>
        ) : null}

        <ol className="mt-10 grid gap-3 text-sm leading-relaxed">
          <li className="rounded-2xl border border-landing-line p-4">
            <span className="font-semibold">Your first 5 texts are free.</span>{" "}
            <span className="text-landing-muted">No account needed.</span>
          </li>
          <li className="rounded-2xl border border-landing-line p-4">
            <span className="font-semibold">Then OVOA asks for your email</span>{" "}
            <span className="text-landing-muted">and you get 5 more.</span>
          </li>
          <li className="rounded-2xl border border-landing-line p-4">
            <span className="font-semibold">OVOA Base keeps it going.</span>{" "}
            <Link to="/early-access" className="text-landing-muted underline underline-offset-2">
              See plans
            </Link>
          </li>
        </ol>

        <p className="mt-8 text-center text-xs text-landing-muted">
          Already have an account?{" "}
          <Link to="/text/link" className="underline underline-offset-2">
            Link your number
          </Link>
        </p>

        <section className="mt-14">
          <h2 className="text-lg font-semibold">Questions</h2>
          <div className="mt-3 divide-y divide-landing-line border-y border-landing-line">
            {FAQS.map((item) => (
              <div key={item.q} className="py-4">
                <h3 className="text-[15px] font-semibold">{item.q}</h3>
                <p className="mt-1 text-sm leading-relaxed text-landing-muted">{item.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-landing-muted">
            <a href="/imessage" className="font-semibold text-landing-ink underline underline-offset-2">
              Everything OVOA does by text
            </a>
            {" · "}
            <a href="/compare/best-ai-assistants-you-can-text" className="underline underline-offset-2">
              How it compares
            </a>
          </p>
        </section>

        <div className="mt-10">
          <SiteFooter />
        </div>
      </div>
    </main>
  );
}
