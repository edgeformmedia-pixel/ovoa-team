import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { Qr, pretty, smsHref, smsQr, useDevice } from "@/components/texting";
import { AB_HELLO, type Variant } from "@/lib/ab";
import { joinWaitlist } from "@/lib/waitlist.functions";

// The whole front door: one line, one example of what a text to OVOA gets
// back, and one blue button that opens Messages with a hello to OVOA (a QR
// code for it on a computer). A phone that isn't an iPhone gets an email box
// instead: OVOA tells them when it works there.
//
// The line and the example come in two versions under an A/B test (lib/ab.ts):
// A is what OVOA is, B is that it follows through. Everything else is the same.

const COPY: Record<Variant, { title: string; line: string }> = {
  a: {
    title: "Just text OVOA.",
    line: "The AI assistant in iMessage. It plans, remembers and follows through. No app needed.",
  },
  b: {
    title: "Text it once. It doesn’t forget.",
    line: "OVOA is the AI assistant in iMessage. Tell it what you need and it texts you back when it matters. No app needed.",
  },
};

export function TextButtonPage({
  number,
  variant,
  autoOpen = false,
}: {
  number: string | null;
  variant: Variant;
  autoOpen?: boolean;
}) {
  const device = useDevice();
  const hello = AB_HELLO[variant];
  const copy = COPY[variant];
  const opened = useRef(false);
  const [notify, setNotify] = useState(false);

  // On /text, an iPhone goes straight to Messages once. A browser may block
  // that; the button does the same thing.
  useEffect(() => {
    if (!autoOpen || !number || device !== "iphone" || opened.current) return;
    opened.current = true;
    window.location.href = smsHref(number, hello, device);
  }, [autoOpen, number, device, hello]);

  return (
    <main className="flex min-h-dvh flex-col items-center bg-gradient-to-b from-white from-60% to-[#e5e5ea] text-[#060606]">
      <div className="w-full">
        <MembershipHeader hideText />
      </div>
      <div className="flex w-full max-w-[360px] flex-1 flex-col items-center justify-center px-5 py-8 text-center">
        <h1 className="text-[34px] font-semibold leading-tight">{copy.title}</h1>
        <p className="mt-3 text-base text-neutral-500">{copy.line}</p>

        {variant === "b" ? <FollowThroughExample /> : <Example />}

        {device === "android" ? (
          <div className="mt-8 w-full">
            <p className="text-sm text-neutral-500">
              OVOA works in iMessage on iPhone today. Leave your email and we&rsquo;ll tell you when
              it works on your phone.
            </p>
            <NotifyForm />
          </div>
        ) : !number ? (
          <p role="status" className="mt-8 text-sm text-neutral-500">
            Opening soon.
          </p>
        ) : device === "iphone" ? (
          <a
            href={smsHref(number, hello, device)}
            data-track="Text OVOA"
            className="mt-8 flex h-[72px] w-full animate-[ovoa-nudge_2.4s_ease-in-out_infinite] items-center justify-center gap-2 rounded-full bg-[#0a84ff] text-[22px] font-bold text-white shadow-[0_10px_30px_rgba(10,132,255,0.45)] ring-4 ring-[#0a84ff]/15 transition active:scale-95"
          >
            Text OVOA <span aria-hidden="true">→</span>
          </a>
        ) : device === "desktop" ? (
          <div className="mt-8 flex flex-col items-center">
            <Qr text={smsQr(number, hello)} />
            <p className="mt-4 text-sm text-neutral-500">
              Scan with your iPhone, or text {pretty(number)}.
            </p>
          </div>
        ) : (
          <div className="mt-8 h-14" />
        )}

        <Link
          to="/landing"
          className="mt-9 text-sm text-neutral-500 underline underline-offset-4"
        >
          More
        </Link>

        {device !== "android" && (
          <>
            <p className="mt-4 text-xs text-neutral-400">
              Free to try. iPhone only.{" "}
              {!notify && (
                <button type="button" onClick={() => setNotify(true)} className="underline">
                  Not on iPhone?
                </button>
              )}
            </p>
            {notify && (
              <div className="w-full">
                <p className="mt-3 text-sm text-neutral-500">
                  Leave your email and we&rsquo;ll tell you when OVOA works on your phone.
                </p>
                <NotifyForm />
              </div>
            )}
          </>
        )}
      </div>

      <nav className="flex flex-col items-center gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-neutral-500">
        <div className="flex gap-4 text-xs">
          <Link to="/early-access">Plans</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </nav>
    </main>
  );
}

// One request and its answer, as Messages shows them.
function Example() {
  return (
    <div
      role="img"
      aria-label="An example: you text “Find a time for coffee with Sam next week and send the invite.” OVOA replies “Sam’s free Tuesday at 10 or Thursday at 2. Which works for you?”"
      className="mt-7 flex w-full flex-col gap-1.5 text-left text-[15px] leading-snug"
    >
      <p className="max-w-[82%] self-end rounded-[20px] rounded-br-md bg-[#d6e8ff] px-3.5 py-2 text-[#1c3d66]">
        Find a time for coffee with Sam next week and send the invite.
      </p>
      <p className="max-w-[82%] self-start rounded-[20px] rounded-bl-md bg-[#e9e9eb] px-3.5 py-2">
        Sam&rsquo;s free Tuesday at 10 or Thursday at 2. Which works for you?
      </p>
    </div>
  );
}

// Version B: a request, its answer, and OVOA texting back on its own days later.
function FollowThroughExample() {
  return (
    <div
      role="img"
      aria-label="An example: you text “Remind me to call the dentist Thursday morning.” OVOA replies “Done. I’ll text you Thursday at 9.” Then on Thursday at 9:00 AM OVOA texts “It’s 9. Time to call the dentist.”"
      className="mt-7 flex w-full flex-col gap-1.5 text-left text-[15px] leading-snug"
    >
      <p className="max-w-[82%] self-end rounded-[20px] rounded-br-md bg-[#d6e8ff] px-3.5 py-2 text-[#1c3d66]">
        Remind me to call the dentist Thursday morning.
      </p>
      <p className="max-w-[82%] self-start rounded-[20px] rounded-bl-md bg-[#e9e9eb] px-3.5 py-2">
        Done. I&rsquo;ll text you Thursday at 9.
      </p>
      <p className="mt-2 self-center text-[11px] font-medium text-neutral-400">Thursday 9:00 AM</p>
      <p className="max-w-[82%] self-start rounded-[20px] rounded-bl-md bg-[#e9e9eb] px-3.5 py-2">
        It&rsquo;s 9. Time to call the dentist.
      </p>
    </div>
  );
}

function NotifyForm() {
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      const res = await joinWaitlist({ data: { email, company: trap } });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className="mt-4 text-sm font-medium">
        Got it. We&rsquo;ll email you when it&rsquo;s ready.
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="mt-4 flex w-full flex-col gap-2">
      <input
        type="email"
        required
        autoComplete="email"
        aria-label="Your email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-12 w-full rounded-full border border-neutral-300 px-5 text-base outline-none focus:border-[#0a84ff]"
      />
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={trap}
        onChange={(e) => setTrap(e.target.value)}
        className="hidden"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="h-12 w-full rounded-full bg-[#060606] text-[15px] font-semibold text-white disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : "Tell me"}
      </button>
      {state === "error" && (
        <p role="alert" className="text-xs text-red-600">
          That didn&rsquo;t go through. Check the email and try again.
        </p>
      )}
    </form>
  );
}
