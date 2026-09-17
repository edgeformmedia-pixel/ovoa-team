import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, LockKeyhole } from "lucide-react";
import { ORDER_RECEIPT_KEY, ORDER_RECEIPT_PATH, type OrderReceipt } from "@/lib/order-receipt";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import bandFront from "@/assets/product/band-front-cutout.png";
import bandSensors from "@/assets/product/band-sensors-cutout.png";
import bandFabric from "@/assets/product/band-fabric-original.png.asset.json";
import bandProfile from "@/assets/product/band-profile-cutout.png";
import bandCloseup from "@/assets/product/band-closeup-sensors.png.asset.json";

const productPhotos = [
  { src: bandFront, alt: "Band front and side view" },
  { src: bandSensors, alt: "Band rear sensor view" },
  { src: bandCloseup.url, alt: "Close-up of the Band's sensors and woven material", fit: "cover" },
  { src: bandFabric.url, alt: "Close view of the woven Band material", fit: "cover" },
  { src: bandProfile, alt: "Band profile view" },
];

const OG_IMAGE = "https://ovoa.ai/og-band.jpg";
const PAGE_TITLE = "Buy Band — Ovoa AI checkout";
const PAGE_DESCRIPTION =
  "Buy Band for $89.99, plus the Ovoa app subscription that powers the AI — from $9.99/month, Pro $19.99/month.";

const BAND_PRICE = 89.99;

const plans = [
  {
    id: "standard",
    name: "Ovoa app",
    price: 9.99,
    yearlyPrice: 99.99,
    detail: "The AI assistant that gets things done for you.",
  },
  {
    id: "pro",
    name: "Ovoa app Pro",
    price: 19.99,
    yearlyPrice: 159.99,
    detail: "Everything in Ovoa app, with higher limits and priority access.",
  },
] as const;

const money = (value: number) => `$${value.toFixed(2)}`;

export const Route = createFileRoute("/checkout")({
  component: Checkout,
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
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
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Band",
          description: PAGE_DESCRIPTION,
          image: OG_IMAGE,
          brand: { "@type": "Brand", name: "Ovoa AI" },
          offers: [
            {
              "@type": "Offer",
              name: "Band",
              price: "89.99",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url: "https://ovoa.ai/checkout",
            },
            {
              "@type": "Offer",
              name: "Ovoa app subscription",
              price: "9.99",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url: "https://ovoa.ai/checkout",
            },
            {
              "@type": "Offer",
              name: "Ovoa app Pro subscription",
              price: "19.99",
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url: "https://ovoa.ai/checkout",
            },
          ],
        }),
      },
    ],
  }),
});

function Field({
  label,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        placeholder={label}
        className="h-12 w-full rounded-lg border border-landing-line bg-landing-action-foreground px-3.5 text-sm font-medium text-landing-ink outline-none transition-colors placeholder:font-medium placeholder:text-landing-muted focus:border-landing-action focus:ring-2 focus:ring-landing-action/15"
        {...props}
      />
    </div>
  );
}

