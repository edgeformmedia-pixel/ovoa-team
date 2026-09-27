// The OVOA blog: short, plain explainers about OVOA and the OVOA Band. Every
// claim here is one the other pages already make (the FAQ, /about, /band);
// prices stay off these pages so they never go stale (they live on /early-access).
// No em dashes anywhere in the copy.

export interface BlogSection {
  heading: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  published: string;
  updated?: string;
  intro: string;
  sections: BlogSection[];
  related: { to: string; label: string }[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "what-is-ovoa",
    title: "What is OVOA? The AI assistant you text or talk to",
    description:
      "OVOA (ovoa.ai) is an AI assistant you text or talk to. It schedules, remembers and follows through, and the OVOA Band brings it to your wrist.",
    published: "2026-09-27",
    intro:
      "OVOA is an AI assistant you text or talk to. You tell it what you want in plain words, it goes and does it, and it tells you when it's done or when it needs you. OVOA lives at ovoa.ai, in your messages, in the OVOA iPhone app, and on your wrist with the OVOA Band.",
    sections: [
      {
        heading: "What OVOA does",
        paragraphs: [
          "Most assistants answer a question and stop there. OVOA is built to follow through. Ask it to schedule something, remind you, send a follow-up or keep track of a detail, and it handles the whole thing from start to finish, then reports back.",
          "It also remembers. Notes are saved word for word and found again the moment you ask. Standing rules keep running in the background and report every time they fire. When a decision is yours, OVOA checks in instead of guessing.",
        ],
      },
      {
        heading: "Text it, talk to it, or wear it",
        paragraphs: [
          "You can text OVOA like you would text a person: open Messages, say hi, and start asking. You can also use the OVOA iPhone app, which is in beta through Apple's TestFlight, and type or speak your request there.",
          "The OVOA Band is a woven wristband with one button. Press it and speak to ask for something, or double-tap it to save a note. The Band answers with buzzes you can feel, so you never need to look at a screen to know where things stand.",
        ],
      },
      {
        heading: "Health, with the Band",
        paragraphs: [
          "The Band senses heart rate and motion all day, and your history shows up in the app alongside Apple Health. Health tracking and notes are free, with no card and no time limit.",
        ],
      },
      {
        heading: "Is OVOA finished?",
        paragraphs: [
          "Not yet. OVOA is in beta: the app, the assistant and the Band are all still being built, and new builds come often. Early members keep their plan's price while they stay members.",
        ],
      },
      {
        heading: "Where to find OVOA",
        paragraphs: [
          "The official website is ovoa.ai. The FAQ covers plans, the beta, the Band and privacy, and support@ovoa.ai reaches the team directly.",
        ],
      },
    ],
    related: [
      { to: "/text", label: "Text OVOA" },
      { to: "/band", label: "OVOA Band V1" },
      { to: "/faq", label: "OVOA FAQ" },
    ],
  },
  {
    slug: "ovoa-band-how-it-works",
    title: "How the OVOA Band works: one button, three ways to ask",
    description:
      "The OVOA Band is a woven AI wristband with one button, heart rate and motion sensing, a microphone and a vibration motor. Here is how tasks, notes, rules and buzzes work.",
    published: "2026-09-27",
    intro:
      "The OVOA Band is a woven wristband you talk to. It has one button, heart rate and motion sensors, a microphone and a vibration motor. Everything else runs quietly in the OVOA app and the OVOA assistant.",
    sections: [
      {
        heading: "Tasks: press and ask",
        paragraphs: [
          "Press the button and say what you want. The Band buzzes once to say it heard you, then OVOA gets to work. When the task is done you feel one long buzz and get a plain English result in the app. If OVOA needs a decision from you, it buzzes three times and asks.",
        ],
      },
      {
        heading: "Notes: double-tap and speak",
        paragraphs: [
          "Double-tap the button and speak. The note is saved word for word, gets a title written for you, and is searchable in the app. Notes are part of OVOA's free plan, and spoken notes are written out on your iPhone, not on OVOA's servers.",
        ],
      },
      {
        heading: "Standing rules",
        paragraphs: [
          "Some requests shouldn't happen once. They should keep happening. OVOA turns them into standing rules that run in the background and report back every time they fire.",
        ],
      },
      {
        heading: "What the buzzes mean",
        paragraphs: [
          "One short buzz: heard you. Two short: on it. Three short: OVOA needs an answer from you. One long: done. Two long: it couldn't finish.",
        ],
      },
      {
        heading: "The hardware",
        paragraphs: [
          "Continuous heart rate, all day motion sensing, a microphone for voice requests and notes, and a vibration motor for answers you can feel. The woven strap is water resistant, so rain, sweat and hand washing are fine, and the battery lasts all day with sensing running.",
          "The OVOA Band is beta hardware, made in small batches, and ships to US addresses.",
        ],
      },
    ],
    related: [
      { to: "/about", label: "About the OVOA Band" },
      { to: "/band", label: "OVOA Band V1" },
      { to: "/checkout", label: "Buy the OVOA Band" },
    ],
  },
  {
    slug: "join-the-ovoa-beta",
    title: "How to join the OVOA beta on iPhone",
    description:
      "OVOA's iPhone app is in beta through Apple's TestFlight. Here is how to get it, what's free, and what happens when OVOA reaches the App Store.",
    published: "2026-09-27",
    intro:
      "OVOA is in beta, and the iPhone app ships through TestFlight, Apple's own app for trying iPhone apps before they reach the App Store. Getting in takes a few minutes.",
    sections: [
      {
        heading: "Step by step",
        paragraphs: [
          "First, install TestFlight from the App Store. Next, open your OVOA invite or beta link on your iPhone and tap Install. Then open OVOA and sign in. From then on OVOA updates itself as new builds ship.",
          "If you'd rather not install anything yet, you can start by texting OVOA from the Text OVOA page.",
        ],
      },
      {
        heading: "What's free",
        paragraphs: [
          "Health tracking (Apple Health, plus heart rate and activity from the Band) and notes are free, with no card and no time limit. The full OVOA assistant is part of the Base and Pro plans, listed on the plans page.",
        ],
      },
      {
        heading: "When OVOA reaches the App Store",
        paragraphs: [
          "Your account and plan come with you. Nothing you set up during the beta is lost.",
        ],
      },
    ],
    related: [
      { to: "/account", label: "Get your beta seat" },
      { to: "/early-access", label: "OVOA plans" },
      { to: "/faq", label: "OVOA FAQ" },
    ],
  },
  {
    slug: "ovoa-privacy-when-it-listens",
    title: "OVOA and privacy: when the Band listens and where your data goes",
    description:
      "When OVOA's microphone listens, what happens to what it hears, and how OVOA handles your data. No background recording, no selling data, no training AI on it.",
    published: "2026-09-27",
    intro:
      "An assistant you can talk to has to be clear about when it listens. Here is how OVOA works.",
    sections: [
      {
        heading: "When the microphone listens",
        paragraphs: [
          "When you ask it to: a press of the Band's button, a double-tap for a note, or the record button in the app. The hands-free wake word and Always listen are the exception, and both are off until you turn them on.",
          "With those on, your iPhone itself listens for the name. What it hears stays on the phone unless you say \"OVOA\" or keep talking in the few seconds after OVOA answers, and then only the words go, never the audio. OVOA never records your day in the background.",
        ],
      },
      {
        heading: "What happens to your data",
        paragraphs: [
          "It's used to run OVOA for you and nothing else. OVOA doesn't sell it, use it for ads or train AI on it, and the app asks before anything goes to an AI company.",
          "After 14 days everything is deleted except a short summary of each day and what you entered or set up yourself, and you can delete your account from the app. The privacy policy has the full details.",
        ],
      },
    ],
    related: [
      { to: "/privacy", label: "Privacy policy" },
      { to: "/faq", label: "OVOA FAQ" },
      { to: "/about", label: "About the OVOA Band" },
    ],
  },
];

export const postPath = (slug: string) => `/blog/${slug}`;

export function postBySlug(slug: string): BlogPost {
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) throw new Error(`No blog post ${slug}`);
  return post;
}
