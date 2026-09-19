import { useEffect, useRef, useState, type CSSProperties } from "react";

import bandScrollVideo from "@/assets/band-hero.webm.asset.json";

const HEADLINE = "Hey OVOA!";

// How long after the hero video starts playing the headline swaps.
const HEADLINE_SWAP_MS = 3000;

export function ScrollScrubVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [swapped, setSwapped] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let swapTimer: number | undefined;
    const scheduleSwap = () => {
      if (swapTimer === undefined) {
        swapTimer = window.setTimeout(() => setSwapped(true), HEADLINE_SWAP_MS);
      }
    };

    const handleMetadata = () => {
      if (reducedMotion && Number.isFinite(video.duration)) {
        video.currentTime = video.duration * 0.5;
      }
    };

    if (video.readyState >= 1) handleMetadata();
    else video.addEventListener("loadedmetadata", handleMetadata, { once: true });
    video.addEventListener("playing", scheduleSwap, { once: true });
    video.load();

    // Give the page a moment to settle, then play the clip through once.
    const playTimer = window.setTimeout(() => {
      if (reducedMotion) {
        scheduleSwap();
        return;
      }
      video.play().catch(() => {
        // Autoplay can be blocked; the first frame stays visible as fallback.
        scheduleSwap();
      });
    }, 1000);

    return () => {
      window.clearTimeout(playTimer);
      window.clearTimeout(swapTimer);
      video.removeEventListener("playing", scheduleSwap);
      video.removeEventListener("loadedmetadata", handleMetadata);
    };
  }, []);

  return (
    <section
      aria-label="Band product demonstration"
      className="relative flex h-[calc(100svh-3.5rem)] min-h-[620px] sm:h-[calc(100svh-4rem)] flex-col items-center overflow-hidden bg-landing-canvas pb-6 pt-7 text-center sm:pb-8 sm:pt-9"
    >
      <div className="shrink-0">
        <a
          href="#band"
          className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-landing-line px-3.5 py-1 text-xs font-medium text-landing-ink transition-colors hover:bg-landing-control sm:mb-4 sm:text-sm"
        >
          <span className="text-landing-action">New</span>
          OVOA Band brings OVOA to your wrist
          <span aria-hidden="true">›</span>
        </a>
        <p className="text-sm text-landing-muted sm:text-base">OVOA for iPhone</p>
        <h1 className="mt-1.5 grid text-[clamp(2.65rem,6vw,5.25rem)] font-semibold leading-[0.98] tracking-normal text-landing-ink">
          {/* Both lines share one grid cell so the swap cross-fades in place. */}
          <span
            aria-hidden={swapped}
            className={`col-start-1 row-start-1 transition-opacity duration-700 ease-out ${swapped ? "opacity-0" : "opacity-100"}`}
          >
            <span className="sr-only">{HEADLINE}</span>
            <span aria-hidden="true">
              {Array.from(HEADLINE).map((char, i) =>
                char === " " ? (
                  " "
                ) : (
                  <span key={i} className="hero-letter" style={{ "--i": i } as CSSProperties}>
                    {char}
                  </span>
                ),
              )}
            </span>
          </span>
          <span
            aria-hidden={!swapped}
            className={`col-start-1 row-start-1 transition-opacity duration-700 ease-out ${swapped ? "opacity-100" : "opacity-0"}`}
          >
            Your life assistant.
          </span>
        </h1>
        <p className="mt-2 text-lg text-landing-muted sm:text-2xl">Ask once. It’s handled.</p>
      </div>

      <div className="relative mt-5 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden sm:mt-7">
        {/* Shifted down so the wrist, which sits ~37% down the clip, lands mid-frame. */}
        <div className="relative aspect-video w-screen shrink-0 translate-y-[13%]">
          <video
            ref={videoRef}
            src={bandScrollVideo.url}
            muted
            playsInline
            preload="auto"
            aria-label="Band rotating before being placed on a wrist"
            className="pointer-events-none absolute inset-0 size-full transform-gpu object-cover mix-blend-multiply will-change-transform"
          />
        </div>
      </div>

      <a
        href="/checkout"
        className="mt-6 inline-flex h-12 w-[min(88vw,18rem)] shrink-0 sm:mt-8 items-center justify-center rounded-full bg-landing-action px-6 text-sm font-medium text-landing-action-foreground shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-action active:translate-y-0"
      >
        Get started
      </a>

      <p className="mt-3 text-[11px] text-landing-muted/70">Shown with the new OVOA Band</p>
    </section>
  );
}