function Checkout() {
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<(typeof plans)[number]["id"]>("standard");
  const [subscriptionOn, setSubscriptionOn] = useState(true);
  const [annual, setAnnual] = useState(false);
  const [payMethod, setPayMethod] = useState<"card" | "applepay" | "klarna">("card");

  const activePhoto = productPhotos[selectedPhoto];
  const activePlan = plans.find((plan) => plan.id === selectedPlan) ?? plans[0];
  const planPrice = annual ? activePlan.yearlyPrice : activePlan.price;
  const period = annual ? "yr" : "mo";
  const dueToday = BAND_PRICE + (subscriptionOn ? planPrice : 0);

  if (!activePhoto) return null;

  return (
    <main className="min-h-dvh bg-landing-action-foreground text-landing-ink">
      <header className="sticky top-0 z-20 border-b border-landing-line bg-landing-action-foreground/95 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link to="/" className="text-sm font-semibold text-landing-ink transition-opacity hover:opacity-65">
            Band
          </Link>
          <p className="text-xs font-semibold text-landing-ink sm:text-sm">
            {money(BAND_PRICE)} + from {money(plans[0].price)}/mo
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-10 lg:px-12 xl:grid-cols-[minmax(0,1fr)_430px] xl:gap-16">
        <section className="px-4 pb-8 pt-4 sm:px-8 sm:pt-8 lg:sticky lg:top-12 lg:flex lg:h-[calc(100dvh-3rem)] lg:flex-col lg:px-0 lg:pb-10">
          <div className="relative flex min-h-[390px] flex-1 items-center justify-center overflow-hidden rounded-lg bg-landing-control sm:min-h-[560px] lg:min-h-0">
            <img
              key={activePhoto.src}
              src={activePhoto.src}
              alt={activePhoto.alt}
              className={`h-full w-full transition-opacity duration-300 ${activePhoto.fit === "cover" ? "object-cover" : "object-contain p-8 sm:p-14 lg:p-20"}`}
            />
          </div>

          <div className="mt-4 flex shrink-0 justify-center gap-2" role="group" aria-label="Choose product photo">
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
            <div className="mb-8">
              <h1 className="text-[30px] font-semibold leading-[1.08] text-landing-ink sm:text-[36px]">
                Buy Band.
                <span className="block text-landing-muted">Made to move with you.</span>
              </h1>
              <p className="mt-5 text-sm font-semibold text-landing-ink">
                {subscriptionOn
                  ? `${money(BAND_PRICE)} + ${money(planPrice)}/${period}`
                  : money(BAND_PRICE)}
              </p>
            </div>

            <div className="mb-8 space-y-3" aria-label="Choose your subscription">
              <button
                type="button"
                role="checkbox"
                aria-checked={subscriptionOn}
                onClick={() => setSubscriptionOn((value) => !value)}
                className="flex w-full items-center justify-between rounded-lg p-4 text-left transition-colors border-2 border-landing-action bg-landing-action-foreground"
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`flex size-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors ${
                      subscriptionOn
                        ? "border-landing-action bg-landing-action"
                        : "border-landing-line bg-landing-action-foreground"
                    }`}
                  >
                    {subscriptionOn && <Check className="size-3.5 text-landing-action-foreground" strokeWidth={3} />}
                  </span>
                  <span className="text-sm font-semibold">Ovoa app subscription</span>
                </span>
                <span className="text-xs font-semibold">
                  {money(planPrice)}/{period}
                </span>
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={annual}
                onClick={() => setAnnual((value) => !value)}
                className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left transition-colors hover:bg-landing-control/60"
              >
                <span className="text-sm font-semibold">
                  Bill yearly
                  <span className="ml-2 text-xs font-medium text-landing-muted">{money(activePlan.yearlyPrice)}/year</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full transition-colors ${
                    annual ? "bg-landing-action" : "bg-landing-line"
                  }`}
                >
                  <span
                    className={`inline-block size-[22px] rounded-full bg-white shadow-sm transition-transform ${
                      annual ? "translate-x-[22px]" : "translate-x-[2px]"
                    }`}
                  />
                </span>
              </button>
              <div className={subscriptionOn ? "space-y-3" : "space-y-3 opacity-40 pointer-events-none"} aria-disabled={!subscriptionOn}>
                {plans.map((plan) => {
                  const active = subscriptionOn && plan.id === activePlan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      aria-pressed={active}
                      tabIndex={subscriptionOn ? 0 : -1}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`flex w-full items-start justify-between rounded-lg p-4 text-left transition-colors ${
                        active
                          ? "border-2 border-landing-action bg-landing-action-foreground"
                          : "border border-landing-line hover:border-landing-muted"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {plan.name}
                          {plan.id === "pro" && (
                            <span className="ml-2 rounded-full bg-landing-control px-2 py-0.5 text-[10px] font-semibold text-landing-ink">
                              Best
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-landing-muted">{plan.detail}</p>
                      </div>
                      <div className="ml-4 flex shrink-0 items-center gap-2">
                        <span className="text-xs font-semibold">
                          {money(annual ? plan.yearlyPrice : plan.price)}/{period}
                        </span>
                        {active && <Check className="size-4 text-landing-action" aria-hidden="true" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] leading-5 text-landing-muted">
                {subscriptionOn
                  ? "The AI features run in the Ovoa app, so Band needs this subscription to do things for you."
                  : "Without the Ovoa app, Band's AI features won't work — you can add the subscription anytime after purchase."}
              </p>
            </div>

            <div className="mb-8 rounded-lg bg-landing-control p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-landing-muted">Band</span>
                <span className="font-semibold">{money(BAND_PRICE)}</span>
              </div>
              {subscriptionOn && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-landing-muted">
                    {activePlan.name}, first {annual ? "year" : "month"}
                  </span>
                  <span className="font-semibold">{money(planPrice)}</span>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-landing-line pt-3 text-sm font-semibold">
                <span>Due today</span>
                <span>{money(dueToday)}</span>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-landing-muted">
                {subscriptionOn
                  ? `Then ${money(planPrice)} per ${annual ? "year" : "month"}, automatically, until you cancel. The Band price is a one-time charge; the subscription renews on the same date each ${annual ? "year" : "month"} and can be cancelled anytime in settings. Taxes calculated at checkout.`
                  : "The Band price is a one-time charge. Taxes calculated at checkout."}
              </p>
            </div>

            <form
              className="space-y-7"
              onSubmit={(event) => {
                event.preventDefault();
                const receipt: OrderReceipt = {
                  bandPrice: BAND_PRICE,
                  planName: activePlan.name,
                  planPrice,
                  annual,
                  subscriptionOn,
                  total: dueToday,
                };
                try {
                  sessionStorage.setItem(ORDER_RECEIPT_KEY, JSON.stringify(receipt));
                } catch {
                  /* ignore storage failures */
                }
                window.location.assign(ORDER_RECEIPT_PATH);
              }}
            >
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Contact</legend>
                <Field label="Email" type="email" autoComplete="email" required />
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Shipping address</legend>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="First name" autoComplete="given-name" required />
                  <Field label="Last name" autoComplete="family-name" required />
                  <Field label="Address" className="col-span-2" autoComplete="street-address" required />
                  <Field label="Apartment, optional" className="col-span-2" />
                  <Field label="City" autoComplete="address-level2" required />
                  <Field label="State" autoComplete="address-level1" required />
                  <Field label="ZIP code" autoComplete="postal-code" required />
                  <Field label="Country" autoComplete="country-name" required />
                </div>
              </fieldset>

              <fieldset aria-labelledby="payment-heading">
                <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                  <span id="payment-heading">Payment</span>
                  <span className="flex items-center gap-1 text-[11px] text-landing-muted">
                    <LockKeyhole className="size-3" aria-hidden="true" /> Secure
                  </span>
                </div>

                <div role="radiogroup" aria-label="Payment method" className="mb-3 grid grid-cols-3 gap-2.5">
                  {([
                    { id: "card", label: "Card" },
                    { id: "applepay", label: "Apple Pay" },
                    { id: "klarna", label: "Klarna" },
                  ] as const).map((method) => {
                    const active = payMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setPayMethod(method.id)}
                        className={`h-12 rounded-lg border text-sm font-semibold transition-colors ${
                          active
                            ? "border-landing-action bg-landing-action/5 text-landing-ink"
                            : "border-landing-line bg-landing-action-foreground text-landing-muted hover:text-landing-ink"
                        }`}
                      >
                        {method.label}
                      </button>
                    );
                  })}
                </div>

                {payMethod === "card" && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Card number" className="col-span-2" inputMode="numeric" required />
                    <Field label="Expiration" inputMode="numeric" required />
                    <Field label="CVC" inputMode="numeric" required />
                  </div>
                )}

                {payMethod === "applepay" && (
                  <p className="text-[11px] leading-5 text-landing-muted">
                    You'll confirm the {money(dueToday)} payment with Apple Pay
                    {subscriptionOn ? ", including the recurring subscription," : ""} using Face ID or Touch ID.
                  </p>
                )}

                {payMethod === "klarna" && (
                  <div className="rounded-lg bg-landing-control p-4">
                    <p className="text-sm font-semibold">
                      4 payments of {money(Math.round((dueToday / 4) * 100) / 100)}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-landing-muted">
                      Interest-free, every two weeks. Klarna runs its own approval and terms
                      {subscriptionOn ? "; the recurring subscription is billed separately by Ovoa AI" : ""}.
                    </p>
                  </div>
                )}
              </fieldset>

              <Button
                type="submit"
                className={`h-12 w-full rounded-lg text-sm font-semibold shadow-none ${
                  payMethod === "applepay"
                    ? "bg-landing-ink text-landing-action-foreground hover:bg-landing-ink/90"
                    : payMethod === "klarna"
                      ? "bg-[#ffb3c7] text-landing-ink hover:bg-[#ffb3c7]/90"
                      : "bg-landing-action text-landing-action-foreground hover:bg-landing-action/90"
                }`}
              >
                {payMethod === "applepay" ? (
                  `Pay with Apple Pay`
                ) : payMethod === "klarna" ? (
                  `Continue with Klarna`
                ) : (
                  `Pay ${money(dueToday)}`
                )}
              </Button>


              <p className="text-center text-[11px] leading-5 text-landing-muted">
                {subscriptionOn
                  ? `By paying you start a recurring ${money(planPrice)}/${period} ${activePlan.name} subscription, charged automatically until cancelled.`
                  : "You're buying Band as a one-time purchase. The AI features need the Ovoa app subscription — you can add it anytime."}
              </p>
            </form>

            <nav aria-label="Checkout links" className="mt-12 flex justify-center gap-5 border-t border-landing-line pt-6">
              <Link to="/" className="text-[11px] text-landing-muted hover:text-landing-ink">Home</Link>
              <Link to="/about" className="text-[11px] text-landing-muted hover:text-landing-ink">About</Link>
              <Link to="/faq" className="text-[11px] text-landing-muted hover:text-landing-ink">FAQ</Link>
            </nav>
          </div>
        </section>
      </div>
    </main>
  );
}