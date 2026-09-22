# OVOA paid early access: setup

This turns ovoa.ai into a place where people pay for OVOA while the iPhone app is still in TestFlight. It's the same model rolltoreel.com (Roll) uses.

**The flow:**

```
ovoa.ai/early-access  →  Stripe Checkout (7-day free trial, card up front)
        →  ovoa.ai/early-access/welcome  (install TestFlight → join the beta → sign up in the app)
        →  Stripe charges them when the trial ends, every month or year after that
```

**What was built** (all in this repo):

| Page / endpoint | What it does |
| --- | --- |
| `/early-access` | Sales page: 3 plans (Monthly, Annual, Founder lifetime), how it works, FAQ, terms |
| `/early-access/welcome` | After checkout: TestFlight steps, one-click "switch to annual" upsell, Manage billing |
| `/early-access/admin` | Your dashboard: revenue, trials, every member, partner payouts, give free access |
| `/partners` + `/partners/dashboard` | Affiliate program: apply, then each partner gets a private stats page |
| `/api/public/billing/checkout` | Starts a Stripe Checkout (also works as a plain link: `?plan=annual`) |
| `/api/public/billing/webhook` | Stripe tells the site about payments, renewals, cancellations, refunds |
| `/api/public/billing/portal` | Stripe's billing page (cancel, change card, invoices) |
| `/api/public/membership` | Lets the OVOA app's server ask "is this email a paying member?" |
| `scripts/stripe-setup.mjs` | Creates the product, prices, webhook and billing portal in Stripe for you |
| `supabase/migrations/20260922150000_membership.sql` | The members, partners and commissions tables |

The landing page has a new "Get the app" button (top right) and an "Early access" section near the bottom, and the footer links to both new pages. Anyone arriving on any page with `?ref=code` is credited to that partner for 90 days.

**Time:** about 1½ hours of your time, plus Apple's beta review (usually 1 to 2 days, first time only).
**Cost:** nothing up front. Stripe takes 2.9% + 30¢ per successful card charge in the US.

---

## Read this first: Apple's TestFlight rule

Apple's App Review Guideline **2.2** says TestFlight builds can't be given to testers in exchange for payment of any kind. Selling "access to our TestFlight" is exactly what that rule is about. Roll's site sells a subscription to its *service* (their admin code tracks members paying through Stripe *or* the App Store, so the same membership works in both places). This setup does the same:

- What people buy is an **OVOA membership** (the assistant, the AI that runs on your servers). The iPhone beta is how members use it today.
- When OVOA reaches the App Store, members keep their membership: Guideline 3.1.3(b) lets people use a membership bought on your website inside the app, as long as the app also sells it as an in-app purchase. In the US storefront the app may also link out to this web checkout.

This lowers the risk. It doesn't remove it. If Apple decides your paid beta breaks 2.2, the likely outcome is losing TestFlight distribution for the app (worst case, action on the developer account). That call is yours. If you want zero risk, keep TestFlight free and use this checkout only once the app is on the App Store.

---

## How Roll does it (what we copied)

From Roll's live site and code:

| Roll | OVOA (this setup) |
| --- | --- |
| Stripe web checkout, not Apple | Stripe Checkout |
| 7-day free trial, card up front | Same |
| $49/mo or $229/yr, sold as "50% off early access" | $9.99/mo, $99.99/yr, $249 once (you pick the prices, see Step 3) |
| After paying: "open this on your iPhone" handoff page | `/early-access/welcome` with the TestFlight steps |
| Upsells right after checkout: monthly → annual ("nothing charged today"), annual → lifetime | Monthly → annual switch on the welcome page; lifetime sold on the main page |
| Affiliates: 10% for 12 months, 90-day cookie, paid monthly via PayPal from $50 | 20% for 12 months, 90-day cookie, PayPal monthly from $50 (change in `src/lib/membership/plans.ts`) |
| Free access types (reviewer, beta tester, golden ticket) | "Give free access" on the admin page |

One difference on purpose: Roll shows crossed-out "regular" prices ($588 → $229). OVOA doesn't show a "was" price it never charged. Advertising a fake former price can get you in trouble with the FTC. The pitch is "founding price, kept while you stay a member", which is true: Stripe keeps charging each member the price they signed up at.

---

## Before you start

- [ ] **A privacy policy page.** Apple asks for one before strangers can test (Step 7), and Stripe wants one too. The site doesn't have one yet. Use a generator (Termly, iubenda) or ask Claude to draft one from what the app actually collects, and have it at a URL like `https://ovoa.ai/privacy`.
- [ ] **A support inbox at support@ovoa.ai.** The pages tell members to email it for refunds and help.
- [ ] Node installed on your PC (it is, you use it for the app).

