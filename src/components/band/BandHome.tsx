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

// Brand marks come from Simple Icons (CC0). Names without a public mark yet
// (ChatGPT, Muse, Dot, Hermes, OpenClaw) get a letter badge until real logos are dropped in.
const ICON_PATHS: Record<string, string> = {
  Claude:
    "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z",
  Gemini:
    "M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81",
  Perplexity:
    "M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z",
  Mistral:
    "M17.143 3.429v3.428h-3.429v3.429h-3.428V6.857H6.857V3.43H3.43v13.714H0v3.428h10.286v-3.428H6.857v-3.429h3.429v3.429h3.429v-3.429h3.428v3.429h-3.428v3.428H24v-3.428h-3.43V3.429z",
  Copilot:
    "M23.922 16.997C23.061 18.492 18.063 22.02 12 22.02 5.937 22.02.939 18.492.078 16.997A.641.641 0 0 1 0 16.741v-2.869a.883.883 0 0 1 .053-.22c.372-.935 1.347-2.292 2.605-2.656.167-.429.414-1.055.644-1.517a10.098 10.098 0 0 1-.052-1.086c0-1.331.282-2.499 1.132-3.368.397-.406.89-.717 1.474-.952C7.255 2.937 9.248 1.98 11.978 1.98c2.731 0 4.767.957 6.166 2.093.584.235 1.077.546 1.474.952.85.869 1.132 2.037 1.132 3.368 0 .368-.014.733-.052 1.086.23.462.477 1.088.644 1.517 1.258.364 2.233 1.721 2.605 2.656a.841.841 0 0 1 .053.22v2.869a.641.641 0 0 1-.078.256Zm-11.75-5.992h-.344a4.359 4.359 0 0 1-.355.508c-.77.947-1.918 1.492-3.508 1.492-1.725 0-2.989-.359-3.782-1.259a2.137 2.137 0 0 1-.085-.104L4 11.746v6.585c1.435.779 4.514 2.179 8 2.179 3.486 0 6.565-1.4 8-2.179v-6.585l-.098-.104s-.033.045-.085.104c-.793.9-2.057 1.259-3.782 1.259-1.59 0-2.738-.545-3.508-1.492a4.359 4.359 0 0 1-.355-.508Zm2.328 3.25c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm-5 0c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm3.313-6.185c.136 1.057.403 1.913.878 2.497.442.544 1.134.938 2.344.938 1.573 0 2.292-.337 2.657-.751.384-.435.558-1.15.558-2.361 0-1.14-.243-1.847-.705-2.319-.477-.488-1.319-.862-2.824-1.025-1.487-.161-2.192.138-2.533.529-.269.307-.437.808-.438 1.578v.021c0 .265.021.562.063.893Zm-1.626 0c.042-.331.063-.628.063-.894v-.02c-.001-.77-.169-1.271-.438-1.578-.341-.391-1.046-.69-2.533-.529-1.505.163-2.347.537-2.824 1.025-.462.472-.705 1.179-.705 2.319 0 1.211.175 1.926.558 2.361.365.414 1.084.751 2.657.751 1.21 0 1.902-.394 2.344-.938.475-.584.742-1.44.878-2.497Z",
  Notion:
    "M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z",
  Zapier:
    "M4.157 0A4.151 4.151 0 0 0 0 4.161v15.678A4.151 4.151 0 0 0 4.157 24h15.682A4.152 4.152 0 0 0 24 19.839V4.161A4.152 4.152 0 0 0 19.839 0H4.157Zm10.61 8.761h.03a.577.577 0 0 1 .23.038.585.585 0 0 1 .201.124.63.63 0 0 1 .162.431.612.612 0 0 1-.162.435.58.58 0 0 1-.201.128.58.58 0 0 1-.23.042.529.529 0 0 1-.235-.042.585.585 0 0 1-.332-.328.559.559 0 0 1-.038-.235.613.613 0 0 1 .17-.431.59.59 0 0 1 .405-.162Zm2.853 1.572c.03.004.061.004.095.004.325-.011.646.064.937.219.238.144.431.355.552.609.128.279.189.582.185.888v.193a2 2 0 0 1 0 .219h-2.498c.003.227.075.45.204.642a.78.78 0 0 0 .646.265.714.714 0 0 0 .484-.136.642.642 0 0 0 .23-.318l.915.257a1.398 1.398 0 0 1-.28.537c-.14.159-.321.284-.521.355a2.234 2.234 0 0 1-.836.136 1.923 1.923 0 0 1-1.001-.245 1.618 1.618 0 0 1-.665-.703 2.221 2.221 0 0 1-.227-1.036 1.95 1.95 0 0 1 .48-1.398 1.9 1.9 0 0 1 1.3-.488Zm-9.607.023c.162.004.325.026.48.079.207.065.4.174.563.314.26.302.393.692.366 1.088v2.276H8.53l-.109-.711h-.065c-.064.163-.155.31-.272.439a1.122 1.122 0 0 1-.374.264 1.023 1.023 0 0 1-.453.083 1.334 1.334 0 0 1-.866-.264.965.965 0 0 1-.329-.801.993.993 0 0 1 .076-.431 1.02 1.02 0 0 1 .242-.363 1.478 1.478 0 0 1 1.043-.303h.952v-.181a.696.696 0 0 0-.136-.454.553.553 0 0 0-.438-.154.695.695 0 0 0-.378.086.48.48 0 0 0-.193.254l-.99-.144a1.26 1.26 0 0 1 .257-.563c.14-.174.321-.302.533-.378.261-.091.54-.136.82-.129.053-.003.106-.007.163-.007Zm4.384.007c.174 0 .347.038.506.114.182.083.34.211.458.374.257.423.377.911.351 1.406a2.53 2.53 0 0 1-.355 1.448 1.148 1.148 0 0 1-1.009.517c-.204 0-.401-.045-.582-.136a1.052 1.052 0 0 1-.48-.457 1.298 1.298 0 0 1-.114-.234h-.045l.004 1.784h-1.059v-4.713h.904l.117.805h.057c.068-.208.177-.401.328-.56a1.129 1.129 0 0 1 .843-.344h.076v-.004Zm7.559.084h.903l.113.805h.053a1.37 1.37 0 0 1 .235-.484.813.813 0 0 1 .313-.242.82.82 0 0 1 .39-.076h.234v1.051h-.401a.662.662 0 0 0-.313.008.623.623 0 0 0-.272.155.663.663 0 0 0-.174.26.683.683 0 0 0-.027.314v1.875h-1.054v-3.666Zm-17.515.003h3.262v.896L3.73 13.104l.034.113h1.973l.042.9H2.4v-.9l1.931-1.754-.045-.117H2.441v-.896Zm11.815 0h1.055v3.659h-1.055V10.45Zm3.443.684.019.016a.69.69 0 0 0-.351.045.756.756 0 0 0-.287.204c-.11.155-.174.336-.189.522h1.545c-.034-.526-.257-.787-.74-.787h.003Zm-5.718.163c-.026 0-.057 0-.083.004a.78.78 0 0 0-.31.053.746.746 0 0 0-.257.189 1.016 1.016 0 0 0-.204.695v.064c-.015.257.057.507.204.711a.634.634 0 0 0 .253.196.638.638 0 0 0 .314.061.644.644 0 0 0 .578-.265c.14-.223.204-.48.189-.74a1.216 1.216 0 0 0-.181-.711.677.677 0 0 0-.503-.257Zm-4.509 1.266a.464.464 0 0 0-.268.102.373.373 0 0 0-.114.276c0 .053.008.106.027.155a.375.375 0 0 0 .087.132.576.576 0 0 0 .397.11v.004a.863.863 0 0 0 .563-.182.573.573 0 0 0 .211-.457v-.14h-.903Z",
  n8n: "M21.4737 5.6842c-1.1772 0-2.1663.8051-2.4468 1.8947h-2.8955c-1.235 0-2.289.893-2.492 2.111l-.1038.623a1.263 1.263 0 0 1-1.246 1.0555H11.289c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947s-2.1663.8051-2.4467 1.8947H4.973c-.2805-1.0896-1.2696-1.8947-2.4468-1.8947C1.1311 9.4737 0 10.6047 0 12s1.131 2.5263 2.5263 2.5263c1.1772 0 2.1663-.8051 2.4468-1.8947h1.4223c.2804 1.0896 1.2696 1.8947 2.4467 1.8947 1.1772 0 2.1663-.8051 2.4468-1.8947h1.0008a1.263 1.263 0 0 1 1.2459 1.0555l.1038.623c.203 1.218 1.257 2.111 2.492 2.111h.3692c.2804 1.0895 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263c-1.1772 0-2.1664.805-2.4468 1.8947h-.3692a1.263 1.263 0 0 1-1.246-1.0555l-.1037-.623A2.52 2.52 0 0 0 13.9607 12a2.52 2.52 0 0 0 .821-1.4794l.1038-.623a1.263 1.263 0 0 1 1.2459-1.0555h2.8955c.2805 1.0896 1.2696 1.8947 2.4468 1.8947 1.3952 0 2.5263-1.131 2.5263-2.5263s-1.131-2.5263-2.5263-2.5263m0 1.2632a1.263 1.263 0 0 1 1.2631 1.2631 1.263 1.263 0 0 1-1.2631 1.2632 1.263 1.263 0 0 1-1.2632-1.2632 1.263 1.263 0 0 1 1.2632-1.2631M2.5263 10.7368A1.263 1.263 0 0 1 3.7895 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 1.2632 12a1.263 1.263 0 0 1 1.2631-1.2632m6.3158 0A1.263 1.263 0 0 1 10.1053 12a1.263 1.263 0 0 1-1.2632 1.2632A1.263 1.263 0 0 1 7.579 12a1.263 1.263 0 0 1 1.2632-1.2632m10.1053 3.7895a1.263 1.263 0 0 1 1.2631 1.2632 1.263 1.263 0 0 1-1.2631 1.2631 1.263 1.263 0 0 1-1.2632-1.2631 1.263 1.263 0 0 1 1.2632-1.2632",
};

const AGENTS = [
  "Claude",
  "ChatGPT",
  "Gemini",
  "Muse",
  "Dot",
  "Hermes",
  "OpenClaw",
  "Perplexity",
  "Copilot",
  "Mistral",
  "Notion",
  "Zapier",
];

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
