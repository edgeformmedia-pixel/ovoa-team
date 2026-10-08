import { Link } from "@tanstack/react-router";
import bandFront from "@/assets/product/band-front-cutout.webp";
import bandProfile from "@/assets/product/band-profile-cutout.webp";
import bandSensors from "@/assets/product/band-sensors-cutout.webp";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TextOvoaLink } from "@/components/TextOvoaLink";

// The home page: OVOA Fit, the band. Few words, big product, one button.
// The price lives at checkout, not here. Texting OVOA without a band is /text.

const STEPS = [
  { word: "One tap", line: "Command your AI agents. Say it, and it's done." },
  { word: "Double tap", line: "Take a note. Saved, titled and searchable." },
  { word: "Feel it", line: "A buzz tells you when it's handled." },
];

const AGENTS = ["Claude", "ChatGPT", "Muse", "Dot"];

const TRACKS = ["Heart rate", "Sleep", "Recovery", "Activity"];

const SPECS = [
  { value: "24/7", label: "Heart rate" },
  { value: "Woven", label: "Water-resistant strap" },
  { value: "All day", label: "Battery" },
  { value: "No screen", label: "Just a buzz" },
];

const buy =
  "inline-flex h-14 items-center justify-center rounded-full bg-landing-ink px-10 text-base font-semibold text-landing-action-foreground shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5 active:translate-y-0";

export function BandHome({ trialDays }: { price?: string; trialDays: number }) {
  return (
    <main className="min-h-dvh overflow-x-clip bg-landing-canvas text-landing-ink">
      <MembershipHeader />

      <section className="px-6 pb-4 pt-20 text-center sm:pt-32">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-landing-muted">
          OVOA Fit
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(3rem,9vw,7rem)] font-semibold leading-[0.95] tracking-tight">
          Talk to your wrist.
        </h1>
        <p className="mx-auto mt-6 max-w-md text-lg text-landing-muted sm:text-xl">
          The AI band that tracks your health and gets things done.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link to="/checkout" data-track="Buy OVOA Fit (hero)" className={buy}>
            Buy
          </Link>
          <p className="text-sm text-landing-muted">Ships to the US · Beta</p>
        </div>
        <div className="relative mx-auto mt-6 aspect-[4/3] w-full max-w-4xl">
          <div
            aria-hidden="true"
            className="absolute inset-[18%] rounded-full bg-landing-action/20 blur-[90px]"
          />
          <img
            src={bandFront}
            alt="OVOA Fit, a black woven AI wristband with a sensor light and side button"
            fetchPriority="high"
            className="relative size-full object-contain drop-shadow-[0_40px_50px_rgba(0,0,0,0.25)]"
          />
        </div>
      </section>

      <section className="bg-landing-ink px-6 py-28 text-landing-action-foreground sm:py-40">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-[1.02] tracking-tight">
            Tap. Speak. Done.
          </h2>
          <div className="mt-20 grid gap-14 sm:grid-cols-3 sm:gap-10">
            {STEPS.map(({ word, line }, i) => (
              <div key={word} className="text-center sm:text-left">
                <p className="text-sm tabular-nums text-landing-action">0{i + 1}</p>
                <p className="mt-3 text-3xl font-semibold">{word}</p>
                <p className="mt-2 text-landing-action-foreground/60">{line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-28 sm:py-40">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <img
            src={bandProfile}
            alt="OVOA Fit from the side, showing its one button"
            loading="lazy"
            className="mx-auto aspect-square w-full max-w-[32rem] object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.2)]"
          />
          <div>
            <h2 className="text-[clamp(2.25rem,5vw,4.25rem)] font-semibold leading-[1.02] tracking-tight">
              Knows how you&rsquo;re doing.
            </h2>
            <ul className="mt-10 flex flex-wrap gap-3">
              {TRACKS.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-landing-line px-5 py-2.5 text-base font-medium"
                >
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-8 max-w-sm text-lg text-landing-muted">
              OVOA reads it for you and texts what it means.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-landing-ink px-6 py-28 text-center text-landing-action-foreground sm:py-36">
        <h2 className="mx-auto max-w-3xl text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-[1.02] tracking-tight">
          Plugs into the AI you already use.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-lg text-landing-action-foreground/60">
          Link the button to any agent. No setup headache.
        </p>
        <ul className="mt-12 flex flex-wrap justify-center gap-3">
          {AGENTS.map((a) => (
            <li
              key={a}
              className="rounded-full border border-landing-action-foreground/20 px-6 py-3 text-lg font-medium"
            >
              {a}
            </li>
          ))}
          <li className="rounded-full border border-landing-action-foreground/20 px-6 py-3 text-lg text-landing-action-foreground/60">
            and more
          </li>
        </ul>
      </section>

      <section className="border-t border-landing-line px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-px overflow-hidden rounded-3xl bg-landing-line sm:grid-cols-4">
            {SPECS.map(({ value, label }) => (
              <div key={label} className="bg-landing-canvas p-8 text-center">
                <p className="text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-sm text-landing-muted">{label}</p>
              </div>
            ))}
          </div>
          <img
            src={bandSensors}
            alt="Underside of OVOA Fit showing the heart rate sensors and clasp"
            loading="lazy"
            className="mx-auto mt-16 aspect-square w-full max-w-sm object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.2)]"
          />
        </div>
      </section>

      <section className="bg-landing-ink px-6 py-28 text-center text-landing-action-foreground sm:py-40">
        <h2 className="text-[clamp(2.5rem,7vw,5.5rem)] font-semibold leading-[0.98] tracking-tight">
          Meet OVOA Fit.
        </h2>
        <p className="mt-5 text-lg text-landing-action-foreground/60">
          {trialDays} days of the assistant included.
        </p>
        <Link
          to="/checkout"
          data-track="Buy OVOA Fit (bottom)"
          className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-landing-action-foreground px-10 text-base font-semibold text-landing-ink transition-transform hover:-translate-y-0.5"
        >
          Buy
        </Link>
      </section>

      <section className="px-6 py-14 text-center">
        <p className="text-landing-muted">No band? OVOA works by text.</p>
        <TextOvoaLink className="mt-3 inline-flex h-11 items-center rounded-full bg-[#0a84ff] px-6 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5" />
      </section>

      <div className="mx-auto max-w-md px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}