---

## Test it first on the Cloudflare Worker (optional, recommended)

Lovable is the real site. There is also a **test copy** of the site on a Cloudflare Worker, **https://edgeformmedia-pixel-ovoa-team.edgeformmedia.workers.dev**, in the Edgeformmedia Cloudflare account. It has its own small database (Cloudflare D1), so you can buy, cancel and refund with Stripe's **test** cards without touching Lovable.

1. Wrangler needs the **Edgeformmedia** Cloudflare account. Your normal Wrangler login is edgeformmarketing, so the commands below use a separate login kept in `C:/Users/thoma/.wrangler-edgeformmedia` (already signed in as of Sept 22). If it ever expires, sign in again with this and pick **Edgeformmedia@gmail.com's Account**:

```bash
XDG_CONFIG_HOME=C:/Users/thoma/.wrangler-edgeformmedia npx wrangler login
```

2. Do Part A's Steps 1 and 2 below (Stripe account and settings), in test mode.
3. Load Stripe into the test Worker. From the `ovoa-team` folder, with your `sk_test_` key:

```bash
XDG_CONFIG_HOME=C:/Users/thoma/.wrangler-edgeformmedia node scripts/stripe-setup.mjs --key sk_test_XXXX --site https://edgeformmedia-pixel-ovoa-team.edgeformmedia.workers.dev --cloudflare
```

This does Step 3 for the test Worker and uploads the secrets to it; nothing to paste. Keep the printed lines anyway (the admin key opens the admin page).

4. Give it the TestFlight link once you have one (Step 7), pasting the link when asked:

```bash
XDG_CONFIG_HOME=C:/Users/thoma/.wrangler-edgeformmedia npx wrangler secret put TESTFLIGHT_PUBLIC_URL -c wrangler.site.jsonc
```

5. Run Step 8's checks at https://edgeformmedia-pixel-ovoa-team.edgeformmedia.workers.dev/early-access and `/early-access/admin`.

To ship code changes to the test Worker: `XDG_CONFIG_HOME=C:/Users/thoma/.wrangler-edgeformmedia npm run cf:deploy`. If a new file shows up in `migrations/`, run `XDG_CONFIG_HOME=C:/Users/thoma/.wrangler-edgeformmedia npm run cf:migrate` first. (These commands work from Git Bash; in PowerShell, run `$env:XDG_CONFIG_HOME="C:/Users/thoma/.wrangler-edgeformmedia"` first.)

When it all works, do Part A for real on Lovable. The test Worker's Stripe webhook is separate from Lovable's (each site address gets its own), so they don't interfere.

---

## Part A: take payments (required)

### Step 1. Create your Stripe account

1. Go to https://dashboard.stripe.com/register and sign up with your business email.
2. Stay in **Test mode** (the toggle at the top right of the dashboard) for now. Nothing real gets charged in test mode.
3. Later, before going live, Stripe asks for your business details, bank account and ID. You can start that now under **Settings → Business → Account details** so it's approved by Step 9.

### Step 2. Four Stripe settings

In the Stripe dashboard (test mode is fine; these settings are shared):

1. **Settings → Business → Public details:** business name `OVOA`, support email `support@ovoa.ai`, website `https://ovoa.ai`. **Statement descriptor:** `OVOA.AI` (what shows on card statements).
2. **Settings → Billing → Subscriptions and emails:**
   - Turn on **Send a reminder email before a free trial ends**. Card networks require a reminder for free trials, and it cuts chargebacks.
   - Turn on **Send emails about upcoming renewals** and **Smart Retries** (retries failed cards automatically).
3. **Settings → Business → Customer emails:** turn on **Successful payments** and **Refunds**, so members get receipts.
4. **Settings → Payments → Payment methods:** make sure **Cards**, **Apple Pay** and **Google Pay** are on. Checkout shows Apple Pay by itself on iPhones.

### Step 3. Run the setup script (test mode)

1. In Stripe, open **Developers → API keys** and click **Reveal test key** next to *Secret key*. Copy it (starts with `sk_test_`).
2. Open a terminal and go to the site repo:

```bash
cd C:\Users\thoma\OneDrive\Documents\GitHub\ovoa-team
```

3. Run this, pasting your key in place of `sk_test_XXXX`:

