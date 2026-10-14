# OVOA — Full Handoff Prompt (for any AI agent)

**Written:** October 6, 2026. **Owner:** admin@ovoa.ai (Thomas). Replaces the stale Sept 28 handoff.

You are taking over engineering and operations for **OVOA**. Read this whole file, then `AGENTS.md`, `setup.md`, `roadmap.md`. Never paste secrets into chat, code or git.

## 0. Working rules (from the owner)

- **Work autonomously.** Finish jobs and deploy them. Stop only for things only the owner can do: sign-ins, DNS, Apple/Stripe/Meta dashboards.
- **Don't rewrite pushed git history.** Commit small, descriptive messages. Never skip hooks.
- **ovoa.ai runs LIVE Stripe keys.** Never put test keys on `ovoa-site`. 4242-card testing goes on `ovoa-site-test` (it has no Stripe test keys yet).
- **Local smoke-test scripts once overwrote live Stripe secrets.** Before running any script that uploads secrets, check what it uploads.
- **Never cold-text anyone.** The Sendblue plan ($100/mo, inbound_only) can only message people who texted OVOA first.
- **No Lovable.** It was dropped Sept 23. Never suggest Lovable steps.
- **"Instinct"** is the outside app OVOA imitates, not an OVOA name. Don't use it in product copy.
- **Other sessions also deploy `ovoa-app`.** Deploy jarvis only from current `main` HEAD after pulling.
- Windows 11, Git Bash for deploys. Keep temp files out of the repo.

## 1. What OVOA is

An AI assistant you reach **by text (iMessage/SMS)**, plus **OVOA Fit** (a health band, $89.99 one-time) and an iOS app (TestFlight beta). Flow: text OVOA → 15 free texts steered toward a reminder + a website → pay link → `/join` (sign in, link number, Base checkout) → keep texting. OVOA also builds client sites at `username.ovoa.ai/project`, has @usernames and OVOA-to-OVOA messaging, an affiliate program, and agentic features (polls, splits, watches, trip reminders, budgets with YES, memory by text; search via Z.ai). It never pays for things unless the owner turns on Stripe Issuing (shipped OFF).

## 2. Repos and systems

