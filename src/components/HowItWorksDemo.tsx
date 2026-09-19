import { useEffect, useState } from "react";
import { Play, Volume2 } from "lucide-react";

import OvoaIphoneDemo from "@/components/OvoaIphoneDemo";

// How long the "Volume up" cue shows before the demo starts.
const VOLUME_CUE_MS = 1800;

type Stage = "idle" | "volume" | "playing";

export function HowItWorksDemo() {
  const [stage, setStage] = useState<Stage>("idle");

  useEffect(() => {
    if (stage !== "volume") return;
    const timer = window.setTimeout(() => setStage("playing"), VOLUME_CUE_MS);
    return () => window.clearTimeout(timer);
  }, [stage]);

  return (
    <section
      id="how-it-works"
      className="border-t border-landing-line bg-landing-canvas px-6 py-20 text-center sm:py-28"
    >
      <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-semibold leading-[1.04] tracking-normal text-landing-ink">
        See how it works
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-lg text-landing-muted sm:text-xl">
        Watch OVOA handle a running-late morning, start to finish.
      </p>

      <div className="mt-10 flex justify-center" aria-live="polite">
        {stage === "idle" && (
          <button
            type="button"
            onClick={() => setStage("volume")}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-landing-action px-7 text-sm font-medium text-landing-action-foreground shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-action active:translate-y-0"
          >
            <Play aria-hidden="true" className="size-4 fill-current" />
            See how it works
          </button>
        )}

        {stage === "volume" && (
          <p className="hero-demo-fade inline-flex h-12 items-center gap-2.5 rounded-full border border-landing-line px-7 text-base font-medium text-landing-ink">
            <Volume2 aria-hidden="true" className="size-5 animate-pulse text-landing-action" />
            Volume up
          </p>
        )}

        {stage === "playing" && (
          <div className="hero-demo-fade w-[min(78vw,300px)]">
            <OvoaIphoneDemo maxWidth={300} />
          </div>
        )}
      </div>
    </section>
  );
}
