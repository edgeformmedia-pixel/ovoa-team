export type Automation = {
  id: string;
  title: string;
  meta: string;
  active: boolean;
  fresh?: boolean;
};

export type TaskStatus = "heard" | "working" | "needs-you" | "done" | "failed";

export type Task = {
  id: string;
  request: string;
  status: TaskStatus;
  steps: string[];
  question?: { text: string; options: string[] } | undefined;
  result?: string | undefined;
  at: string;
  day: string;
  fresh?: boolean;
};

export type Note = {
  id: string;
  title: string;
  transcript: string;
  at: string;
  place: string;
  fresh?: boolean;
};

export type Connection = {
  id: string;
  name: string;
  detail: string;
  state: "connected" | "available" | "hardware";
};

export const BUZZES: { pattern: string; means: string }[] = [
  { pattern: "one short", means: "heard you" },
  { pattern: "two short", means: "on it" },
  { pattern: "three short", means: "I need you" },
  { pattern: "one long", means: "done" },
  { pattern: "two long", means: "couldn't do it" },
];

export const SEED_AUTOMATIONS: Automation[] = [
  { id: "a1", title: "Zone 5 warning", meta: "2h ago", active: true },
  { id: "a2", title: "Sprint pacer", meta: "84x today", active: true },
  { id: "a3", title: "Silent wake window", meta: "paused", active: false },
  { id: "a4", title: "Lights on triple tap", meta: "3x today", active: true },
];

export const SEED_TASKS: Task[] = [
  {
    id: "t1",
    request: "Move my 3pm to 4 and let Sam know",
    status: "done",
    steps: ["Found 3pm — Design review", "Moved to 4:00pm", "Texted Sam"],
    result: "Moved to 4:00pm. Sam knows.",
    at: "9:41",
    day: "Today",
  },
  {
    id: "t2",
    request: "Order the usual coffee beans",
    status: "needs-you",
    steps: ["Found two past orders"],
    question: { text: "Which one?", options: ["Ethiopian, 1kg", "House blend, 500g"] },
    at: "9:12",
    day: "Today",
  },
  {
    id: "t3",
    request: "Summarise what I noted after the run",
    status: "done",
    steps: ["Read 1 note from 7:04"],
    result: "Legs felt heavy on the second lap. You want an easier Thursday.",
    at: "8:20",
    day: "Yesterday",
  },
];

export const SEED_NOTES: Note[] = [
  {
    id: "n1",
    title: "After the run",
    transcript:
      "Legs felt heavy on the second lap, way more than last week. Make Thursday easier, keep the sprint block short.",
    at: "7:04",
    place: "Riverside path",
  },
  {
    id: "n2",
    title: "Idea for the Tuesday meeting",
    transcript:
      "Open with the churn number instead of the roadmap. Nobody argues with the roadmap once they've seen it.",
    at: "Yesterday 18:22",
    place: "Home",
  },
  {
    id: "n3",
    title: "Groceries",
    transcript: "Olive oil, the good coffee, something for Friday.",
    at: "Yesterday 11:05",
    place: "Kitchen",
  },
];

export const CONNECTIONS: Connection[] = [
  { id: "calendar", name: "Calendar", detail: "Read and move events", state: "connected" },
  { id: "mail", name: "Mail", detail: "Read and send", state: "connected" },
  { id: "notion", name: "Notion", detail: "Write to your pages", state: "available" },
  { id: "messages", name: "Messages", detail: "Send texts", state: "available" },
  { id: "music", name: "Music", detail: "Play and skip", state: "available" },
  { id: "lights", name: "Lights", detail: "Arrives with the band", state: "hardware" },
];

