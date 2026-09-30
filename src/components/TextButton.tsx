import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { Qr, pretty, smsHref, smsQr, useDevice } from "@/components/texting";

// The whole front door: one line and one blue button that opens Messages with
// a hello to OVOA (a QR code for it on a computer). Nothing else to read.

export const HELLO = "Hi OVOA!";

export function TextButtonPage({
  number,
  autoOpen = false,
}: {
  number: string | null;
  autoOpen?: boolean;
}) {
  const device = useDevice();
  const phone = device === "iphone" || device === "android";
  const opened = useRef(false);

  // On /text, a phone goes straight to Messages once. A browser may block
  // that; the button does the same thing.
  useEffect(() => {
    if (!autoOpen || !number || !phone || !device || opened.current) return;
    opened.current = true;
    window.location.href = smsHref(number, HELLO, device);
  }, [autoOpen, number, phone, device]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white px-5 text-[#060606]">
      <div className="absolute inset-x-0 top-0">
        <MembershipHeader hideText />
      </div>
      <div className="flex w-full max-w-[360px] flex-col items-center text-center">
        <h1 className="text-[34px] font-semibold leading-tight">Just text OVOA.</h1>
        <p className="mt-3 text-base text-neutral-500">
          The AI assistant in iMessage. It plans, remembers and follows through. No app needed.
        </p>

        {!number ? (
          <p role="status" className="mt-10 text-sm text-neutral-500">
            Opening soon.
          </p>
        ) : phone && device ? (
          <a
            href={smsHref(number, HELLO, device)}
            className="mt-10 flex h-14 w-full items-center justify-center rounded-full bg-[#0a84ff] text-[17px] font-semibold text-white"
          >
            Text OVOA
          </a>
        ) : device === "desktop" ? (
          <div className="mt-10 flex flex-col items-center">
            <Qr text={smsQr(number, HELLO)} />
            <p className="mt-4 text-sm text-neutral-500">
              Scan with your iPhone, or text {pretty(number)}.
            </p>
          </div>
        ) : (
          <div className="mt-10 h-14" />
        )}

        <Link
          to="/landing"
          className="mt-5 text-lg font-medium text-[#060606] underline underline-offset-4"
        >
          More
        </Link>

        <p className="mt-4 text-xs text-neutral-400">Free to try. iPhone only.</p>
      </div>

      <nav className="absolute bottom-6 flex flex-col items-center gap-3 text-neutral-400">
        <div className="flex gap-4 text-xs">
          <Link to="/early-access">Plans</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </nav>
    </main>
  );
}
