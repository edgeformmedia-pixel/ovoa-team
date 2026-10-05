import { Link } from "@tanstack/react-router";
import {
  Activity,
  Battery,
  CalendarCheck,
  Droplets,
  HeartPulse,
  type LucideIcon,
  MessageSquareText,
  Mic,
  Moon,
  Move,
  NotebookPen,
  Repeat,
  Sparkles,
  Vibrate,
} from "lucide-react";
import bandFront from "@/assets/product/band-front-cutout.webp";
import bandProfile from "@/assets/product/band-profile-cutout.webp";
import bandSensors from "@/assets/product/band-sensors-cutout.webp";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TextOvoaLink } from "@/components/TextOvoaLink";

// The home page: OVOA Fit, the band, front and center. One buy button up top,
// what it tracks, how you talk to it, what the buzzes mean, the hardware, and
// the buy button again. Texting OVOA without a band lives at /text.

const HEALTH: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: HeartPulse,
    title: "Heart rate",
    copy: "All day and all night, so the trends are real and not a spot check.",
  },
  { icon: Moon, title: "Sleep", copy: "How long and how well, night after night, without thinking about it." },
  { icon: Activity, title: "Activity", copy: "Walks, workouts and long runs, picked up as you go." },
  {
    icon: Sparkles,
    title: "Recovery",
    copy: "How ready you are today, so you know when to push and when to rest.",
  },
];

const MODES: { icon: LucideIcon; title: string; copy: string }[] = [
  {
    icon: CalendarCheck,
    title: "Press to ask",
    copy: "Press the button and say what you want done. OVOA goes and does it, then buzzes when it's done or needs you.",
  },
  {
    icon: NotebookPen,
    title: "Double-tap to note",
    copy: "Speak and it's saved word for word, searchable, with a title written for you.",
  },
  {
    icon: Repeat,
    title: "Standing rules",
    copy: "Things that should keep happening run in the background, and you hear every time they fire.",
  },
];

const BUZZES: { pattern: ("short" | "long")[]; meaning: string }[] = [
  { pattern: ["short"], meaning: "Heard you" },
  { pattern: ["short", "short"], meaning: "On it" },
  { pattern: ["short", "short", "short"], meaning: "Needs your answer" },
  { pattern: ["long"], meaning: "Done" },
];

const HARDWARE: { icon: LucideIcon; title: string }[] = [
  { icon: HeartPulse, title: "Heart rate sensor" },
  { icon: Move, title: "Motion sensing" },
  { icon: Mic, title: "Microphone" },
  { icon: Vibrate, title: "Vibration motor" },
  { icon: Droplets, title: "Water-resistant woven strap" },
  { icon: Battery, title: "All-day battery" },
];

const buy =
  "inline-flex h-13 items-center justify-center rounded-full bg-landing-action px-8 text-base font-semibold text-landing-action-foreground shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0";

