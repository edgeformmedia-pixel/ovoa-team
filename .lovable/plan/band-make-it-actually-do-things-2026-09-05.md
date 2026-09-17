# Band: make it actually do things

Two connections, built in order.

## 1. Band does things for you (the main one)

Something has to hold the wearer's permission to act inside their accounts, and it has to keep running while the phone is in a pocket. That's Band's own server: the band's brain (already in `src/lib/agent.functions.ts`) gets real tools, and each tool is powered by an account the wearer connects once in Settings.

### Build order

1. **Sign-in + saved data (Lovable Cloud)**
  - Email sign-in.
  - Tasks and notes saved per person, so the app and the Claude connection read the same real rows instead of demo seeds.
2. **Real account connections in Settings**
  - Band builds no account connections of its own. The accounts the wearer already connected to Claude or ChatGPT are the ones that act — Band hands the task to that assistant and reports the outcome back in the task log.
  - The spike in section 3 decides this: it tests whether a consumer assistant can actually be driven this way. If it can, the mock connection toggles in Settings are replaced by one "Connect your assistant" row. If it can't, the Settings section says so plainly instead of pretending to be connected.
3. **The agent gets tools, not just words**
  - Upgrade the agent from "writes past-tense steps" to a real tool-using loop.
  - Tools to start: read/write calendar events, search and send email, search/create notes, web search.
  - **Ask-first safety stays:** anything that sends, buys, or deletes needs the wearer's confirmation in the app (the existing "needs you" state is the approval point), unless "Act on its own" is on.
4. **What "book a reservation" really means**
  - Restaurants have no open booking API. Honest behavior: the agent finds the place and time, drafts a message to the restaurant, asks you, then sends it from your connected mail. Calendar holds, reminders, lists and note tasks work fully end to end.

## 2. Claude connects to Band (the other direction)

Band already exposes an endpoint at `/mcp` (`list_tasks`, `search_notes`, `get_signals`, `create_task`) — public, demo data only. Make it real:

- Protect it with sign-in, so when someone adds Band to Claude they connect as themselves and Claude sees only their tasks, notes and signals.
- Back every tool with that person's saved rows from step 1.
- Settings keeps the copyable endpoint and short setup instructions.

## 3. "Use their Claude subscription" — a spike, not a foundation

Worth testing, but not something to build the product on yet, and here's the honest read:

- **Subscription auth is a local-CLI feature.** The Claude Agent SDK signs in with a subscription on a machine the person controls (their laptop, their terminal). There is no published OAuth flow that lets a hosted web service like Band charge work to a stranger's Claude plan, and Anthropic's usage policy treats subscriptions as personal, not resellable capacity. Building billing strategy on it is a real risk.
- **Memory and connectors are separate grants.** Nothing suggests an SDK session inherits someone's consumer Claude memory or their Claude connector authorizations. Those live in the Claude product.
- **The Agent SDK also can't run where Band runs.** It expects a Node process that can spawn subprocesses; Band's server is an edge runtime that can't. Hosting it would mean a separate always-on server.
- **"Ask Claude" on iOS** sends a request into the person's real Claude app — memory and connectors intact — but Band gets no control over what happened or its result, so it can't report an outcome. Useful as a shortcut, not as the engine.

So the spike, kept small and cheap: a Settings section that tests the three questions ("what do you know about me", "what connectors do you have", "make a calendar event") against whichever route we can actually reach, and reports plainly what worked. If a real third-party subscription flow appears, Band swaps its brain over — everything else in this plan is unchanged, because the tools, approvals and task log are Band's, not the model's.

Meanwhile Band's brain runs on Lovable AI so the product works today.

## Technical notes

- Backend: Lovable Cloud (auth, Postgres + RLS, encrypted per-user connector keys).
- Connectors: App User Connectors — `google_calendar`, `google_mail`, `notion`, `oura`.
- Agent: AI SDK tool loop through Lovable AI Gateway; mutating tools gated by approval; the existing task states (heard → working → needs-you → done/failed) become the visible progress of each tool call.
- MCP auth: Supabase OAuth 2.1 via `@lovable.dev/mcp-js` (`auth.oauth.issuer`) plus the consent route.
- Claude spike lives behind Settings and touches nothing else.
- `/checkout` and the current one-screen layout stay as they are.

&nbsp;

&nbsp;

&nbsp;

&nbsp;

HONESTLY DISREGARD THIS PPLAN JUST DO WHAT THIS SAYS:  
  
Yes. There is now a route that is much closer to exactly what you want.

