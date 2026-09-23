import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, Loader2, LockKeyhole } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import bandFront from "@/assets/product/band-front-cutout.png";
import bandSensors from "@/assets/product/band-sensors-cutout.png";
import bandFabric from "@/assets/product/band-fabric-original.png.asset.json";
import bandProfile from "@/assets/product/band-profile-cutout.png";
import bandCloseup from "@/assets/product/band-closeup-sensors.png.asset.json";
import { getPlans } from "@/lib/membership/membership.functions";
import { bandPrice, bandProductJsonLd, perLabel, planOf } from "@/lib/membership/copy";
import type { PlansResult } from "@/lib/membership/plans";

const productPhotos = [
  { src: bandFront, alt: "Band front and side view" },
  { src: bandSensors, alt: "Band rear sensor view" },
  { src: bandCloseup.url, alt: "Close-up of the Band's sensors and woven material", fit: "cover" },
  { src: bandFabric.url, alt: "Close view of the woven Band material", fit: "cover" },
  { src: bandProfile, alt: "Band profile view" },
];

const OG_IMAGE = "https://ovoa.ai/og-band.jpg";
const PAGE_TITLE = "Buy the OVOA Band (beta)";

function describe(data: PlansResult | undefined) {
  return `The OVOA Band is ${bandPrice(data)}, one time, and comes with ${data?.bandTrialDays ?? 7} days of OVOA Base, started when you choose, then ${perLabel(planOf(data, "base", "monthly"))}. Beta hardware, shipped to US addresses.`;
}

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  staticData: { sitemap: true },
  validateSearch: (
    search: Record<string, unknown>,
  ): { error?: string | undefined; canceled?: boolean | undefined } => ({
    error: typeof search["error"] === "string" ? search["error"] : undefined,
    canceled: search["canceled"] ? true : undefined,
  }),
  loader: () => getPlans(),
  head: ({ loaderData }) => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: describe(loaderData) },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: describe(loaderData) },
      { property: "og:type", content: "product" },
      { property: "og:url", content: "https://ovoa.ai/checkout" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/checkout" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(bandProductJsonLd(loaderData, describe(loaderData))),
      },
    ],
  }),
});

