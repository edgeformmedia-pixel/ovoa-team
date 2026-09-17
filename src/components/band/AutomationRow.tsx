import type { Automation } from "@/lib/band-data";

type Props = {
  automation: Automation;
  onToggle: (id: string) => void;
  onEdit?: (id: string) => void;
};

export function AutomationRow({ automation, onToggle, onEdit }: Props) {
  const { title, meta, active, fresh } = automation;

  return (
    <li
      className={`band-card flex items-center gap-3 px-4 py-3 ${fresh ? "band-flash" : ""} ${
        active ? "" : "opacity-45"
      }`}
    >
      <button
        type="button"
        onClick={() => onEdit?.(automation.id)}
        className="min-w-0 flex-1 truncate text-left text-[14px] text-band-text"
      >
        {title}
      </button>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-band-dim">{meta}</span>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={`${active ? "Pause" : "Resume"} ${title}`}
        onClick={() => onToggle(automation.id)}
        className={`band-switch ${active ? "band-switch-on" : ""}`}
      >
        <span className="band-switch-knob" />
      </button>
    </li>
  );
}