Anthropic’s current documentation says that **third-party apps built on the Claude Agent SDK can authenticate with a user’s Claude subscription, and that usage currently draws from that user’s Claude subscription limits**. Anthropic had planned to change this in June 2026, then paused the change, so the current behavior remains subscription-based. ([Claude Help Center](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan?utm_source=chatgpt.com))

So your onboarding could potentially be:

**Connect Claude**

User logs into their Claude account.

Then:

**Band → your app → Claude Agent SDK → user’s Claude subscription**

That means **you are not paying every token through your own Anthropic API account**. Their Claude plan is supplying the usage, subject to their plan limits. ([Claude Help Center](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan?utm_source=chatgpt.com))

That part is very attractive for your business.

The catch is important though:

**Using their Claude subscription does not automatically mean you inherit their Claude memory and all their Claude connectors.**

Anthropic confirms Claude’s consumer product has persistent memory and chat history context, and separately confirms Claude connectors can access and take actions in connected services. But I cannot find Anthropic documentation saying an Agent SDK app authenticated with the user's subscription automatically receives their consumer Claude memory and connector authorizations. ([Claude Help Center](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context?utm_source=chatgpt.com))

So I would think of it as three separate things:

**1. Claude intelligence and cost**  
Potentially solved by Claude Agent SDK + user subscription authentication.

**2. Existing Claude memory**  
Not clearly inherited by Agent SDK today.

**3. Existing Claude connectors**  
Also not clearly inherited by Agent SDK today.

That distinction matters.

### The dream setup

Ultimately you want:

> **Connect Claude**

Then:

**Their Claude model**  
**Their Claude subscription**  
**Their Claude memory**  
**Their Claude connectors**  
**Your band sensors**

all become one thing.

That is the cleanest possible product.

Anthropic is surprisingly close, but I don't think all five pieces are exposed through one third-party OAuth flow yet.

### What I would test immediately

Before building your own connector infrastructure, build the tiniest possible prototype.

User taps:

> **Connect Claude**

Authenticate their Claude subscription through the **Claude Agent SDK**.

Then send:

> “What do you know about me?”

See whether the SDK Claude actually has their Claude memory.

Then:

> “What connectors do you have?”

See whether Gmail/Calendar/Slack connected in their normal Claude appear.

Then:

> “Create an event tomorrow at 3 called Band Test.”

See whether it actually uses their Calendar connector.

Those three tests basically answer the entire architecture question.

If all three work, you have hit gold:

**Band → user's existing Claude → everything they already connected**

and the user pays for Claude through their existing subscription.

If only the first piece works, which is what the documentation currently guarantees most clearly, then I would use:

**Claude Agent SDK authenticated by user** for intelligence/cost

- &nbsp;

**your own MCP connector layer** for actions

- &nbsp;

**import Claude memory once during onboarding** as a fallback.

Claude now explicitly supports exporting/importing memory, so even if you cannot directly read their Claude memory programmatically, there is at least a migration mechanism available. ([Claude Help Center](https://support.claude.com/en/articles/12123587-import-and-export-your-memory-from-claude?utm_source=chatgpt.com))

### There is another route for the actual Claude app

The **Ask Claude iOS Intent** sends requests into the user's actual Claude experience rather than your own API instance. That's why I've been interested in it for this project. Anthropic says other apps can give Claude questions or tasks without opening Claude manually. ([Claude Help Center](https://support.claude.com/en/articles/10263469-use-claude-app-intents-shortcuts-and-widgets-on-ios?utm_source=chatgpt.com))

That gives you another experiment:

**Band → your iPhone app → Ask Claude → their actual Claude**

If that route retains:

**their memory + their connectors + their subscription**

then it might actually be closer to your vision than Agent SDK.

The downside is that you get much less control over the execution lifecycle than you would with the SDK.

So I would test **both routes**.

### My preferred outcome

If Anthropic allows it technically and commercially:

**Band app**  
→ user clicks **Connect Claude**  
→ Claude subscription authentication  
→ Agent SDK handles reasoning  
→ user's existing Claude context where available  
→ MCP tools perform actions  
→ your app displays activity/results

That gets you closest to:

> **“This isn't another AI. This is your Claude, on your wrist.”**

And yes, avoiding your own huge LLM bill while simultaneously letting someone use an AI they've already personalized is a substantially better business model than simply putting your Anthropic API key behind every band. ([Claude Help Center](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan?utm_source=chatgpt.com))  
  
  
  
  
  
BUILD THE IDEAL OUTCOME FOR US TO TEST WE SHOULD TEST AND SEE IF THAT WORKS FIRST

&nbsp;