import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ShoppingBag } from "lucide-react";
import { ScrollScrubVideo } from "@/components/ScrollScrubVideo";
import { SiteFooter } from "@/components/SiteFooter";
import bandFront from "@/assets/product/band-front-cutout.png";
import bandProfile from "@/assets/product/band-profile-cutout.png";
import bandSensors from "@/assets/product/band-sensors-cutout.png";
import cyclingBand from "@/assets/sports/cycling-band.jpg.asset.json";
import runningBand from "@/assets/sports/running-band.png.asset.json";
import swimmingBand from "@/assets/sports/swimming-band.png.asset.json";

const OG_IMAGE = "https://ovoa.ai/og-band.jpg";
const PAGE_TITLE = "Health Band — programmable AI wristband, $99";
const PAGE_DESCRIPTION =
  "A woven health band with heart rate, motion and voice sensing. Ask it for something and it does it. One button, all-day battery. $99.";

export const Route = createFileRoute("/")({
  component: Landing,
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "product" },
      { property: "og:url", content: "https://ovoa.ai/" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://ovoa.ai/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Health Band",
          description: PAGE_DESCRIPTION,
          image: OG_IMAGE,
          brand: { "@type": "Brand", name: "Band" },
          offers: {
            "@type": "Offer",
            price: "99.00",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: "https://ovoa.ai/checkout",
          },
        }),
      },
    ],
  }),
});

