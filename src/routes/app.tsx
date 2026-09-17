import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useBand } from "@/components/band/BandStore";
import { BandStrip } from "@/components/band/BandStrip";
import { Composer } from "@/components/band/Composer";
import { NotesSheet } from "@/components/band/NotesSheet";
import { SignalsSheet } from "@/components/band/SignalsSheet";
import { useAuth } from "@/hooks/useAuth";
import { kickRunner } from "@/lib/kick-runner";
import { setAuthSkipped } from "@/lib/skip-auth";
import {
  answerTask,
  cancelTask,
  createTask,
  getTask,
  listTasks,
  runtimeStatus,
  type TaskRecord,
  type TaskStatus,
} from "@/lib/tasks.functions";

export const Route = createFileRoute("/app")({
  staticData: { sitemap: false },
  component: BandRoute,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Ovoa — ask, and it's done" },
      {
        name: "description",
        content:
          "Ovoa is the app for your agent. Say what you want done, leave it to work, and come back to the real result.",
      },
      { property: "og:title", content: "Ovoa — ask, and it's done" },
      {
        property: "og:description",
        content: "Everything you asked Ovoa for, and what actually came of it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const LABEL: Record<TaskStatus, string> = {
  queued: "received",
  working: "working",
  needs_you: "needs you",
  done: "done",
  failed: "couldn't do it",
  cancelled: "cancelled",
};

// "Couldn't do it" and "can't tell" are different truths, and neither is done.
function statusLabel(task: TaskRecord) {
  if (task.status === "failed" && task.outcome === "uncertain") return "needs checking";
  return LABEL[task.status];
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return "Today";
  if (same(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function groupByDay(tasks: TaskRecord[]) {
  const groups: { day: string; tasks: TaskRecord[] }[] = [];
  for (const task of tasks) {
    const day = dayLabel(task.created_at);
    const last = groups.at(-1);
    if (last && last.day === day) last.tasks.push(task);
    else groups.push({ day, tasks: [task] });
  }
  return groups;
}

function BandRoute() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const lastUserId = useRef<string | null>(null);
  const userId = session?.user.id ?? null;

  // Identity changed (sign-out, or a different account): drop every cached
  // answer so one account can never briefly see another account's activity.
  useEffect(() => {
    if (lastUserId.current !== null && lastUserId.current !== userId) {
      void queryClient.cancelQueries();
      queryClient.clear();
    }
    lastUserId.current = userId;
  }, [userId, queryClient]);

  // Real sign-in clears any earlier testing skip.
  useEffect(() => {
    if (session) setAuthSkipped(false);
  }, [session]);

  // AUTH GATE DISABLED FOR TESTING — uncomment to require sign-in again.
  // useEffect(() => {
  //   if (!loading && !session && !isAuthSkipped()) void navigate({ to: "/auth" });
  // }, [loading, session, navigate]);

  if (loading) {
    return (
      <div className="band-app flex min-h-dvh items-center justify-center">
        <p className="text-[13px] text-band-dim">One moment…</p>
      </div>
    );
  }

  if (!session || !userId) {
    // Testing skip: look around without an account. Nothing is saved.
    return <BandHome key="skipped" userId="skipped" skipped />;
  }

  // Keyed on the account so all account-specific UI state resets on switch.
  return <BandHome key={userId} userId={userId} />;
}

function TaskRow({ task, onOpen }: { task: TaskRecord; onOpen: (id: string) => void }) {
  const live = task.status === "queued" || task.status === "working";
  const line =
    task.result ??
    task.question?.text ??
    task.error ??
    (task.status === "working" ? "Ovoa is working on it" : "Received — waiting to start");

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(task.id)}
        className="band-card flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] text-band-text">{task.request}</span>
          <span className="block truncate text-[12px] text-band-dim">{line}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-band-dim">
          {live && <span className="band-pulse h-1.5 w-1.5 rounded-full bg-band-live" />}
          {statusLabel(task)}
        </span>
      </button>
    </li>
  );
}

function BandHome({ userId, skipped = false }: { userId: string; skipped?: boolean }) {
  const { notes, hr, battery } = useBand();
  const queryClient = useQueryClient();

  const fetchTasks = useServerFn(listTasks);
  const fetchTask = useServerFn(getTask);
  const submitTask = useServerFn(createTask);
  const sendAnswer = useServerFn(answerTask);
  const stopTask = useServerFn(cancelTask);
  const fetchRuntime = useServerFn(runtimeStatus);

  const [draft, setDraft] = useState("");
  const [answer, setAnswer] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [signalsOpen, setSignalsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  // Every cache key carries the signed-in account, so results can never be
  // read back by a different account.
  const tasksKey = ["tasks", userId] as const;
  const runtimeKey = ["runtime", userId] as const;

  const tasksQuery = useQuery({
    queryKey: tasksKey,
    queryFn: () => fetchTasks({}),
    enabled: !skipped,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((t) => t.status === "queued" || t.status === "working")
        ? 2500
        : false,
  });

  const runtime = useQuery({
    queryKey: runtimeKey,
    queryFn: () => fetchRuntime({}),
    enabled: !skipped,
  });

  const detailQuery = useQuery({
    queryKey: ["task", userId, open],
    queryFn: () => fetchTask({ data: { id: open! } }),
    enabled: !skipped && Boolean(open),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "working" ? 2500 : false;
    },
  });

  // One submission key per composed request text, held outside the mutation so
  // a retry after a failed save reuses it and can never start the work twice.
  const submissionKey = useRef<{ request: string; key: string } | null>(null);
  function keyForRequest(request: string) {
    if (submissionKey.current?.request === request) return submissionKey.current.key;
    const key = crypto.randomUUID();
    submissionKey.current = { request, key };
    return key;
  }

  const submit = useMutation({
    mutationFn: async (request: string) => {
      if (skipped) throw new Error("Sign in to send requests — skipping is just for looking around.");
      return submitTask({ data: { request, idempotencyKey: keyForRequest(request) } });
    },
    onSuccess: () => {
      // Show the saved request straight away, then nudge the runner in the
      // background — waiting on the runner would hide the task while it works.
      submissionKey.current = null;
      setDraft("");
      setComposerOpen(false);
      void queryClient.invalidateQueries({ queryKey: tasksKey });
      void kickRunner().then(() => queryClient.invalidateQueries({ queryKey: tasksKey }));
    },
  });

  const reply = useMutation({
    mutationFn: (input: { id: string; answer: string }) => sendAnswer({ data: input }),
    onSuccess: (_data, input) => {
      setAnswer("");
      void queryClient.invalidateQueries({ queryKey: tasksKey });
      void queryClient.invalidateQueries({ queryKey: ["task", userId, input.id] });
      void kickRunner().then(() => {
        void queryClient.invalidateQueries({ queryKey: tasksKey });
        void queryClient.invalidateQueries({ queryKey: ["task", userId, input.id] });
      });
    },
  });

  const cancel = useMutation({
    mutationFn: (id: string) => stopTask({ data: { id } }),
    onSuccess: () => {
      setOpen(null);
      void queryClient.invalidateQueries({ queryKey: tasksKey });
    },
  });

  const tasks = tasksQuery.data ?? [];
  const waiting = tasks.filter((t) => t.status === "needs_you");
  const rest = tasks.filter((t) => t.status !== "needs_you");
  const current = detailQuery.data ?? null;

  return (
    <div className="band-app min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col">
        <header className="sticky top-0 z-20">
          <BandStrip
            hr={hr}
            battery={battery}
            notes={notes.length}
            onOpen={() => setSignalsOpen(true)}
            onNotes={() => setNotesOpen(true)}
          />
        </header>

        <main className="flex flex-1 flex-col px-4 pb-4 pt-4">
          <div className="band-page band-stagger flex-1">
            <h1 className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-band-dim">
              Your activity
            </h1>

            {skipped && (
              <p className="band-card mb-4 px-4 py-3 text-[12px] text-band-dim">
                You're looking around without an account — nothing is saved.{" "}
                <Link to="/auth" className="underline">
                  Sign in
                </Link>{" "}
                to send requests.
              </p>
            )}

            {runtime.data && !runtime.data.connected && (
              <p className="band-card mb-4 px-4 py-3 text-[12px] text-band-dim">
                {runtime.data.message} Requests are still saved and will say plainly that nothing was
                executed.
              </p>
            )}

            {waiting.length > 0 && (
              <section>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-band-dim">
                  Waiting on you
                </h2>
                <ul className="mt-3 space-y-2">
                  {waiting.map((t) => (
                    <TaskRow key={t.id} task={t} onOpen={setOpen} />
                  ))}
                </ul>
              </section>
            )}

            {groupByDay(rest).map((group) => (
              <section key={group.day} className={waiting.length > 0 ? "mt-6" : ""}>
                <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-band-dim">
                  {group.day}
                </h2>
                <ul className="mt-3 space-y-2">
                  {group.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} onOpen={setOpen} />
                  ))}
                </ul>
              </section>
            ))}

            {!tasksQuery.isLoading && tasks.length === 0 && (
              <p className="mt-8 text-[13px] text-band-dim">
                Nothing yet. Tap the plus and tell Ovoa what you want done.
              </p>
            )}
          </div>
        </main>

        <div className="sticky bottom-0 z-10 bg-band-ground/90 px-4 pb-4 pt-2 backdrop-blur">
          {composerOpen ? (
            <div className="band-ask">
              <Composer
                value={draft}
                onChange={setDraft}
                disabled={submit.isPending}
                // The draft stays put until the save succeeds, so a failed
                // save never loses what the user typed.
                onSubmit={(v) => submit.mutate(v)}
              />
              {submit.isError && (
                <p className="mt-2 text-[12px] text-band-dim">
                  {submit.error instanceof Error && submit.error.message
                    ? submit.error.message
                    : "That didn’t save. Your words are still here — try sending again."}{" "}
                  Your words are still here.
                </p>
              )}
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="band-btn-ghost"
                  onClick={() => {
                    setComposerOpen(false);
                    setDraft("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                aria-label="Ask Ovoa to do something"
                onClick={() => setComposerOpen(true)}
                className="band-plus"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M12 5v14M5 12h14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {open && current && (
        <div className="band-sheet-wrap" role="dialog" aria-label={current.request}>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(null)}
            className="band-sheet-scrim"
          />
          <div className="band-sheet">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-band-dim">
              {dayLabel(current.created_at)} · {timeLabel(current.created_at)} ·{" "}
              {statusLabel(current)}
            </p>
            <p className="mt-2 text-[15px] text-band-text">{current.request}</p>

            {current.result && (
              <p className="mt-4 text-[14px] leading-relaxed text-band-text">{current.result}</p>
            )}

            {current.error && !current.result && (
              <p className="mt-4 text-[14px] leading-relaxed text-band-text">{current.error}</p>
            )}

            {(current.events ?? []).length > 0 && (
              <ol className="mt-4 space-y-1.5">
                {(current.events ?? []).map((e) => (
                  <li key={e.id} className="text-[13px] text-band-dim">
                    {e.message}
                  </li>
                ))}
              </ol>
            )}

            {current.status === "needs_you" && current.question && (
              <div className="mt-4">
                <p className="text-[14px] text-band-text">{current.question.text}</p>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!answer.trim()) return;
                    reply.mutate({ id: current.id, answer: answer.trim() });
                  }}
                >
                  <input
                    className="neu-field h-10 min-w-0 flex-1 px-3 text-[13px] outline-none"
                    aria-label="Your answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                  <button type="submit" className="band-btn" disabled={reply.isPending}>
                    {reply.isPending ? "Sending…" : "Send"}
                  </button>
                </form>
              </div>
            )}

            {(current.status === "queued" || current.status === "needs_you") && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="band-btn-ghost"
                  onClick={() => cancel.mutate(current.id)}
                >
                  Cancel this task
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <NotesSheet open={notesOpen} onClose={() => setNotesOpen(false)} />
      <SignalsSheet
        open={signalsOpen}
        onClose={() => setSignalsOpen(false)}
        hr={hr}
        battery={battery}
      />
    </div>
  );
}
