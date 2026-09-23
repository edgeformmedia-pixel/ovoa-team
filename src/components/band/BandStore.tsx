import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  CONNECTIONS,
  SEED_AUTOMATIONS,
  SEED_NOTES,
  SEED_TASKS,
  type Automation,
  type Connection,
  type Note,
  type Task,
} from "@/lib/band-data";

type Store = {
  tasks: Task[];
  notes: Note[];
  automations: Automation[];
  connections: Connection[];
  customs: { id: string; text: string }[];
  autonomous: boolean;
  hr: number;
  battery: number;
  addTask: (request: string) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  answerTask: (id: string, choice: string) => void;
  addNote: (title: string, transcript: string) => void;
  removeNote: (id: string) => void;
  addAutomation: (title: string, meta: string) => void;
  toggle: (id: string) => void;
  rename: (id: string, title: string) => void;
  remove: (id: string) => void;
  setAutonomous: (v: boolean) => void;
  addCustom: (text: string) => void;
  removeCustom: (id: string) => void;
  connect: (id: string) => void;
  disconnect: (id: string) => void;
};

const BandContext = createContext<Store | null>(null);

export function useBand(): Store {
  const ctx = useContext(BandContext);
  if (!ctx) throw new Error("useBand must be used inside BandProvider");
  return ctx;
}

export function BandProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [notes, setNotes] = useState<Note[]>(SEED_NOTES);
  const [automations, setAutomations] = useState<Automation[]>(SEED_AUTOMATIONS);
  const [connections, setConnections] = useState<Connection[]>(CONNECTIONS);
  const [customs, setCustoms] = useState<{ id: string; text: string }[]>([
    { id: "c1", text: "Keep every reply under two sentences." },
    { id: "c2", text: "Never buzz between 10pm and 7am." },
  ]);
  const [autonomous, setAutonomous] = useState(false);
  const [hr, setHr] = useState(58);
  const [battery] = useState(76);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      setHr((prev) => Math.min(74, Math.max(54, prev + Math.round(Math.random() * 4 - 2))));
    }, 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const unfresh = useCallback((id: string) => {
    timers.current.push(
      setTimeout(
        () => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, fresh: false } : t))),
        900,
      ),
    );
  }, []);

  const addTask = useCallback(
    (request: string) => {
      const id = `t${Date.now()}`;
      setTasks((prev) => [
        { id, request, status: "heard", steps: [], at: "Now", day: "Today", fresh: true },
        ...prev,
      ]);
      unfresh(id);
      return id;
    },
    [unfresh],
  );

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const answerTask = useCallback((id: string, choice: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "done",
              question: undefined,
              steps: [...t.steps, `You picked ${choice}`],
              result: `Done: ${choice}.`,
            }
          : t,
      ),
    );
  }, []);

  const addNote = useCallback((title: string, transcript: string) => {
    const id = `n${Date.now()}`;
    setNotes((prev) => [
      { id, title, transcript, at: "Now", place: "On the band", fresh: true },
      ...prev,
    ]);
    timers.current.push(
      setTimeout(
        () => setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, fresh: false } : n))),
        900,
      ),
    );
  }, []);

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addAutomation = useCallback((title: string, meta: string) => {
    const id = `a${Date.now()}`;
    setAutomations((prev) => [{ id, title, meta, active: true, fresh: true }, ...prev]);
    timers.current.push(
      setTimeout(
        () => setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, fresh: false } : a))),
        900,
      ),
    );
  }, []);

  const toggle = useCallback((id: string) => {
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, active: !a.active, meta: a.active ? "paused" : "running now" } : a,
      ),
    );
  }, []);

  const rename = useCallback((id: string, title: string) => {
    setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, title } : a)));
  }, []);

  const remove = useCallback((id: string) => {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addCustom = useCallback((text: string) => {
    setCustoms((prev) => [{ id: `c${Date.now()}`, text }, ...prev]);
  }, []);

  const removeCustom = useCallback((id: string) => {
    setCustoms((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const connect = useCallback((id: string) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === id && c.state === "available" ? { ...c, state: "connected" } : c)),
    );
  }, []);

  const disconnect = useCallback((id: string) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === id && c.state === "connected" ? { ...c, state: "available" } : c)),
    );
  }, []);

  return (
    <BandContext.Provider
      value={{
        tasks,
        notes,
        automations,
        connections,
        customs,
        autonomous,
        hr,
        battery,
        addTask,
        updateTask,
        answerTask,
        addNote,
        removeNote,
        addAutomation,
        toggle,
        rename,
        remove,
        setAutonomous,
        addCustom,
        removeCustom,
        connect,
        disconnect,
      }}
    >
      {children}
    </BandContext.Provider>
  );
}
