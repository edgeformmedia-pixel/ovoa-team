# Band: tasks, notes, health

## First, the Claude question

There is no "sign in with Claude" or "sign in with ChatGPT" for third-party apps —
Anthropic and OpenAI don't offer it, and a consumer subscription can't power another
product. So the band gets its **own** brain, running on our server, always on, nothing
for the user to connect. What the user connects is **their accounts** (calendar, mail,
notes, tasks) — one tap each, same feel as signing into Claude. Those connections are
what makes it Manus-like: the agent has real places to act.

## The band's three jobs

1. **Tasks** — one click. You talk, it goes and does the thing.
2. **Notes** — two clicks. It listens until you click again. Never summarized away.
3. **Health** — always on in the background, never a page you visit.

Everything in the app organizes around those three.

## What one click actually does, end to end

```text
click ──► buzz once, band is listening
say it ──► "text Sam I'm running 10 late and move my 3pm to 4"
release ──► buzz twice, accepted
              │
              ├─ agent plans it, does what it can from your connections
              │
              ├─ needs you? ──► buzz-buzz-buzz + phone notification
              │                  "Two Sams. Which one?"  → one tap answer
              │
              └─ done ──────► buzz once, long
                              phone notification: "Texted Sam. Moved 3pm to 4."
```

Rules that make this feel good:

- **Every request lands somewhere.** It appears in the app as a task with live status
  (heard → working → needs you → done), so nothing ever silently vanishes.
- **Buzz vocabulary is fixed and small**, so you learn it in a day: one short = heard,
  two short = accepted, three = I need you, one long = done, two long = failed.
- **The band never reads results aloud.** It buzzes; the phone carries the words.
- **Ambiguity is a question, not a failure.** One tappable choice on the phone, and the
  task resumes.
- **Anything that spends money, sends a message, or deletes something asks first** by
  default. That's one switch in Settings, off by default.

## What two clicks does

Buzz once, it records. Click again, buzz twice, saved. The note goes in verbatim with
time and place, and the agent gets a one-line title for it. Nothing is deleted or
rewritten. Notes are also the **knowledge base**: the agent searches them when doing
tasks, so "what did I say about the Tuesday meeting" and "add what I noted to my
calendar" both work.

## How the app is organized

Five tabs, same neumorphic style, band strip stays pinned on top.

| Tab | What it is |
| --- | --- |
| **Tasks** | Home. What the band is doing and did. Live status, questions to answer, the composer for typing a task instead of talking. |
| **Notes** | Every voice note, newest first. Search across all of them. Tap for the verbatim transcript. |
| **Automations** | Standing rules (the current list) — the things that run without you asking. |
| **Discover** | Automations and task recipes other people made, installable. |
| **Settings** | Accounts to connect, buzz patterns, autonomy switch, profile, API key, band info. |

Health has no tab, by design. It's live in the band strip, deep in Settings for raw
signals, and answerable any time by asking. The moment there's a sleep page and a
training page, this is Fitbit.

Chat isn't a tab either — the box lives on Tasks, because a typed request *is* a task.

## What gets built in this step

- **Tasks tab** replacing Chat as the home: task list with real status, a task detail
  view, the question-answer flow, and the composer.
- **Notes tab**: list, search, detail. Seeded so it looks lived-in.
- **Settings tab**: real account connections (OAuth, one tap), buzz pattern reference,
  autonomy switch, and the existing profile/API key content folded in.
- **Automations and Discover** keep what they have, renamed and reordered.
- **Sign in** — a minimal one-screen email sign-in, since connecting a real account
  requires knowing who the user is.
- **The agent becomes real**: typed or spoken requests go to the actual agent, which can
  search notes, read/write connected accounts, and browse the web.

Nothing about the checkout page, the neumorphic system, the band strip, live signals, or
the motion work changes.

## Technical notes

- Lovable Cloud for email auth plus tables for tasks, task steps, notes, and each
  user's encrypted connector keys.
- Per-user OAuth through Lovable's App User Connector gateway: server fn starts consent,
  popup returns a one-time code, a second server fn exchanges and stores the key. All
  provider calls server-side only. Starting connectors: Google Calendar, Gmail, Notion,
  Oura.
- Agent runs in a TanStack server route on the Lovable AI Gateway with the AI SDK,
  streaming, tools per connected service plus note search and web search. Mutating tools
  gated by the autonomy switch.
- Band clicks, buzzes, and phone notifications are simulated in the app until hardware
  exists — the task state machine is real so the firmware can drive it later.