function Choice({
  selected,
  onSelect,
  title,
  price,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  price: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-lg p-4 text-left transition-colors ${
        selected
          ? "border-2 border-landing-action bg-landing-action-foreground"
          : "border border-landing-line hover:border-landing-muted"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          selected ? "border-landing-action bg-landing-action" : "border-landing-line"
        }`}
      >
        {selected && <Check className="size-3 text-landing-action-foreground" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold">{title}</span>
          <span className="shrink-0 text-xs font-semibold">{price}</span>
        </span>
        <span className="mt-1 block text-xs leading-5 text-landing-muted">{children}</span>
      </span>
    </button>
  );
}

// Stripe's embedded Checkout, mounted in #checkout. The session is made for
// the choice on screen; to change it, the buyer goes back and picks again.
function EmbeddedBandCheckout({
  withAi,
  days,
  onCancel,
}: {
  withAi: boolean;
  days: number;
  onCancel: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let checkout: StripeEmbeddedCheckout | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/billing/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ai: withAi }),
        });
        const json = (await res.json()) as { clientSecret?: string; publishableKey?: string };
        if (!res.ok || !json.clientSecret || !json.publishableKey) throw new Error("session");
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(json.publishableKey);
        if (!stripe || cancelled) return;
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
  }, [withAi]);

  return (
    <div>
      <p className="mb-3 text-sm font-semibold">
        {withAi ? `OVOA Band + ${days} days of OVOA Base` : "OVOA Band"}
      </p>
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
      <button
        type="button"
        onClick={onCancel}
        className="mt-3 w-full text-center text-[11px] text-landing-muted hover:text-landing-ink"
      >
        Change my choice
      </button>
    </div>
  );
}

function Checkout() {
  const data = Route.useLoaderData();
  const { error, canceled } = Route.useSearch();
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [withAi, setWithAi] = useState(true);
  const [paying, setPaying] = useState(false);

  const activePhoto = productPhotos[selectedPhoto];
  const showPhoto = (step: number) =>
    setSelectedPhoto((i) => (i + step + productPhotos.length) % productPhotos.length);
  const band = bandPrice(data);
  const base = perLabel(planOf(data, "base", "monthly"));
  const days = data.bandTrialDays;
  const enabled = data.configured && Boolean(data.band);

  const banner =
    error === "not-configured" || (!data.configured && error)
      ? "Band orders aren't open yet. Check back very soon."
      : error === "checkout"
        ? "Checkout didn't open. Please try again, or email support@ovoa.ai."
        : canceled
          ? "No problem, nothing was charged."
          : null;

  if (!activePhoto) return null;

  return (
    <main className="min-h-dvh bg-landing-action-foreground text-landing-ink">
      <header className="sticky top-0 z-20 border-b border-landing-line bg-landing-action-foreground/95 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link
            to="/"
            className="text-sm font-semibold tracking-[0.08em] text-landing-ink transition-opacity hover:opacity-65"
          >
            OVOA
          </Link>
          <p className="text-xs font-semibold text-landing-ink sm:text-sm">OVOA Band · {band}</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-10 lg:px-12 xl:grid-cols-[minmax(0,1fr)_430px] xl:gap-16">
        <section className="px-4 pb-8 pt-4 sm:px-8 sm:pt-8 lg:sticky lg:top-12 lg:flex lg:h-[calc(100dvh-3rem)] lg:flex-col lg:px-0 lg:pb-10">
          <div className="relative min-h-[390px] flex-1 overflow-hidden rounded-lg bg-landing-control sm:min-h-[560px] lg:min-h-0">
            {/* Every photo stays mounted and stacked so switching crossfades. */}
            {productPhotos.map((photo, index) => (
              <img
                key={photo.src}
                src={photo.src}
                alt={photo.alt}
                aria-hidden={index !== selectedPhoto}
                className={`absolute inset-0 h-full w-full transition-opacity duration-500 ease-out motion-reduce:transition-none ${
                  index === selectedPhoto ? "opacity-100" : "opacity-0"
                } ${photo.fit === "cover" ? "object-cover" : "object-contain p-8 sm:p-14 lg:p-20"}`}
              />
            ))}
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => showPhoto(-1)}
              className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-landing-action-foreground/30 text-landing-ink/40 transition-colors hover:bg-landing-action-foreground/70 hover:text-landing-ink/80 focus-visible:text-landing-ink/80 sm:left-4"
            >
              <ChevronLeft className="size-6" strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => showPhoto(1)}
              className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-landing-action-foreground/30 text-landing-ink/40 transition-colors hover:bg-landing-action-foreground/70 hover:text-landing-ink/80 focus-visible:text-landing-ink/80 sm:right-4"
            >
              <ChevronRight className="size-6" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          <div
            className="mt-4 flex shrink-0 justify-center gap-2"
            role="group"
            aria-label="Choose product photo"
          >
            {productPhotos.map((photo, index) => (
              <Button
                key={photo.src}
                type="button"
                variant="ghost"
                size="icon"
                className={`h-12 w-12 rounded-full border bg-landing-action-foreground p-1.5 shadow-none transition-colors ${
                  selectedPhoto === index
                    ? "border-landing-action ring-1 ring-landing-action"
                    : "border-landing-line hover:border-landing-muted hover:bg-landing-control"
                }`}
                aria-label={`View product photo ${index + 1}`}
                aria-pressed={selectedPhoto === index}
                onClick={() => setSelectedPhoto(index)}
              >
                <img src={photo.src} alt="" className="h-full w-full rounded-full object-cover" />
              </Button>
            ))}
          </div>
        </section>

        <section className="px-5 pb-12 pt-8 sm:px-8 lg:px-0 lg:pb-16 lg:pt-12">
          <div className="mx-auto max-w-[430px]">
            {!paying && (
              <>
                <div className="mb-8">
                  <p className="mb-3">
                    <span className="inline-flex items-center rounded-full border border-landing-action/40 bg-landing-action/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-landing-action">
                      Beta
                    </span>
                  </p>
                  <h1 className="text-[30px] font-semibold leading-[1.08] text-landing-ink sm:text-[36px]">
                    OVOA Band.
                    <span className="block text-landing-muted">Press it and talk.</span>
                  </h1>
                  <p className="mt-5 text-2xl font-semibold text-landing-ink">{band}</p>
                  <p className="mt-1 text-sm text-landing-muted">One Band, paid once.</p>
                </div>

                {banner && (
                  <p
                    role="status"
                    className="mb-6 rounded-lg bg-landing-control px-4 py-3 text-sm font-medium"
                  >
                    {banner}
                  </p>
                )}

                <div
                  role="radiogroup"
                  aria-label="Choose what comes with it"
                  className="mb-8 space-y-3"
                >
                  <Choice
                    selected={withAi}
                    onSelect={() => !paying && setWithAi(true)}
                    title={`Band + ${days} days of OVOA Base`}
                    price={band}
                  >
                    Includes {days} days of OVOA Base, started when you choose, then {base}; cancel
                    anytime. Base is the OVOA assistant: press the Band, ask, and hear the answer.
                  </Choice>
                  <Choice
                    selected={!withAi}
                    onSelect={() => !paying && setWithAi(false)}
                    title="Band only"
                    price={band}
                  >
                    No subscription. The free app covers health tracking and notes, and you can add
                    the assistant any time.
                  </Choice>
                </div>

                <div className="mb-8 rounded-lg bg-landing-control p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-landing-muted">OVOA Band</span>
                    <span className="font-semibold">{band}</span>
                  </div>
                  {withAi && (
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-landing-muted">OVOA Base, {days} days</span>
                      <span className="font-semibold">Free</span>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-landing-line pt-3 text-sm font-semibold">
                    <span>Due today</span>
                    <span>{band}</span>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-landing-muted">
                    {withAi
                      ? `Your ${days} free days of OVOA Base start when you choose, not today: we email you a link to start them, so they don't run out while your Band is on its way. Your card is saved for Base, then ${base} once they end, until you cancel. Cancel before then and you pay nothing more. The Band is a one-time charge. Prices in US dollars.`
                      : "A one-time charge, no subscription. Prices in US dollars."}
                  </p>
                </div>
              </>
            )}

            {paying ? (
              <EmbeddedBandCheckout withAi={withAi} days={days} onCancel={() => setPaying(false)} />
            ) : (
              <div>
                <Button
                  type="button"
                  disabled={!enabled}
                  onClick={() => {
                    setPaying(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="h-12 w-full rounded-lg bg-landing-action text-sm font-semibold text-landing-action-foreground shadow-none hover:bg-landing-action/90"
                >
                  {enabled ? "Buy now" : "Opening soon"}
                </Button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] leading-5 text-landing-muted">
                  <LockKeyhole className="size-3" aria-hidden="true" />
                  Pay right here, secured by Stripe. Card or Apple Pay.
                </p>
              </div>
            )}

            <div className="mt-8 rounded-lg border border-landing-line p-4 text-[12px] leading-5 text-landing-muted">
              <p className="font-semibold text-landing-ink">About shipping</p>
              <p className="mt-1">
                The Band is beta hardware, made in small batches. We ship to US addresses and email
                you when yours is on its way. We can&rsquo;t promise a delivery date yet.
              </p>
            </div>

            <nav
              aria-label="Checkout links"
              className="mt-12 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-landing-line pt-6"
            >
              <Link to="/" className="text-[11px] text-landing-muted hover:text-landing-ink">
                Home
              </Link>
              <Link
                to="/early-access"
                className="text-[11px] text-landing-muted hover:text-landing-ink"
              >
                Plans
              </Link>
              <Link to="/faq" className="text-[11px] text-landing-muted hover:text-landing-ink">
                FAQ
              </Link>
              <Link to="/terms" className="text-[11px] text-landing-muted hover:text-landing-ink">
                Terms
              </Link>
              <Link to="/privacy" className="text-[11px] text-landing-muted hover:text-landing-ink">
                Privacy
              </Link>
            </nav>
          </div>
        </section>
      </div>
    </main>
  );
}
