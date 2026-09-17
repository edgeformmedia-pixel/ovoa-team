# Band, simplified: one screen, notes in the corner

Right now there are five tabs and most of them don't answer "why did I open this?".
This collapses the app down to what the band actually does.

## The whole app

```text
┌──────────────────────────────────┐
│  ♥ 58   ▌76%              ⚙︎     │  band strip (unchanged)
├──────────────────────────────────┤
│  Today                           │
│                                  │
│  Move my 3pm to 4, tell Sam      │
│  Moved to 4:00pm. Sam knows. ✓   │
│                                  │
│  Order the usual coffee beans    │
│  Which one? ▸ needs you          │
│                                  │
│  Yesterday                       │
│  ...                             │
├──────────────────────────────────┤
│  [ Ask the band to do something ]│  composer, always there
│                      Notes 12 ▸  │  quiet link, bottom corner
└──────────────────────────────────┘
```

One screen. It's a log of what you asked for and what happened. That's it.

- **Tasks are the app.** Grouped by day, newest first. Each row is one line of what you
  said and one line of what came of it. Done rows are calm; ones waiting on you sit at the
  top with a single tappable answer.
- **The composer never moves.** Typing a request is the same thing as clicking the band.
- **Notes are a corner link, not a tab.** Tap it, a sheet slides up with every note,
  newest first, searchable, verbatim, auto-labeled — Pocket's model: capture is one
  gesture, the list is a stream, nothing gets rewritten. Tap a note for the full text.
- **Settings live behind the gear** in the band strip, not in the tab bar: connected
  accounts, buzz meanings, ask-first switch, device info, API key.

Removed: the Rules tab and the Discover tab. Standing rules the band picks up from your
requests ("buzz when my heart rate crosses 178") stay real, but they show as a short
"Always on" list inside Settings instead of owning a tab. The community/Discover browser
goes away for now — it's a growth feature for a product that already works.

## What a finished task looks like

Every task ends in a plain sentence, not a status blob: "Booked Tock, Thurs 7:30, table
for 2." Tap it and you get the steps it took, plus who it messaged or changed. If it
couldn't finish, the row says why in the same voice. A phone notification carries the
same sentence, so the app is only for when you want the detail.

## Connecting Claude — the honest setup

There is no "sign in with Claude" that lets a third-party app borrow your Claude
subscription; Anthropic doesn't offer that. So we don't reinvent anything, we invert the
direction:

1. **The band's own brain does the doing** — always-on, server-side, already wired up. It
   plans a request, uses your connected accounts, and reports back. This is what runs when
   you talk to the band, whether or not your phone or laptop is on.
2. **Claude connects to Band, not the other way around.** Band exposes an MCP endpoint
   plus your API key. You paste one line into Claude Desktop (or any MCP client) and from
   then on Claude can read your tasks, notes and health signals and can create tasks on
   the band. That's the standard, existing plumbing for exactly this — no custom
   integration, and it works with ChatGPT and Cursor too.

Settings gets a "Connect Claude" card showing the endpoint, the key, and a copy button
with the exact config snippet.

## Technical notes

- Routes: `/` becomes the only app screen (task log + composer + notes sheet + settings
  sheet). `/notes`, `/rules`, `/apps`, `/settings` route files are removed; their content
  moves into sheets rendered from the shell. `/checkout` untouched.
- Task rows get day grouping and a one-sentence outcome line; the existing
  `heard → working → needs-you → done/failed` state machine and `runBandRequest` server
  function stay as they are, including the rule branch (rules now surface in Settings).
- Notes sheet reuses the current note list and search; capture stays two-click/simulated.
- New public server route `src/routes/api/public/mcp.ts` implementing an MCP server over
  HTTP with tools: `list_tasks`, `create_task`, `search_notes`, `get_signals`. Caller
  authenticated by the API key in a header; nothing runs before the key is verified.
- Neumorphic style, band strip, live signals, and all motion work stay exactly as-is.
