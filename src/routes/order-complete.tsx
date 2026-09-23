import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { Button } from "@/components/ui/button";
import { CHECKOUT_SESSION_PATTERN } from "@/lib/membership/plans";

// Where embedded Checkout on /checkout lands. Asks Stripe (through
// /api/public/billing/session-status) how the session ended, then either
// confirms the order or sends the buyer back to try again.

type Status =
  | { state: "loading" }
  | { state: "complete"; email: string | null; withAi: boolean; sessionId: string }
  | { state: "retry" };

export const Route = createFileRoute("/order-complete")({
  component: OrderComplete,
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { session_id?: string | undefined } => ({
    session_id: typeof search["session_id"] === "string" ? search["session_id"] : undefined,
  }),
  head: () => ({
    meta: [{ title: "Your OVOA order" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

function OrderComplete() {
  const { session_id: sessionId } = Route.useSearch();
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    if (!sessionId || !CHECKOUT_SESSION_PATTERN.test(sessionId)) {
      setStatus({ state: "retry" });
      return;
    }
    let cancelled = false;
    fetch(`/api/public/billing/session-status?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((json: { status?: string; email?: string | null; withAi?: boolean }) => {
        if (cancelled) return;
        setStatus(
          json.status === "complete"
            ? { state: "complete", email: json.email ?? null, withAi: !!json.withAi, sessionId }
            : { state: "retry" },
        );
      })
      .catch(() => !cancelled && setStatus({ state: "retry" }));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <main className="min-h-dvh bg-landing-canvas text-landing-ink">
      <MembershipHeader>
        <a
          href="mailto:support@ovoa.ai"
          className="text-xs text-landing-muted transition-colors hover:text-landing-ink"
        >
          Help
        </a>
      </MembershipHeader>
      <div className="mx-auto max-w-[480px] px-5 py-16 text-center">
        {status.state === "loading" && (
          <p className="flex items-center justify-center gap-2 text-sm text-landing-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Checking your order
          </p>
        )}

        {status.state === "complete" && (
          <>
            <span className="mx-auto mb-6 flex size-12 items-center justify-center rounded-full bg-landing-action">
              <Check className="size-6 text-landing-action-foreground" strokeWidth={3} />
            </span>
            <h1 className="text-[30px] font-semibold leading-tight">Order confirmed</h1>
            <p className="mt-4 text-sm leading-6 text-landing-muted">
              Thanks for ordering the OVOA Band.
              {status.email ? ` A receipt is on its way to ${status.email}.` : ""} We&rsquo;ll email
              you when your Band ships.
              {status.withAi &&
                " Your free days of OVOA Base start when you choose: the next page has the button, and so does your order email."}
            </p>
            <Button
              asChild
              className="mt-8 h-12 w-full rounded-lg bg-landing-action text-sm font-semibold text-landing-action-foreground shadow-none hover:bg-landing-action/90"
            >
              <Link to="/early-access/welcome" search={{ session_id: status.sessionId }}>
                {status.withAi ? "Set up OVOA on your iPhone" : "Get the OVOA app"}
              </Link>
            </Button>
          </>
        )}

        {status.state === "retry" && (
          <>
            <h1 className="text-[30px] font-semibold leading-tight">Payment not finished</h1>
            <p className="mt-4 text-sm leading-6 text-landing-muted">
              We couldn&rsquo;t confirm this order, and nothing was charged unless you get a receipt
              by email. You can try again, or write to support@ovoa.ai.
            </p>
            <Button
              asChild
              className="mt-8 h-12 w-full rounded-lg bg-landing-action text-sm font-semibold text-landing-action-foreground shadow-none hover:bg-landing-action/90"
            >
              <Link to="/checkout">Try again</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
