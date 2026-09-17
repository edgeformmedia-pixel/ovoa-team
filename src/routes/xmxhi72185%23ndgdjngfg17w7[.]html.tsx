import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import bandFront from "@/assets/product/band-front-cutout.png";

import { ORDER_RECEIPT_KEY, type OrderReceipt } from "@/lib/order-receipt";

const money = (value: number) => `$${value.toFixed(2)}`;

export const Route = createFileRoute("/xmxhi72185%23ndgdjngfg17w7.html")({
  component: TransactionSubmitted,
  ssr: false,
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Transaction submitted — Ovoa AI" },
      { name: "description", content: "Your Band order confirmation." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Transaction submitted — Ovoa AI" },
      { property: "og:description", content: "Your Band order confirmation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function TransactionSubmitted() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "denied" | OrderReceipt>("checking");

  useEffect(() => {
    let receipt: OrderReceipt | null = null;
    try {
      const raw = sessionStorage.getItem(ORDER_RECEIPT_KEY);
      if (raw) receipt = JSON.parse(raw) as OrderReceipt;
    } catch {
      receipt = null;
    }
    if (receipt && typeof receipt.total === "number") setState(receipt);
    else setState("denied");
  }, []);

  if (state === "checking") {
    return <main className="min-h-dvh bg-landing-action-foreground" aria-busy="true" />;
  }

  if (state === "denied") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-landing-action-foreground px-5 text-center text-landing-ink">
        <div className="max-w-[380px]">
          <h1 className="text-2xl font-semibold">Nothing to show here</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-landing-muted">
            This page is only available right after you place an order.
          </p>
          <button
            onClick={() => navigate({ to: "/checkout" })}
            className="mt-8 h-12 w-full rounded-lg bg-landing-action text-sm font-semibold text-landing-action-foreground transition-colors hover:bg-landing-action/90"
          >
            Go to checkout
          </button>
        </div>
      </main>
    );
  }

  const order = state;

  return (
    <main className="min-h-dvh bg-landing-action-foreground text-landing-ink">
      <header className="border-b border-landing-line">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link to="/" className="text-sm font-semibold transition-opacity hover:opacity-65">
            Band
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[560px] flex-col items-center px-5 pb-24 pt-16 text-center sm:pt-24">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full bg-landing-action/10"
        >
          <Check className="size-8 text-landing-action" strokeWidth={2.5} />
        </span>
        <h1 className="mt-8 text-[34px] font-semibold leading-[1.08] sm:text-[44px]">
          Transaction submitted.
          <span className="block text-landing-muted">Welcome to Band.</span>
        </h1>
        <p className="mt-5 text-sm font-medium leading-6 text-landing-muted">
          A confirmation is on its way to your inbox. Your Band ships soon, and your Ovoa app
          {order.subscriptionOn
            ? ` ${order.planName.toLowerCase()} subscription starts today.`
            : " subscription can be added anytime."}
        </p>

        <div className="mt-10 w-full rounded-xl bg-landing-control p-5 text-left">
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-landing-action-foreground">
              <img src={bandFront} alt="" className="h-full w-full object-contain p-2" />
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-semibold">Band</p>
              <p className="text-xs text-landing-muted">One size · White</p>
            </div>
            <p className="ml-auto shrink-0 text-sm font-semibold">{money(order.bandPrice)}</p>
          </div>
          {order.subscriptionOn && (
            <div className="mt-4 flex items-center justify-between border-t border-landing-line pt-4 text-sm">
              <span className="text-landing-muted">
                {order.planName}, {order.annual ? "first year" : "first month"}
              </span>
              <span className="font-semibold">{money(order.planPrice)}</span>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-landing-line pt-4 text-sm font-semibold">
            <span>Total paid</span>
            <span>{money(order.total)}</span>
          </div>
          {order.subscriptionOn && (
            <p className="mt-3 text-[11px] leading-5 text-landing-muted">
              Then {money(order.planPrice)} per {order.annual ? "year" : "month"} for {order.planName},
              automatically, until you cancel in settings.
            </p>
          )}
        </div>

        <p className="mt-6 text-[11px] leading-5 text-landing-muted">
          This is a visual demo — no payment was taken and nothing will ship.
        </p>

        <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row">
          <Link
            to="/app"
            className="flex h-12 flex-1 items-center justify-center rounded-lg bg-landing-action text-sm font-semibold text-landing-action-foreground transition-colors hover:bg-landing-action/90"
          >
            Open the Ovoa app
          </Link>
          <Link
            to="/"
            className="flex h-12 flex-1 items-center justify-center rounded-lg border border-landing-line text-sm font-semibold transition-colors hover:border-landing-muted"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
