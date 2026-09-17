# SEO content plan for ovoa.ai

## What the research says

- The site is indexed and crawlable — the gap is content and links, not technical setup.
- This is a brand-new category: keywords like "AI wristband" (~40 searches/month, difficulty 37) and "AI wearable assistant" (difficulty 0, very easy) have low volume but almost no entrenched competition. Early movers can own these terms.
- The realistic near-term win is ranking for: the brand name ("Ovoa", "Ovoa band"), and low-difficulty category phrases ("AI wristband", "AI wearable assistant"). High-volume terms in this space belong to competitors (Plaud, Bee) and are out of reach for now.

## Pages to build

All pages use the existing light, Arial, neumorphic style. Minimal copy, real information only — no invented specs, claims, or testimonials.

### 1. `/about` — What is Band (the main info page)
The page Google and AI tools should learn the product from.
- What Band is: a woven wristband you talk to — say or type what you want and it does it.
- How it works: tasks (ask once, it goes and does it), notes (double-tap, saved word for word), standing rules (keeps running in the background).
- The hardware: heart rate and motion sensing, microphone, vibration motor, one physical button, woven strap, water resistant, all-day battery.
- Haptics: what the buzzes mean (one = heard, two = accepted, three = needs you, long = done).
- The Band app: tasks, notes, health history, connections.
- Price ($99) and a Buy link to `/`.
- Link to it from `/` and `/landing`.

### 2. `/faq` — Questions people actually ask
- Each question as a short section with a plain-English answer: battery, water resistance, how notes/tasks/rules work, what the buzzes mean, privacy (what the mic does), what phones it works with.
- FAQ structured data (JSON-LD) so Google can show the answers directly in search results.

### 3. Small upgrades to existing pages
- `/landing`: add a short "How it works" section (3 steps) and a link to `/about`, so link equity flows through the site.
- Simple text footer on all public pages linking Home / About / FAQ / Buy — internal links are how crawlers find the pages.

## SEO plumbing
- Each new page: unique title (<60 chars), meta description, canonical URL, og tags.
- FAQPage JSON-LD on `/faq`; keep the existing Product JSON-LD on checkout.
- Add `/about` and `/faq` to the sitemap.
- No keyword stuffing — copy stays in the site's plain, minimal voice.

## What I will not do
- No thin/filler pages, no blog farm, no invented specs or reviews.
- No changes to checkout flow or the Band app UI.

## Technical notes
- New routes: `src/routes/about.tsx`, `src/routes/faq.tsx`; edits to `src/routes/landing.tsx`, `src/routes/index.tsx` (footer links), sitemap generator.
- Verified with typecheck + build + Playwright screenshots; sitemap output checked.
