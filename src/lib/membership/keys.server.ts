export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Admin page and the app's membership check each have their own key, so the
// one baked into the app can't open the admin page.
export function checkKey(
  envName: "OVOA_ADMIN_KEY" | "MEMBERSHIP_API_KEY",
  given: unknown,
): boolean {
  const expected = process.env[envName];
  if (!expected || expected.length < 16 || typeof given !== "string") return false;
  return safeEqual(given.trim(), expected);
}

export function bearer(request: Request): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "");
  return match?.[1] ?? null;
}
