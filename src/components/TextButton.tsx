import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
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
      <div className="flex w-full max-w-[360px] flex-col items-center text-center">
        <p className="text-sm font-bold tracking-[0.12em]">OVOA</p>
        <h1 className="mt-6 text-[28px] font-semibold leading-tight">Just text it.</h1>

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

        <p className="mt-4 text-xs text-neutral-400">Free to try. iPhone only.</p>
      </div>

      <nav className="absolute bottom-6 flex flex-col items-center gap-3 text-neutral-400">
        <Link to="/landing" className="text-sm underline underline-offset-2">
          More
        </Link>
        <div className="flex gap-4 text-xs">
          <Link to="/account">Account</Link>
          <Link to="/early-access">Plans</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </nav>
    </main>
  );
}