function Landing() {
  return (
    <main className="min-h-dvh overflow-x-clip bg-landing-canvas text-landing-ink">
      <header className="h-14 border-b border-landing-line sm:h-16">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-5 sm:px-10 lg:px-14">
          <nav aria-label="Main navigation" className="flex h-full items-center gap-6 sm:gap-10">
            <Link
              to="/"
              className="relative flex h-full items-center text-xs font-medium text-landing-ink after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-landing-ink"
            >
              Collection
            </Link>
            <Link to="/about" className="hidden text-xs text-landing-muted transition-colors hover:text-landing-ink sm:block">
              Bands
            </Link>
            <Link to="/about" className="hidden text-xs text-landing-muted transition-colors hover:text-landing-ink sm:block">
              Materials
            </Link>
            <Link to="/faq" className="text-xs text-landing-muted transition-colors hover:text-landing-ink">
              Support
            </Link>
          </nav>

          <div className="flex items-center gap-5 sm:gap-7">
            <Link
              to="/about"
              aria-label="Search product information"
              title="Search"
              className="text-landing-ink transition-opacity hover:opacity-55"
            >
              <Search aria-hidden="true" className="size-5 stroke-[1.6]" />
            </Link>
            <Link
              to="/checkout"
              aria-label="Open checkout"
              title="Checkout"
              className="text-landing-ink transition-opacity hover:opacity-55"
            >
              <ShoppingBag aria-hidden="true" className="size-5 stroke-[1.6]" />
            </Link>
          </div>
        </div>
      </header>

      <ScrollScrubVideo />

      <section className="border-t border-landing-line bg-landing-canvas px-6 py-24 text-center sm:py-36">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-medium text-landing-muted">Meet Band</p>
          <h2 className="mt-4 text-[clamp(2.35rem,6vw,5.5rem)] font-semibold leading-[1.02] tracking-normal text-landing-ink">
            Ask once. Band gets to work.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-landing-muted sm:text-2xl">
            Speak or type an open-ended request. Band handles the task and lets
            you know when it’s done—or when it needs you.
          </p>
        </div>
      </section>

      <section className="bg-landing-canvas px-4 pb-24 sm:px-6 sm:pb-36">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-10 max-w-4xl sm:mb-14">
            <p className="text-lg font-semibold text-landing-ink sm:text-xl">Band</p>
            <h2 className="mt-3 text-[clamp(3rem,7vw,6.5rem)] font-semibold leading-[0.96] tracking-normal text-landing-ink">
              Made for your environments.
            </h2>
          </div>

          <div className="grid gap-2 lg:grid-cols-3">
            {[
              {
                src: cyclingBand.url,
                alt: "Cyclist wearing Band during an outdoor ride",
                title: "Ride farther",
                copy: "Heart rate and motion sensing stay with you through every climb and recovery.",
                position: "object-center",
                zoom: "",
              },
              {
                src: runningBand.url,
                alt: "Runner wearing Band on an outdoor track",
                title: "Find your pace",
                copy: "A light woven fit and discreet feedback keep the focus on the next stride.",
                position: "object-[42%_center]",
                zoom: "",
              },
              {
                src: swimmingBand.url,
                alt: "Swimmer wearing Band beside a pool",
                title: "Made to move",
                copy: "Water-resistant and designed for all-day wear, from the pool to everything after.",
                position: "object-[70%_center]",
                zoom: "scale-[1.35] origin-[50%_100%]",
              },
            ].map((sport) => (
              <article
                key={sport.title}
                className="group relative min-h-[34rem] overflow-hidden rounded-[1.75rem] bg-landing-control sm:min-h-[42rem] lg:min-h-[38rem]"
              >
                <div className={`absolute inset-0 ${sport.zoom}`}>
                  <img
                    src={sport.src}
                    alt={sport.alt}
                    loading="lazy"
                    className={`size-full object-cover ${sport.position} transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.025]`}
                  />
                </div>
                <div className="absolute inset-x-0 bottom-[25%] h-[24%] bg-gradient-to-t from-landing-ink/65 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 min-h-[29%] rounded-t-[1.75rem] border-t border-landing-action-foreground/15 bg-landing-ink/70 p-6 text-landing-action-foreground backdrop-blur-md sm:p-8">
                  <h3 className="text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">{sport.title}</h3>
                  <p className="mt-2 max-w-sm text-base leading-relaxed text-landing-action-foreground/88 sm:text-lg">
                    {sport.copy}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-landing-control/55 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:gap-20 lg:px-14">
          <div className="relative mx-auto aspect-square w-full max-w-[38rem]">
            <img
              src={bandFront}
              alt="Black woven Band with its side button and status light"
              loading="lazy"
              className="size-full object-contain"
            />
          </div>
          <div className="max-w-xl lg:pr-10">
            <p className="text-sm font-medium text-landing-muted">One request</p>
            <h2 className="mt-3 text-[clamp(2.25rem,4.5vw,4.5rem)] font-semibold leading-[1.04] tracking-normal text-landing-ink">
              Less screen. More done.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-landing-muted sm:text-xl">
              Ask for a task out loud or in the app. Band keeps the work moving
              and answers with a simple vibration, so you don’t have to keep
              checking a screen.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-landing-canvas py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:gap-20 lg:px-14">
          <div className="max-w-xl lg:order-1 lg:pl-10">
            <p className="text-sm font-medium text-landing-muted">Notes</p>
            <h2 className="mt-3 text-[clamp(2.25rem,4.5vw,4.5rem)] font-semibold leading-[1.04] tracking-normal text-landing-ink">
              Remember it word for word.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-landing-muted sm:text-xl">
              Double-tap the button and speak. Band saves what you say exactly,
              then makes the note searchable in the companion app.
            </p>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[38rem] lg:order-2">
            <img
              src={bandProfile}
              alt="Side profile of Band showing its single physical button"
              loading="lazy"
              className="size-full object-contain"
            />
          </div>
        </div>
      </section>

      <section className="bg-landing-control/55 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:gap-20 lg:px-14">
          <div className="relative mx-auto aspect-square w-full max-w-[38rem]">
            <img
              src={bandSensors}
              alt="Underside of Band showing the heart rate sensors"
              loading="lazy"
              className="size-full object-contain"
            />
          </div>
          <div className="max-w-xl lg:pr-10">
            <p className="text-sm font-medium text-landing-muted">Health and motion</p>
            <h2 className="mt-3 text-[clamp(2.25rem,4.5vw,4.5rem)] font-semibold leading-[1.04] tracking-normal text-landing-ink">
              Sensing that stays with you.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-landing-muted sm:text-xl">
              Heart rate and motion sensing run in the background. The woven,
              water-resistant strap is made for all-day wear, with vibration
              feedback that keeps answers discreet.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-landing-canvas px-6 py-24 text-center sm:py-36">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-landing-muted">Woven Band · $99</p>
          <h2 className="mt-4 text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1.02] tracking-normal text-landing-ink">
            Ready when you are.
          </h2>
          <Link
            to="/checkout"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-landing-action px-8 text-sm font-medium text-landing-action-foreground shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-action active:translate-y-0"
          >
            Buy Band
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-md px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}
