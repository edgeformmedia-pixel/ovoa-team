import { createServerFn } from "@tanstack/react-start";
import type { Membership } from "@/lib/membership/resolve";

// Server-only modules are imported inside the handler: this file also ships
// to the browser, where the handler is swapped for an RPC call.

export type AccountPage =
  | {
      state: "in";
      name: string;
      email: string;
      // What this account's email unlocks in the app; null if the members
      // table couldn't be read.
      membership: Membership | null;
      // A Stripe plan paid with this same email: "Manage billing" opens it.
      billing: boolean;
      betaUrl: string | null;
    }
  // Signed out, or signed in but the app's server didn't answer ("down").
  // `apiUrl` is where the browser sends the code steps; `google` says whether
  // "Continue with Google" is set up.
  | { state: "out" | "down"; apiUrl: string; google: boolean };

export const getAccount = createServerFn({ method: "GET" }).handler(
  async (): Promise<AccountPage> => {
    const { getRequest, setResponseHeader } = await import("@tanstack/react-start/server");
    const {
      SESSION_COOKIE,
      accountApiUrl,
      clearCookie,
      googleConfigured,
      lookupAccount,
      sessionToken,
    } = await import("./account.server");

    const request = getRequest();
    const signIn = { apiUrl: accountApiUrl(), google: googleConfigured() };
    const token = sessionToken(request);
    if (!token) return { state: "out", ...signIn };

    const found = await lookupAccount(token);
    if (found.state === "out") {
      // Signed out elsewhere (the app's "sign out everywhere", a password
      // change) or 30 days old: drop the dead cookie.
      setResponseHeader("set-cookie", clearCookie(request, SESSION_COOKIE));
      return { state: "out", ...signIn };
    }
    if (found.state === "down") return { state: "down", ...signIn };

    const { store } = await import("@/lib/membership/store.server");
    const { resolveMembership } = await import("@/lib/membership/resolve");
    const { testflightPublicUrl } = await import("@/lib/membership/testflight.server");
    const email = found.user.email.toLowerCase();
    let membership: Membership | null = null;
    let billing = false;
    try {
      const [forApp, paid] = await Promise.all([
        store().membersForApp(email),
        store().membersByEmail(email),
      ]);
      membership = resolveMembership(forApp);
      billing = paid.some((m) => m.stripe_customer_id);
    } catch (error) {
      console.error("[account] membership", error);
    }
    return {
      state: "in",
      name: found.user.name,
      email: found.user.email,
      membership,
      billing,
      betaUrl: testflightPublicUrl(),
    };
  },
);
