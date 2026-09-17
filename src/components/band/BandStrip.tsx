import { Link } from "@tanstack/react-router";

type Props = {
  hr: number;
  battery: number;
  notes: number;
  onOpen: () => void;
  onNotes: () => void;
};

export function BandStrip({ hr, battery, notes, onOpen, onNotes }: Props) {
  return (
    <div className="flex w-full items-center gap-2 border-b border-band-line bg-band-ground/90 px-4 py-3 backdrop-blur">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="band-pulse h-2 w-2 shrink-0 rounded-full bg-band-live" />
        <span className="truncate text-[13px] text-band-text">Band connected</span>
        <span className="ml-auto hidden items-center gap-3 font-mono text-[12px] text-band-data tabular-nums sm:flex">
          <span>{hr} bpm</span>
          <span>{battery}%</span>
        </span>
      </button>

      <button type="button" onClick={onNotes} className="band-btn-ghost shrink-0">
        Notes {notes}
      </button>

      <Link to="/settings" aria-label="Settings" className="band-btn flex shrink-0 items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="hidden sm:inline">Settings</span>
      </Link>
    </div>
  );
}