| Thing | Where |
|---|---|
| **This repo `ovoa-team`** | ovoa.ai website + billing + account. Cloudflare Worker `ovoa-site` (`wrangler.site.jsonc`), TanStack Start (React 19, Vite), Tailwind 4 + Radix. D1 `ovoa-site-db` (live), `ovoa-site-test-db`, `ovoa-replay-db` (session replay). Test Worker: `wrangler.test.jsonc`. |
| **`../ovoa-app`** (sibling folder) | iOS app + `jarvis/api` Worker (api.ovoa.ai; texting brain, accounts, Sendblue, Instagram, Issuing). Own D1. Spec: `docs/paywall/SPEC.md`. Codemagic builds TestFlight. |
| **`../admin.ovoa.ai`** | Separate repo/Worker: Zoho inbox, Resend campaigns, support tickets, CRM, affiliate inbox (reads `SITE_DB` binding), website analytics, A/B tab, video studio (#studio, OpenRouter video, files in KV). |
| Cloudflare | Account admin@ovoa.ai. DNS for ovoa.ai; `*.ovoa.ai/*` routes to jarvis-api sites, so **new subdomains need a no-Worker route**. Wildcard DNS live. |
| Others | Stripe (live), Resend (no-reply@ovoa.ai), Zoho Mail (MX), Sendblue (+1 936 520 4027), Google OAuth client in project `ovoa-509511`, Apple App Store Connect, Workers AI (translation), Z.ai (search/prompt help). |

## 3. Deploy (always from Git Bash, this exact login)

```bash
XDG_CONFIG_HOME=C:/Users/thoma/.wrangler-ovoa npm run db:migrate   # only if migrations/ changed
XDG_CONFIG_HOME=C:/Users/thoma/.wrangler-ovoa npm run deploy
```

Before deploying, `npm run test:billing` and `npm run test:account` must pass. The account test needs `ovoa-app` next to this folder. Replay DB: `npm run db:migrate:replay`. Test site: `npm run deploy:test`. Secrets: `npx wrangler secret put NAME -c wrangler.site.jsonc` (list is in `setup.md`). Logs: `npx wrangler tail -c wrangler.site.jsonc`. If login expires, run `wrangler login` and pick admin@ovoa.ai.

## 4. Current state (what's shipped, newest first)

- **Oct 3–6:** Home page (`/`) is now **OVOA Fit**: band front and center (buy, health, one button, buzzes, hardware, price). Text OVOA moved to `/text` and `/imessage`; OVOA Fit tab comes first. Number-only accounts: `/join?id=` signs in the number's own account (no email), then straight to Base checkout; Apple/Google only if linking fails. `/account` shows no email for those. Pages say "your first 15 texts are free". One-tap cancel was built then **reverted** (`/account` has only Manage billing). Video studio in admin.
- **Sept 30:** Web account does all non-phone settings (`/account`: link number, AI consent, Google with tags, assistant, Connections). Apple Pay on (Stripe payment method config; no code). Site translation at `/es|pt|fr|de` via a JSX runtime wrapper (`src/lib/i18n`), Workers AI, `translations` table; refill with `POST /api/i18n/fill?lang=es`. Funnel fixes (one-tap Text OVOA, waitlist, softer email ask) — baseline to recheck. A/B test "angle1" live (A current, B follow-through), read in admin.
- **Sept 28–30:** Credits display (1 credit = $0.00001; Base 300k/mo, Plus 750k, Pro 1.2M — display only). Plus tier $13.95 (Base 15/day, no agent; owner must run stripe-setup for Plus prices). Instagram connector deployed in jarvis (waiting on Meta app ID). Stripe Issuing "OVOA pays" deployed OFF.
- **Sept 26–27:** @usernames, OVOA network, first-party analytics + session replay (not PostHog).
- **Pricing (check `src/lib/membership` and the SPEC as the source of truth):** Free; Base $9.95/mo or $95.99/yr; Plus $13.95; Pro $25.95/mo or $195.99/yr; OVOA Fit $89.99.

## 5. Uncommitted work in this repo right now

`git status` shows modified `src/components/TextButton.tsx` and `src/styles.css` (a small style/button tweak, 1 insertion / 9 deletions). Untracked: `.claude/`, `docs/*` research files (ads, viral video datasets/prompts), and this file. **First action:** `git diff`, decide whether that tweak is intended, build, test, commit, deploy. Don't commit the large CSV/JSON research files unless the owner wants them.

## 6. Open items / next steps

1. Review and ship the uncommitted TextButton/styles change.
2. Recheck the funnel and the A/B test in admin (baseline from Sept 30); the home page just changed to OVOA Fit, so re-baseline conversion.
3. **SEO:** ovoa.ai wasn't found in search as of Sept 23; recheck ~Oct 23. Apple/Google indexing asks are open in `seo-baseline` notes.
4. **Owner-blocked:** Stripe Issuing approval + PCI card access + funding + `pay-setup`; Meta app ID for Instagram; stripe-setup for Plus prices; Stripe test keys for `ovoa-site-test`; App Store Connect secrets + an approved external TestFlight build for invites.
5. Roadmap ideas: files, groups, custom domains for client sites; Plaid, Notion, Issuing; more translation fills.
6. Legal: `/privacy` and `/terms` are drafts and need a lawyer.

## 7. Gotchas

- `.claude/` and `docs/` research files are local only.
- The Stripe webhook secret mismatch gives `400 Bad signature`; fix with `stripe-setup.mjs --new-webhook`.
- "Opening soon" buttons mean Stripe keys are missing on the Worker.
- If the plan shows Free for a payer, the app email differs; use admin → Set app email.
- Text logs: Sendblue inbound is in `text_inbox`; Sept 30 had a lost-text fix, so check there first when texts vanish.
- Prefer `Read` and targeted edits; `src/lib/db.ts` and `package.json` rarely need changing.

## 8. How to start

1. `git status`, `git log -10`, read `AGENTS.md`, `setup.md`.
2. `npm install`, `npm run build`, `npm run test:billing`, `npm run test:account`.
3. Handle section 5, then ask the owner which open item in section 6 to take. Report what shipped, with the live URL you verified.