export function BandHome({ price, trialDays }: { price: string; trialDays: number }) {
  return (
    <main className="min-h-dvh overflow-x-clip bg-landing-canvas text-landing-ink">
      <MembershipHeader />

      <section className="px-6 pb-10 pt-12 text-center sm:pt-20">
        <p className="text-sm font-medium text-landing-muted">OVOA Fit · Beta</p>
        <h1 className="mx-auto mt-4 max-w-4xl text-[clamp(2.75rem,8vw,6rem)] font-semibold leading-[0.98] tracking-normal">
          The band you talk to.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-landing-muted sm:text-xl">
          A woven wristband that tracks your heart, sleep and recovery, and gets things done when
          you press the button and ask.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3">
          <Link to="/checkout" data-track="Buy OVOA Fit (hero)" className={buy}>
            Buy OVOA Fit · {price}
          </Link>
          <p className="text-sm text-landing-muted">
            One time · {trialDays} days of the assistant included · Ships to the US
          </p>
        </div>
        <div className="relative mx-auto mt-10 aspect-[4/3] w-full max-w-3xl">
          <div
            aria-hidden="true"
            className="absolute inset-[15%] rounded-full bg-landing-action/20 blur-3xl"
          />
          <img
            src={bandFront}
            alt="OVOA Fit, a black woven AI wristband with a sensor light and side button"
            fetchPriority="high"
            className="relative size-full object-contain"
          />
        </div>
      </section>

      <section className="border-t border-landing-line px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.04]">
            Knows how you&rsquo;re doing.
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {HEALTH.map(({ icon: Icon, title, copy }) => (
              <div key={title} className="rounded-3xl border border-landing-line p-7">
                <Icon aria-hidden="true" className="size-6 text-landing-action" />
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-2 leading-relaxed text-landing-muted">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-landing-action px-6 py-20 text-center text-landing-action-foreground sm:py-28">
        <div className="mx-auto max-w-3xl">
          <MessageSquareText aria-hidden="true" className="mx-auto size-8" />
          <h2 className="mt-5 text-[clamp(2rem,5vw,4rem)] font-semibold leading-[1.05]">
            Your data, read for you.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-landing-action-foreground/75">
            OVOA looks at your heart rate, sleep and activity, notices what changed, and texts you
            what it means, like a short night catching up with you. Reply to ask it anything.
          </p>
        </div>
      </section>

      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <img
            src={bandProfile}
            alt="OVOA Fit from the side, showing its one button"
            loading="lazy"
            className="mx-auto aspect-square w-full max-w-[30rem] object-contain"
          />
          <div>
            <h2 className="text-[clamp(2.25rem,4.5vw,4rem)] font-semibold leading-[1.04]">
              One button. Ask for anything.
            </h2>
            <div className="mt-10 space-y-8">
              {MODES.map(({ icon: Icon, title, copy }) => (
                <div key={title} className="flex gap-5">
                  <Icon aria-hidden="true" className="mt-1 size-6 shrink-0 text-landing-action" />
                  <div>
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <p className="mt-1 leading-relaxed text-landing-muted">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-landing-ink px-6 py-20 text-center text-landing-action-foreground sm:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.02]">
            No screen needed.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-landing-action-foreground/70">
            A buzz tells you where things stand.
          </p>
          <div className="mx-auto mt-10 grid max-w-2xl gap-px overflow-hidden rounded-[1.75rem] bg-landing-action-foreground/12 text-left sm:grid-cols-2">
            {BUZZES.map((buzz) => (
              <div key={buzz.meaning} className="flex items-center gap-5 bg-landing-ink p-6">
                <span aria-hidden="true" className="flex w-16 shrink-0 items-center gap-1.5">
                  {buzz.pattern.map((kind, i) => (
                    <span
                      key={i}
                      className={`h-2.5 rounded-full bg-landing-action ${kind === "long" ? "w-9" : "w-2.5"}`}
                    />
                  ))}
                </span>
                <span className="text-lg font-medium">{buzz.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="lg:order-2">
            <img
              src={bandSensors}
              alt="Underside of OVOA Fit showing the heart rate sensors and clasp"
              loading="lazy"
              className="mx-auto aspect-square w-full max-w-[30rem] object-contain"
            />
          </div>
          <div>
            <h2 className="text-[clamp(2.25rem,4.5vw,4rem)] font-semibold leading-[1.04]">
              What&rsquo;s inside.
            </h2>
            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6">
              {HARDWARE.map(({ icon: Icon, title }) => (
                <li key={title} className="flex items-center gap-3">
                  <Icon aria-hidden="true" className="size-5 shrink-0 text-landing-action" />
                  <span className="font-medium">{title}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/ai-wristband"
              className="mt-10 inline-block text-landing-action underline underline-offset-4"
            >
              Everything about OVOA Fit →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-landing-ink px-6 py-24 text-center text-landing-action-foreground sm:py-32">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium">
            <span className="text-landing-action">Beta</span>
            <span className="text-landing-action-foreground/60"> · one time</span>
          </p>
          <h2 className="mt-4 text-[clamp(3rem,8vw,6rem)] font-semibold leading-[0.98]">{price}</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-landing-action-foreground/70">
            OVOA Fit with {trialDays} days of the OVOA assistant included.
          </p>
          <Link to="/checkout" data-track="Buy OVOA Fit (bottom)" className={`mt-8 ${buy}`}>
            Buy OVOA Fit
          </Link>
        </div>
      </section>

      <section className="px-6 py-16 text-center">
        <p className="text-lg text-landing-muted">No band yet? OVOA works by text on its own.</p>
        <TextOvoaLink className="mt-4 inline-flex h-12 items-center rounded-full bg-[#0a84ff] px-7 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5" />
      </section>

      <div className="mx-auto max-w-md px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}
