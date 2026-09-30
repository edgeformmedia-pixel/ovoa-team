import { HELLO } from "@/components/texting";

// The A/B test on the front door (/ and /text, components/TextButton.tsx).
// ab.functions.ts gives each new visitor a version; the cookie keeps them on
// it, and the analytics (collect.server.ts) read it off every visit. To run a
// new test, change AB_TEST: everyone is counted and split afresh.

export const AB_TEST = "angle1";
export const AB_COOKIE = "ovoa_ab";
export const AB_DAYS = 180;

export type Variant = "a" | "b";

export const isVariant = (v: unknown): v is Variant => v === "a" || v === "b";

/** What each version is, for admin.ovoa.ai's A/B test tab. */
export const AB_NAME: Record<Variant, string> = {
  a: "Just text OVOA. (what OVOA is)",
  b: "Text it once. It doesn’t forget. (it follows through)",
};

// Each version's button opens Messages with its own hello, so the texts that
// arrive can be counted by version. Buttons seen by someone on neither say HELLO.
export const AB_HELLO: Record<Variant, string> = { a: "Hello OVOA!", b: "Hey OVOA!" };

/** The version in a Cookie header (or document.cookie), if it's for this test. */
export function cookieVariant(cookies: string | null | undefined): Variant | null {
  const match = new RegExp(`(?:^|;\\s*)${AB_COOKIE}=${AB_TEST}\\.([ab])(?:;|$)`).exec(cookies ?? "");
  return match ? (match[1] as Variant) : null;
}

/** What a Text OVOA button puts in Messages for this browser. */
export const helloFor = (variant: Variant | null) => (variant ? AB_HELLO[variant] : HELLO);