```bash
node scripts/stripe-setup.mjs --key sk_test_XXXX --site https://ovoa.ai
```

To use different prices, add them to the end, for example `--monthly 14.99 --annual 129 --lifetime 299`. The defaults are $9.99, $99.99 and $249. You can change prices any time later by running it again; existing members keep the price they signed up at.

4. It prints a block like this. **Copy it into your password manager now.** Stripe only shows the webhook secret once.

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OVOA_ADMIN_KEY=4f1c...
MEMBERSHIP_API_KEY=9ab2...
```

(Lost the webhook secret? Run the same command with `--new-webhook` added at the end and it makes a new one.)

### Step 4. Put the secrets into Lovable

1. Open the OVOA project in Lovable.
2. Open **Cloud → Secrets** and add each line from Step 3 as its own secret: the part before `=` is the name, the part after is the value. Four secrets.
   - Can't find it? Type into the Lovable chat: *"Add four secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, OVOA_ADMIN_KEY, MEMBERSHIP_API_KEY"* and it shows a secure box for each. Paste the values there, never into the chat itself.

### Step 5. Create the database tables

The code is already on GitHub, so Lovable has it. In the Lovable chat, send exactly:

> Apply the database migration in supabase/migrations/20260922150000_membership.sql exactly as written. Don't change any code.

Lovable shows the SQL and an **Approve** button. Approve it. (This creates the `members`, `affiliates` and `affiliate_commissions` tables. Nobody can read them from a browser; only the site's server can.)

### Step 6. Publish

In Lovable, click **Publish** (top right), then **Update**. Wait for it to finish, then open https://ovoa.ai/early-access. The plan buttons should say "Start 7-day free trial". If they say "Opening soon", Stripe isn't connected: re-check the `STRIPE_SECRET_KEY` secret and publish again.

### Step 7. Open TestFlight to people outside your team

Right now OVOA is only on your *internal* TestFlight group (team members only). Paying members need an *external* group, which Apple reviews once.

1. Go to https://appstoreconnect.apple.com → **Apps** → **OVOA-APP_TEST** → **TestFlight** tab.
2. In the left sidebar, click **Test Information** and fill in:
   - **Beta App Description:** what OVOA does, in a couple of sentences.
   - **Feedback Email:** `support@ovoa.ai`.
   - **Privacy Policy URL:** your privacy page (see "Before you start").
   - **Beta App Review Information:** your name, phone and email. Tick **Sign-in required** and give Apple a working OVOA app login (make one for them, e.g. `appreview@ovoa.ai` with a password).
   - Save.
3. In the left sidebar next to **External Testing**, click **+** and name the group `Members`.
4. Open the `Members` group → **Builds** → **+** → pick your newest build → write a line in *What to Test* → **Submit for Review**.
5. Wait for the email saying the build is approved (usually within a day or two).
6. Open the `Members` group again → **Public Link** → **Enable Public Link** → copy the link (looks like `https://testflight.apple.com/join/AbCd1234`).
7. Back in Lovable → **Cloud → Secrets**, add `TESTFLIGHT_PUBLIC_URL` with that link. Publish → Update again.

From now on the welcome page shows a **Join the OVOA beta** button that opens this link.

> **New builds:** every build you want members to get has to be added to the `Members` group. To do it automatically, add this under `publishing:` → `app_store_connect:` in the app repo's `codemagic.yaml`:
>
> ```yaml
> submit_to_testflight: true
> beta_groups:
>   - Members
> ```
>
> Apple reviews later builds too, usually much faster than the first. TestFlight builds also expire after 90 days, so keep shipping.

### Step 8. Test the whole thing (still test mode)

1. Open https://ovoa.ai/early-access on your phone and tap **Start 7-day free trial** on Monthly.
2. Pay with the Stripe test card: number `4242 4242 4242 4242`, any future date, any CVC, any ZIP.
3. You land on the welcome page. Check:
   - [ ] It says your trial runs until next week's date.
   - [ ] **Join the OVOA beta** opens TestFlight.
   - [ ] The dark **Switch to annual** box works (tap it, the box disappears, Stripe now shows the annual price starting after the trial).
   - [ ] **Manage billing** opens Stripe's page, where you can cancel.
4. Open https://ovoa.ai/early-access/admin, paste your `OVOA_ADMIN_KEY`. You should see yourself under *Everyone*, status `trialing`, and green dots in *Setup* for Stripe key, webhook, database and public link.
5. In Stripe → **Developers → Webhooks**, open the `ovoa.ai` endpoint. Recent deliveries should all show `200`.
6. Try the Founder plan too, with the same test card, then refund it in Stripe (**Payments** → the payment → **Refund**). On the admin page its status changes to `refunded`.

