import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  hr: number;
  battery: number;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-band-line py-3">
      <span className="text-[13px] text-band-dim">{label}</span>
      <span className="font-mono text-[13px] tabular-nums text-band-data">{value}</span>
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(1, max - min);
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 24 - ((p - min) / span) * 22;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-6 w-28">
      <path d={d} fill="none" stroke="var(--band-data)" strokeWidth="1.2" />
    </svg>
  );
}

const hex = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();

export function SignalsSheet({ open, onClose, hr, battery }: Props) {
  const [tick, setTick] = useState(0);
  const [trend, setTrend] = useState<number[]>(() =>
    Array.from({ length: 28 }, (_, i) => 58 + Math.sin(i / 3) * 4),
  );
  const seed = useRef(Math.random());

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setTrend((prev) => [...prev.slice(1), hr + (Math.random() * 4 - 2)]);
    }, 900);
    return () => clearInterval(id);
  }, [open, hr]);

  if (!open) return null;

  const jitter = (base: number, amp: number, o: number) =>
    base + Math.sin(tick / 2 + o + seed.current * 6) * amp;

  const frames = Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 8 }, (_, c) => hex(Math.floor((Math.sin(tick + r * 3 + c) + 1) * 127)))
      .join(" "),
  );

  return (
    <div className="band-sheet-wrap" role="dialog" aria-label="Live signals">
      <button
        type="button"
        aria-label="Close live signals"
        onClick={onClose}
        className="band-sheet-scrim"
      />
      <div className="band-sheet">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[13px] leading-snug text-band-dim">
            Everything the band is sending. Anything here can be a trigger.
          </p>
          <button type="button" onClick={onClose} className="band-btn-ghost shrink-0">
            Close
          </button>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between border-b border-band-line py-3">
            <span className="text-[13px] text-band-dim">Heart rate</span>
            <div className="flex items-center gap-3">
              <Sparkline points={trend} />
              <span className="font-mono text-[13px] tabular-nums text-band-data">{hr} bpm</span>
            </div>
          </div>
          <Row
            label="Motion x / y / z"
            value={`${jitter(0.02, 1.4, 0).toFixed(2)}  ${jitter(0.98, 0.6, 2).toFixed(2)}  ${jitter(-0.11, 1.1, 4).toFixed(2)}`}
          />
          <Row label="Battery" value={`${battery}%`} />
          <Row label="Steps" value={`${(8240 + (tick % 7) * 3).toLocaleString()}`} />
          <Row label="Blood oxygen" value={`${jitter(97.6, 0.7, 1).toFixed(1)}%`} />
          <Row label="Button taps" value={`${3 + (tick % 3)} today`} />
          <Row label="Firmware" value="2.4.1" />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-[13px] text-band-dim">Band 04·A7</span>
          <button type="button" className="band-btn-ghost">
            Unpair
          </button>
        </div>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-band-dim">
          Bluetooth frames
        </p>
        <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-band-data">
          {frames.join("\n")}
        </pre>
      </div>
    </div>
  );
}
