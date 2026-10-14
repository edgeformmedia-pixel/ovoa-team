# Prompt: Is OVOA worth building, and are we too late?

Paste everything below the line into a fresh Claude chat (turn on web search). Fill in
the `[brackets]` first. If you leave one blank, Claude should say what it assumed.

---

You are a skeptical early-stage investor and an operator who has built consumer
subscription products. I'm the founder of OVOA. I need an honest verdict on whether OVOA
is worth my next 6–12 months, and specifically whether we're too late to this market. I'm
not looking for encouragement. If the right answer is "stop" or "pivot", say so plainly,
and show your reasoning so I can check it.

Use web search to check the current state of the market as of today. Don't rely on what
you remember. Cite sources, give dates for any competitor facts, and say clearly when
you're guessing.

## What OVOA is today

- **Product:** a personal AI assistant you text over iMessage. No app is needed to start:
  you text a phone number, get 15 free texts, then a pay link. It's modeled on another
  assistant app (Instinct) and on the "assistant that texts you first" category.
- **What it does:** reminders and routine check-ins it sends first (capped at 12 a day),
  a morning brief, notes and to-dos, Google account connections, group features (polls,
  bill splits, games for two), "watches" that end on their own, memory by text, and it
  builds simple websites for users and their clients at `username.ovoa.ai`, with contact-
  form leads texted to the owner. Anything that sends or deletes waits for the user's YES.
- **Also built, secondary:** an iOS app (TestFlight beta), a wristband ("OVOA Band"), a web
  account page, Spanish/Portuguese/French/German site translation, and an affiliate
  program. Instagram DMs and agent card payments (Stripe Issuing) are built but switched off.
- **Pricing:** Base $9.95/mo (15 replies/day, no background agent), Plus $13.95/mo
  (background agent, 30/day), Pro $25.95/mo (60/day). Usage is shown as "credits".
- **Unit costs:** AI ≈ $0.0015 per reply. The texting line (Sendblue) is a flat $100/mo,
  and it can only message people who texted OVOA first: no cold outbound.
- **Stack/team:** Cloudflare Workers + D1, Stripe live. [team size, e.g. "solo founder
  building with AI coding agents, also running an agency"]
- **Traction (check these numbers yourself before you rely on them):**
  - ~53 active paying Base members as of Sept 27, 2026 [confirm: real paying users? how
    many are friends or family? MRR?]
  - Front-door traffic Sept 27–30: ~30 real visits, 4 taps on "Text OVOA", 2 QR scans
  - 7 trial texters in that window; 4 dropped at an email ask, since removed
  - ovoa.ai doesn't rank for its own name yet. Search results go to "OVO" / OVO AI Labs.
- **Distribution so far:** [e.g. "none paid, word of mouth, a few posts"]
- **My constraints:** runway [months / $], hours per week [n], what I want out of this
  [lifestyle business / venture-scale / learn and sell / portfolio piece], and other
  options I have [e.g. agency work].

## What I want you to do

1. **Map the market today (searched, not from memory).** Who sells an "AI assistant over
   text/iMessage/WhatsApp" or a "proactive personal agent" to consumers right now? Cover
   the startups (Instinct, Poke, and others you find), the big platforms (Apple
   Intelligence/Siri, ChatGPT including its phone/WhatsApp channels and tasks, Gemini,
   Meta AI in WhatsApp/iMessage-adjacent surfaces, Alexa+), and anything that shipped or
   died in the last 12 months. For each one: what it does, price, funding or reach, and
   whether it's growing or stalling.

2. **Answer "are we too late?" directly.** Separate three things:
   - *Category timing:* is this market early, peaking, or being absorbed into the OS and
     the big chat apps? What happened to earlier "AI by text" products?
   - *Platform risk:* how likely is it that Apple, OpenAI, Google or Meta make a $10/mo
     texting assistant pointless within 12–24 months? What would they likely *not* do
     well?
   - *Our position:* given who is already funded and shipping, is there still room for a
     small, unfunded entrant, and where?

3. **Steelman both sides.** Give the strongest honest case that OVOA works, then the
   strongest case that it doesn't. No strawmen.

4. **Pressure-test the business.**
   - Rough unit economics at 100, 1,000 and 10,000 paying users (count Sendblue's line
     limits and cost steps, Stripe fees, AI cost, churn).
   - Is there a realistic acquisition channel for a texting assistant that can't cold-
     message anyone? What do CAC and payback probably look like?
   - Which of the things we've built are actually differentiated, and which are table
     stakes or distractions (Band, app, translation, websites, Instagram, payments)?
   - Brand risk from the name colliding with "OVO".

5. **Find the wedge, if there is one.** Is there a narrower customer for whom OVOA is
   clearly better than ChatGPT, Siri, or a competitor? For example: people who will never
   install another app, small-business owners who need a site and leads by text, Spanish-
   speaking users, families or groups, or a specific profession. Rank the 2–3 best
   wedges and say why.

6. **Give a verdict.** Pick one and commit to it:
   - **Keep going as-is**
   - **Narrow** (name the wedge and what to cut)
   - **Pivot** (to what, and what we can reuse)
   - **Stop** (and what to do with what's been built)

   Include your confidence (low/medium/high) and the 2–3 facts that would most change
   your mind.

7. **Set a 30-day test with kill criteria.** Give me specific, measurable numbers to hit
   by [date 30 days out], for example trial-to-paid %, 30-day retention, weekly active
   texters, and paying users from a channel I don't personally control. Say what result
   means continue and what result means stop. Keep it cheap enough for my constraints.

## Rules

- Be blunt. If my traction numbers are too small to mean anything, say that.
- Don't count features as progress. Judge on users, retention, revenue and distribution.
- Separate facts you found (with source and date) from your own judgment.
- If something important is missing from what I gave you, list your questions at the top,
  then answer anyway using stated assumptions.
- Keep the final answer under ~1,500 words, plus a one-paragraph TL;DR at the very top.