Bookmark the admin page. It's your control room.

### Step 9. Go live

1. Finish Stripe's account activation (**Settings → Business → Account details**) until the dashboard stops asking for anything.
2. Flip the dashboard to **Live mode** (top right toggle), then do Step 2's settings again if Stripe shows them as separate for live mode.
3. **Developers → API keys**, copy the **live** secret key (starts with `sk_live_`).
4. Run the script again with the live key:

```bash
node scripts/stripe-setup.mjs --key sk_live_XXXX --site https://ovoa.ai --no-keys
```

(`--no-keys` stops it making new admin/app keys; keep the ones you already set.)

5. In Lovable → **Cloud → Secrets**, replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` with the two new live values. Publish → Update.
6. Buy the Monthly plan yourself with a real card, check the welcome page and admin page, then cancel it from Manage billing (you won't be charged during the trial).

**You're taking real money now.** Share https://ovoa.ai/early-access.

---

## Part B: automatic, personal TestFlight invites (optional)

With only the public link, anyone who gets the link can install the beta, paid or not, and cancelling doesn't take it away. Part B fixes that: each member is added to the `Members` group by email (Apple emails them their own invite), and removed when their membership ends or is refunded.

1. App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API** → **Team Keys** → **+**. Name it `OVOA website`, access **App Manager**. Click **Generate**.
2. **Download API Key** (a `.p8` file; Apple only lets you download it once). Note the **Key ID** next to it and the **Issuer ID** at the top of the page.
3. In Lovable → **Cloud → Secrets** add:
   - `ASC_KEY_ID`: the Key ID
   - `ASC_ISSUER_ID`: the Issuer ID
   - `ASC_PRIVATE_KEY`: open the `.p8` file in Notepad and paste all of it, including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
4. Publish → Update. Open the admin page → **Find my TestFlight group ids**. Copy the id next to `Members` (it must say *External*).
5. Add the secret `TESTFLIGHT_GROUP_ID` with that id. Publish → Update.
6. In App Store Connect, open the `Members` group → **Public Link** → **Disable**, and delete the `TESTFLIGHT_PUBLIC_URL` secret in Lovable. (Keep it if you'd rather have a backup link; the welcome page then offers it under "No email?")
7. Test: on the admin page, **Give free access** to a second email of yours. Its TestFlight column should say `invited`, and Apple's email should arrive within minutes. If it says `failed`, the reason is right under it; fix it and press **Retry invite**.

---

## Part C: make the app check for a membership (strongly recommended)

Today the app itself doesn't know who paid. Anyone with a TestFlight invite can use everything, and someone who cancels keeps using it until the build expires. To close that, the OVOA server asks the website before answering:

```
GET https://ovoa.ai/api/public/membership?email=<the user's email>
Authorization: Bearer <MEMBERSHIP_API_KEY>
```

Answer: `{ "active": true, "plan": "annual", "status": "trialing", "trialEndsAt": "...", "renewsAt": "..." }`

The OVOA Worker (`jarvis/api`) would make this call, cache the answer for a few minutes, and when `active` is false show a "Your membership has ended. Renew at ovoa.ai/early-access" screen. Members must sign up in the app with the same email they paid with; the welcome page tells them so.

This isn't wired into the app yet. It touches the app's login and chat code, so it's a separate change: ask Claude *"Gate the OVOA app on the website's membership API (setup.md Part C)"* in the ovoa-app repo. Before you turn it on:

- [ ] Give Apple's review login (Step 7) free access on the admin page, or App Review will be locked out.
- [ ] Give yourself and your team free access too.
- [ ] Put `MEMBERSHIP_API_KEY` into the Worker's secrets. Never put it in the phone app itself.

---

## Part D: running the partner program

1. Point creators to https://ovoa.ai/partners. They apply with their name, email, a code (e.g. `maria`) and a PayPal email.
2. Applications appear at the top of the admin page. Click **Approve** (or Reject).
3. In the *Partners* table, click **Copy dashboard link** and email it to them with their share link, `https://ovoa.ai/?ref=maria`. The dashboard shows their clicks, sign-ups, paying members and what they're owed.
4. On the 1st of each month, for everyone owed $50 or more: send the amount through PayPal to their *Pay to* email, then click **Mark paid**.

