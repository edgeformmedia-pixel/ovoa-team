import qrcode from "qrcode-generator";
import { useEffect, useMemo, useState } from "react";

// Shared by /text (just text OVOA) and /text/link (link a number to an account).

export const primaryButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-landing-action px-6 text-[15px] font-semibold text-landing-action-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60";
export const secondaryButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-landing-line px-6 text-[15px] font-semibold text-landing-ink transition-colors hover:border-landing-muted disabled:pointer-events-none disabled:opacity-50";

export const pretty = (e164: string) =>
  /^\+1\d{10}$/.test(e164) ? `(${e164.slice(2, 5)}) ${e164.slice(5, 8)}-${e164.slice(8)}` : e164;

/** The text the Text OVOA buttons put in Messages, ready to send. */
export const HELLO = "Hi OVOA!";

/**
 * The hello with the partner's ?ref= code on the end ("Hi OVOA! #maya"), so the
 * first text carries it into the trial (api texting.ts reads and strips it).
 * Browser only: the code is in the ovoa_ref cookie (membership/referral.ts).
 */
export function withRef(body: string): string {
  if (typeof document === "undefined") return body;
  const m = /(?:^|;\s*)ovoa_ref=([a-z0-9-]{3,24})(?:;|$)/.exec(document.cookie);
  return m ? `${body} #${m[1]}` : body;
}

export type Device ="iphone" | "android" | "desktop";

export function useDevice(): Device | null {
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
export const smsHref = (number: string, body: string, device: Device) =>
  `sms:${number}${device === "android" ? "?" : "&"}body=${encodeURIComponent(body)}`;
export const smsQr = (number: string, body: string) => `SMSTO:${number}:${body}`;

export function Qr({
  text,
  label = "QR code that opens Messages with a text to OVOA",
}: {
  text: string;
  label?: string;
}) {
  const svg = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }, [text]);
  return (
    <div
      role="img"
      aria-label={label}
      className="w-[240px] rounded-3xl bg-white p-3 shadow-sm ring-1 ring-landing-line [&_svg]:h-auto [&_svg]:w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
