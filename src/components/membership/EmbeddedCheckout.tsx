import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { StripeEmbeddedCheckout } from "@stripe/stripe-js";

// Stripe's embedded Checkout, mounted in place. `order` is what's posted to
// /api/public/billing/create-checkout-session ({ plan } or { ai }); the session
// is made for it once, so to change it the buyer goes back and picks again.
// When they pay, Stripe sends the page to the session's return_url.
export function EmbeddedCheckout({ order }: { order: Record<string, unknown> }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const body = JSON.stringify(order);

  useEffect(() => {
    let checkout: StripeEmbeddedCheckout | null = null;
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        const res = await fetch("/api/public/billing/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const json = (await res.json()) as { clientSecret?: string; publishableKey?: string };
        if (!res.ok || !json.clientSecret || !json.publishableKey) throw new Error("session");
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(json.publishableKey);
        if (!stripe) throw new Error("stripe.js");
        if (cancelled) return;
        checkout = await stripe.createEmbeddedCheckoutPage({
          fetchClientSecret: async () => json.clientSecret!,
        });
        if (cancelled || !mountRef.current) return checkout.destroy();
        checkout.mount(mountRef.current);
        setState("ready");
      } catch (error) {
        console.error("[checkout]", error);
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
      checkout?.destroy();
    };
  }, [body]);

  return (
    <>
      {state === "loading" && (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-landing-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading secure checkout
        </p>
      )}
      {state === "error" && (
        <p role="status" className="rounded-lg bg-landing-control px-4 py-3 text-sm font-medium">
          Checkout didn&rsquo;t load. Please try again, or email support@ovoa.ai.
        </p>
      )}
      <div id="checkout" ref={mountRef} className="overflow-hidden rounded-lg" />
    </>
  );
}
