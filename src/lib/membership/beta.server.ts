// The public TestFlight link is handed out one email at a time: only on
// /account (so the email is proven) and only to the first BETA_SEATS emails,
// Apple's limit on external testers. Each email that saw the link keeps its
// seat (beta_seats, migrations/0007_beta_seats.sql).

import { isMissingTable, one, run } from "./db.server";
import { testflightPublicUrl } from "./testflight.server";

export const BETA_SEATS = 10_000;

export type BetaLink = { betaUrl: string | null; betaFull: boolean };

export async function betaLinkFor(email: string): Promise<BetaLink> {
  const url = testflightPublicUrl();
  if (!url) return { betaUrl: null, betaFull: false };
  const address = email.trim().toLowerCase();
  try {
    if (await one("SELECT 1 FROM beta_seats WHERE email = ?", address)) {
      return { betaUrl: url, betaFull: false };
    }
    const taken = await one<{ n: number }>("SELECT count(*) AS n FROM beta_seats");
    if ((taken?.n ?? 0) >= BETA_SEATS) return { betaUrl: null, betaFull: true };
    await run("INSERT OR IGNORE INTO beta_seats (email) VALUES (?)", address);
  } catch (error) {
    // No table or no database: Apple's own cap still holds, so let them in.
    if (!isMissingTable(error)) console.error("[beta] seats", error);
  }
  return { betaUrl: url, betaFull: false };
}
