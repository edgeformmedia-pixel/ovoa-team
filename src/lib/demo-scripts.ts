import type { DemoStep } from "@/components/OvoaIphoneDemo";

// Silent iPhone conversations for the landing page showcases.
// Keep these module-level so each demo gets a stable script.

export const TASKS_SCRIPT: DemoStep[] = [
  { who: "me", wait: 0, dur: 3.2, text: "Find a time for coffee with Sam next week and send the invite." },
  { who: "ovoa", wait: 0.8, dur: 2, text: "Sam’s free Tuesday at 10 or Thursday at 2. Which works for you?" },
  { who: "me", wait: 2.4, dur: 0.9, text: "Tuesday" },
  {
    who: "ovoa", wait: 0.6, dur: 1.8,
    text: "Invite sent. I added the café address and I’ll remind you 20 minutes before.",
  },
];

export const RULES_SCRIPT: DemoStep[] = [
  { who: "me", wait: 0, dur: 2.8, text: "Every weekday at 7, give me a quick brief of my day." },
  {
    who: "ovoa", wait: 0.8, dur: 2.2,
    text: "You got it. Here’s tomorrow: 3 meetings, first at 9:30. Rain after 4, so bring a jacket. And it’s Maya’s birthday.",
  },
  { who: "me", wait: 3.2, dur: 0.9, text: "Perfect 🙌" },
  {
    who: "ovoa", wait: 0.6, dur: 1.6,
    text: "Saved as a standing rule. It runs every weekday. Pause or change it anytime.",
  },
];

export const NOTES_SCRIPT: DemoStep[] = [
  {
    who: "me", wait: 0, dur: 3.4,
    text: "Remember the gate code at Mom’s is 4471 and the spare key is under the blue pot.",
  },
  { who: "ovoa", wait: 0.8, dur: 1.4, text: "Saved, word for word." },
  { who: "me", wait: 2.8, dur: 1.8, text: "What’s the gate code at Mom’s again?" },
  { who: "ovoa", wait: 0.6, dur: 1.4, text: "4471. The spare key is under the blue pot." },
];

export const HEALTH_SCRIPT: DemoStep[] = [
  { who: "me", wait: 0, dur: 2.2, text: "How was my heart rate on this morning’s run?" },
  {
    who: "ovoa", wait: 0.8, dur: 2,
    text: "Averaged 148 bpm and peaked at 171 on the last hill. You were back under 100 two minutes after you stopped.",
  },
  { who: "me", wait: 3, dur: 1.6, text: "Nice. Remind me to stretch tonight." },
  { who: "ovoa", wait: 0.6, dur: 1.4, text: "Done. I’ll buzz your Band at 8." },
];
