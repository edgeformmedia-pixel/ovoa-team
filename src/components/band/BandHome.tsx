import { Link } from "@tanstack/react-router";
import bandFront from "@/assets/product/band-front-cutout.webp";
import bandProfile from "@/assets/product/band-profile-cutout.webp";
import bandSensors from "@/assets/product/band-sensors-cutout.webp";
import { MembershipHeader } from "@/components/membership/MembershipHeader";
import { SiteFooter } from "@/components/SiteFooter";

// The home page: OVOA Fit, the band. Few words, big product, one button.
// Hero, how it works, price, Buy, short FAQ. Everything else is off this page.

const STEPS = [
  { word: "One tap", line: "Command your AI agents. Say it, and it's done." },
  { word: "Double tap", line: "Take a note. Saved, titled and searchable." },
  { word: "Feel it", line: "A buzz tells you when it's handled." },
];

// Brand marks come from Simple Icons (CC0). Names without a public mark yet
// (ChatGPT, Muse, Dot, Hermes, OpenClaw) get a letter badge until real logos are dropped in.
const ICON_PATHS: Record<string, string> = {
  Claude:
    "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z",
  Gemini:
    "M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81",
};

const AGENTS = ["Claude", "ChatGPT", "Muse", "Dot", "Hermes", "OpenClaw", "Gemini"];

function AgentMark({ name }: { name: string }) {
  const path = ICON_PATHS[name];
  if (path) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
        <path d={path} />
      </svg>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-5 items-center justify-center rounded-md bg-landing-action-foreground/15 text-[11px] font-bold"
    >
      {name[0]}
    </span>
  );
}

const TRACKS = ["Heart rate", "Sleep", "Recovery", "Activity"];

const SPECS = [
  { value: "24/7", label: "Heart rate" },
  { value: "Woven", label: "Water-resistant strap" },
  { value: "All day", label: "Battery" },
  { value: "No screen", label: "Just a buzz" },
];

const FAQ = [
  {
    q: "What does it do?",
    a: "Press the button and say it: OVOA schedules, reminds, takes notes and gets things done. It buzzes when it's handled.",
  },
  {
    q: "Do I need an iPhone?",
    a: "Yes. OVOA Fit works with the free OVOA iPhone app.",
  },
  {
    q: "What's included?",
    a: "The band, plus free days of the assistant. After that the free app still works, or you can keep a plan.",
  },
  {
    q: "Is it water resistant? How long is the battery?",
    a: "Rain, sweat and hand washing are fine. The battery lasts all day with heart rate running.",
  },
  {
    q: "Where does it ship?",
    a: "US addresses. It's beta hardware made in small batches.",
  },
];

const buy =
  "inline-flex h-14 items-center justify-center rounded-full bg-landing-ink px-10 text-base font-semibold text-landing-action-foreground shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5 active:translate-y-0";

export function BandHome({ price, trialDays }: { price?: string; trialDays: number }) {
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
          <p className="text-sm text-landing-muted">
            {price ? `${price} · ` : ""}Ships to the US · Beta
          </p>
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
        <ul className="mx-auto mt-12 flex max-w-4xl flex-wrap justify-center gap-3">
          {AGENTS.map((a) => (
            <li
              key={a}
              className="flex items-center gap-2.5 rounded-full border border-landing-action-foreground/20 px-5 py-3 text-base font-medium"
            >
              <AgentMark name={a} />
              {a}
            </li>
          ))}
          <li className="rounded-full border border-landing-action-foreground/20 px-5 py-3 text-base text-landing-action-foreground/60">
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
          {price ? `${price}, one time. ` : ""}
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

      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-3xl font-semibold tracking-tight">Questions</h2>
          <div className="mt-8 divide-y divide-landing-line border-y border-landing-line">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group py-4">
                <summary className="cursor-pointer list-none text-base font-medium">{q}</summary>
                <p className="mt-2 text-landing-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-md px-6 pb-8">
        <SiteFooter />
      </div>
    </main>
  );
}