How it pays out: when someone arrives through `?ref=maria` and buys within 90 days, Maria earns 20% of each of their payments for 12 months. Nothing is earned during a free trial ($0), and refunded payments are voided automatically. Partners don't earn on their own purchases. The percentage, months, window and payout minimum are at the top of `src/lib/membership/plans.ts`; to give one partner a different rate, change their `percent` in the `affiliates` table.

---

## Day to day

| You want to… | Do this |
| --- | --- |
| See money and members | `/early-access/admin`, or the Stripe dashboard |
| Refund someone | Stripe → **Payments** → the payment → **Refund**. Their partner's commission is voided. A refunded Founder loses access. |
| Cancel someone | Stripe → **Customers** → them → the subscription → **Cancel**. They keep access until the end of what they paid for. |
| Give someone free access | Admin page → **Give free access** (reviewers, friends, creators) |
| Change prices | Re-run `node scripts/stripe-setup.mjs --key sk_live_XXXX --site https://ovoa.ai --no-keys --monthly 12.99`. The site shows new prices within 5 minutes; existing members keep theirs. |
| Offer a discount code | Stripe → **Products → Coupons** → create a coupon and a *promotion code* (e.g. `LAUNCH20`). Checkout already has a "Add promotion code" box. |
| Change the free trial | `TRIAL_DAYS` in `src/lib/membership/plans.ts` (0 turns it off) |
| Resend someone's welcome link | Admin page → *Everyone* → **Copy welcome link** under their email, then email it to them (only to the member's own address: it opens their billing). |

---

## Getting your first members

Roll's growth engine is short videos of the product doing its thing, pushed by creators on commission. For OVOA:

1. **Record 5 short clips** of OVOA handling a real, relatable errand ("I'm running late, tell my 3pm", "remind me to call mom when I leave work"). Screen recording plus your voice. Post them on TikTok, Instagram Reels and YouTube Shorts with `ovoa.ai/early-access` in the bio.
2. **Sign 10 micro-creators** (5k to 50k followers in productivity, ADHD, founders, fitness). Give each one free access on the admin page, ask them to apply at `/partners`, and approve them. 20% for a year is a strong offer at that size.
3. **Lead with Annual.** It's the highlighted card and the one-click upsell after checkout; each annual member is cash up front and far less churn.
4. **Email your trial members** on day 2 ("did you get it installed?") and day 6 ("your trial ends tomorrow, here's what people use it for"). Their emails are on the admin page. Trial-to-paid conversion is the number that matters most; the admin page shows *In free trial* next to *Paying* so you can watch it.
5. **Post a Founders launch.** The $249 lifetime plan is your best early cash. Consider making it limited ("first 100 founders"), then remove it from Stripe once it sells out (archive the lifetime price; the card disappears from the site).

---

## If something's wrong

| Symptom | Fix |
| --- | --- |
| Buttons say "Opening soon" | `STRIPE_SECRET_KEY` missing or wrong, or Step 3 wasn't run with that same key. Fix and publish. |
| Admin page: "The members table isn't there yet" | Step 5 wasn't approved. |
| Admin page: "Wrong admin key" | Paste the exact `OVOA_ADMIN_KEY` value from Lovable. |
| Stripe webhooks show `400 Bad signature` | `STRIPE_WEBHOOK_SECRET` doesn't match the endpoint. Run the script with `--new-webhook`, update the secret, publish. |
| Stripe webhooks show `500` | Usually the database step. The admin *Setup* list shows which part is missing. Stripe retries for 3 days, so fixing it catches up automatically. |
| Welcome page stuck on "Finishing your checkout…" | The payment didn't complete (e.g. a bank check still pending). It fills in once Stripe confirms. |
| TestFlight column says `failed` | Read the reason under it. Common ones: the group is internal (make an external one), no approved build in the group yet, or a mistyped `ASC_*` secret. Fix it, then **Retry invite**. |
| Member says the invite never came | Check spam. Otherwise send them the public link, or Retry invite from the admin page. |

---

## All the secrets

| Name | Required | Where it comes from |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes | Stripe → Developers → API keys (the script prints it back) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Printed by the script |
| `OVOA_ADMIN_KEY` | Yes | Printed by the script; opens `/early-access/admin` |
| `TESTFLIGHT_PUBLIC_URL` | Yes, unless you do Part B | TestFlight → Members group → Public Link |
| `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY`, `TESTFLIGHT_GROUP_ID` | Part B | App Store Connect → Integrations, and the admin page's group finder |
| `MEMBERSHIP_API_KEY` | Part C | Printed by the script; also goes into the Worker's secrets |
