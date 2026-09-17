import { useEffect, useRef, useState } from "react";

import bandScrollVideo from "@/assets/band-hero.webm.asset.json";
import OvoaIphoneDemo from "@/components/OvoaIphoneDemo";

// How long after the hero video starts playing the phone demo appears.
const DEMO_DELAY_MS = 4500;

export function ScrollScrubVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showDemo, setShowDemo] = useState(false);
  // Only one demo is mounted at a time so its voice never plays twice.
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let demoTimer: number | undefined;
    const scheduleDemo = () => {
      if (demoTimer === undefined) {
        demoTimer = window.setTimeout(() => setShowDemo(true), DEMO_DELAY_MS);
      }
    };

    const handleMetadata = () => {
      if (reducedMotion && Number.isFinite(video.duration)) {
        video.currentTime = video.duration * 0.5;
      }
    };

    if (video.readyState >= 1) handleMetadata();
    else video.addEventListener("loadedmetadata", handleMetadata, { once: true });
    video.addEventListener("playing", scheduleDemo, { once: true });
    video.load();

    // Give the page a moment to settle, then play the clip through once.
    const playTimer = window.setTimeout(() => {
      if (reducedMotion) {
        scheduleDemo();
        return;
      }
      video.play().catch(() => {
        // Autoplay can be blocked; the first frame stays visible as fallback.
        scheduleDemo();
      });
    }, 1000);

    return () => {
      window.clearTimeout(playTimer);
      window.clearTimeout(demoTimer);
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("playing", scheduleDemo);
    };
  }, []);

  return (
    <>
      <section
        aria-label="Band product demonstration"
        className="relative flex h-svh min-h-[620px] flex-col items-center overflow-hidden bg-landing-canvas pb-6 pt-7 text-center sm:pb-8 sm:pt-9"
      >
        <div className="shrink-0">
          <p className="text-sm text-landing-muted sm:text-base">Woven Band</p>
          <h1 className="mt-1.5 text-[clamp(2.65rem,6vw,5.25rem)] font-semibold leading-[0.98] tracking-normal text-landing-ink">
            Made to move.
          </h1>
          <p className="mt-2 text-lg text-landing-muted sm:text-2xl">
            Comfort in every moment.
          </p>
        </div>

        <div className="relative mt-5 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden sm:mt-7">
          <div className="relative aspect-video w-screen shrink-0">
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
          className="inline-flex h-12 w-[min(88vw,18rem)] items-center justify-center rounded-full bg-landing-action px-6 text-sm font-medium text-landing-action-foreground shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-action active:translate-y-0"
        >
          Explore options
        </a>

        <p className="mt-3 text-[11px] text-landing-muted/70">Band in motion</p>

        {showDemo && wide && (
          // The hero sits under the 4rem header, so its bottom edge is 4rem below the viewport.
          <div className="hero-demo-swoop absolute bottom-[5rem] left-[max(1.5rem,4vw)] z-10 w-[min(260px,calc((100svh-17rem)/2.35))]">
            <OvoaIphoneDemo maxWidth={260} />
          </div>
        )}
      </section>

      {showDemo && !wide && (
        <div className="hero-demo-fade flex justify-center bg-landing-canvas px-6 pb-16 pt-4">
          <div className="w-[min(78vw,300px)]">
            <OvoaIphoneDemo maxWidth={300} />
          </div>
        </div>
      )}
    </>
  );
}
