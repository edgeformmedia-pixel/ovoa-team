import type { Task } from "@/lib/band-data";

const LABEL: Record<Task["status"], string> = {
  heard: "heard",
  working: "working",
  "needs-you": "needs you",
  done: "done",
  failed: "failed",
};

export function TaskRow({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: (id: string) => void;
}) {
  const live = task.status === "heard" || task.status === "working";

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className={`band-card flex w-full items-center gap-3 px-4 py-3 text-left ${
          task.fresh ? "band-flash" : ""
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] text-band-text">{task.request}</span>
          <span className="block truncate text-[12px] text-band-dim">
            {task.result ?? task.question?.text ?? task.steps.at(-1) ?? "Sent to the band"}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-band-dim">
          {live && <span className="band-pulse h-1.5 w-1.5 rounded-full bg-band-live" />}
          {LABEL[task.status]}
        </span>
      </button>
    </li>
  );
}
