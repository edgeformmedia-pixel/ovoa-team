# OVOA paid early access: setup

This turns ovoa.ai into a place where people pay for OVOA while the iPhone app is still in TestFlight. It's the same model rolltoreel.com (Roll) uses.

**What's sold** (the app, the AI and the Band are all beta; the source of truth is `docs/paywall/SPEC.md` in `ovoa-app`):

| | Price | What it is |
| --- | --- | --- |
| Free | $0 | Health tracking and notes, no AI |
| Base | $9.95/month or $95.99/year | The OVOA assistant. 20 replies a day. |
| Pro | $25.95/month or $195.99/year | Base plus the hands-free wake word and the background agent. 55 replies a day. |
| OVOA Band | $89.99 once | Beta hardware, US shipping. Comes with 7 days of Base that the buyer starts when they choose, or sold on its own ("Band only") |

There's no free trial without a Band: a plan bought on its own is paid from day one.

**The flow:**

```
ovoa.ai/early-access (plans)  →  Stripe Checkout, paid from day one
ovoa.ai/checkout (the Band)   →  Stripe Checkout: the Band is charged and the card is saved for Base
                                 (or "Band only": a one-time payment, nothing saved)
                              →  order email from no-reply@ovoa.ai: "start your 7 free days when your Band arrives"
                              →  they tap Start on their welcome page: Base monthly starts with 7 free days,
                                 and Stripe charges the saved card when those end
        →  ovoa.ai/early-access/welcome  (install TestFlight → join the beta → sign up in the app with the same email)
        →  the app's server asks ovoa.ai which plan that email is on, and unlocks that much
```

**Why the Band's free days wait.** The Band can take weeks to arrive, and 7 free days that start at checkout would be over before it does. So checkout only charges the Band and saves the card. The order email (and the "shipped" email you send with **Mark shipped**) links to their welcome page, where **Start my 7 free days** creates the Base subscription right then, with Stripe's 7-day trial; the first $9.95 is charged 7 days after they tap it. Until they do, they're on the free app and nothing is billed. If they never tap it, Base never starts. The button is a form on the page, not the email link itself, because mail scanners open every link in an email and would otherwise start the free days on their own. Band orders from before Sept 23 were made the old way (the trial started at checkout) and carry on as they are.

The app account has to use the email they paid with. When it doesn't (Apple Pay or Link filled in another address, or they already had an app account), the welcome page has **Use a different email in the app**: the plan moves to that app account, and the paying email goes back to the free app. You can do the same for someone on the admin page (**Set app email** under their email).

**What was built** (all in this repo):

| Page / endpoint | What it does |
| --- | --- |
| `/early-access` | Plans page: Free, Base and Pro columns, a Monthly / Yearly switch, FAQ |
| `/checkout` | The Band, with 7 days of Base or "Band only" |
| `/early-access/welcome` | After checkout: TestFlight steps, Band status, "pay yearly" and "switch to Pro" offers, Manage billing |
| `/early-access/admin` | Your dashboard: revenue, trials, every member, Band orders (Mark shipped), partner payouts, give free Base or Pro |
| `/privacy`, `/terms` | Drafts written from what the app server actually stores. Read them before going live. |
| `/partners` + `/partners/dashboard` | Affiliate program: apply, then each partner gets a private stats page |
| `/api/public/billing/checkout` | Starts a Stripe Checkout. Plain links work: `?plan=base_monthly` (or `base_annual`, `pro_monthly`, `pro_annual`), `?band=1`, `?band=1&ai=0` |
| `/api/public/billing/webhook` | Stripe tells the site about payments, renewals, cancellations, refunds |
| `/api/public/billing/portal` | Stripe's billing page (cancel, change card, invoices) |
| `/api/public/billing/start-trial` | The welcome page's **Start my 7 free days**: makes the Base subscription for a Band bought with Base |
| Emails from no-reply@ovoa.ai | The Band order email (start link) and the "your Band has shipped" email, through Resend (Part E) |
| `/api/public/membership` | Tells the OVOA app's server which plan an email is on (`tier`: free, base or pro) |
| `scripts/stripe-setup.mjs` | Creates the products, prices, webhook and billing portal in Stripe for you |
| `supabase/migrations/…` | `20260922150000_membership.sql` (members, partners, commissions), `20260922200000_tiers_and_band_orders.sql` (plan tiers, Band orders), `20260923120000_member_app_email.sql` (the app email a plan was moved to) and `20260923180000_partner_cpm.sql` (partner CPM rates and logged views) |
| `migrations/…` | The same three for the Cloudflare test Worker's D1 database |

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
| 7-day free trial, card up front | Only with a Band: 7 days of Base, card up front, started when the buyer chooses (the Band ships later). Plans alone are paid from day one; the free app is the way to try OVOA |
| $49/mo or $229/yr, sold as "50% off early access" | Base $9.95/mo or $95.99/yr, Pro $25.95/mo or $195.99/yr, Band $89.99 (you pick the prices, see Step 3) |
| After paying: "open this on your iPhone" handoff page | `/early-access/welcome` with the TestFlight steps |
| Upsells right after checkout: monthly → annual ("nothing charged today") | Monthly → yearly and Base → Pro on the welcome page |
| Affiliates: 10% for 12 months, 90-day cookie, paid monthly via PayPal from $50 | 15% of plan payments for 6 months, $10 (11.11%) per Band, plus a CPM set per partner; 90-day cookie, PayPal monthly from $50 (change in `src/lib/membership/plans.ts`) |
| Free access types (reviewer, beta tester, golden ticket) | "Give free access" on the admin page |

One difference on purpose: Roll shows crossed-out "regular" prices ($588 → $229). OVOA doesn't show a "was" price it never charged. Advertising a fake former price can get you in trouble with the FTC. The pitch is "founding price, kept while you stay a member", which is true: Stripe keeps charging each member the price they signed up at.

---

## Before you start

- [ ] **Read the privacy policy and terms.** Apple asks for a privacy policy before strangers can test (Step 7), and Stripe wants one too. Drafts are at `https://ovoa.ai/privacy` and `https://ovoa.ai/terms` once you publish. They were written from what the app server stores, but they're drafts: read them, and have a lawyer look if you can.
- [ ] **A support inbox at support@ovoa.ai.** The pages tell members to email it for refunds and help.
- [ ] Node installed on your PC (it is, you use it for the app).

---

## Already did the first setup? Move to Base, Pro and the Band

If you set this up before Sept 22 (Monthly, Annual and Founder lifetime), do these in order. Everything stays in Stripe **test mode**. If you're starting fresh, skip this and follow Part A; it has the same steps.

1. **New Stripe prices for ovoa.ai.** From the `ovoa-team` folder, with your `sk_test_` key:

   ```bash
   node scripts/stripe-setup.mjs --key sk_test_XXXX --site https://ovoa.ai --no-keys
   ```

   It makes the Base AI, Pro AI and OVOA Band products and their five prices, and leaves your admin and membership keys alone (`--no-keys`). To change a price, add `--base-monthly`, `--base-annual`, `--pro-monthly`, `--pro-annual` or `--band` with the amount (the old `--monthly`, `--annual` and `--lifetime` are gone).
2. **The same for the test Worker** (Git Bash):

   ```bash
   node scripts/stripe-setup.mjs --key sk_test_XXXX --site https://ovoa-site.ovoa.workers.dev --cloudflare
   ```

   Its database already has the new tables.
3. **Archive the old prices.** Stripe → **Product catalog** → the old OVOA membership product → archive the three `ovoa_member_*` prices (monthly, annual, lifetime). Anyone already on them keeps working and counts as Base.
4. **The new database tables on Lovable.** In the Lovable chat, send exactly:

   > Apply the database migration in supabase/migrations/20260922200000_tiers_and_band_orders.sql exactly as written. Don't change any code.

   Approve the SQL it shows. Then send:

   > Apply the database migration in supabase/migrations/20260923120000_member_app_email.sql exactly as written. Don't change any code.

   and approve that too. Then the partner CPM one:

   > Apply the database migration in supabase/migrations/20260923180000_partner_cpm.sql exactly as written. Don't change any code.

   Until it's applied, everything works except **Set CPM** and **Log views** on the admin page.
5. **Publish.** Lovable → **Publish** → **Update**.
6. **Stripe settings.** Turn on the trial-ending reminder email (Step 2), and check shipping and tax for selling the Band in the US (Step 2, item 5).
7. **App Review's login gets Pro.** Admin page → **Give free access** → the App Review email → **Pro**. Do it for yourself and your testers too, before step 8.
8. **Turn on the app's plan check** (Part C): the same `MEMBERSHIP_API_KEY` on Lovable and on the app's Worker.

---

## Test it first on the Cloudflare Worker (optional, recommended)

Lovable is the real site. There is also a **test copy** of the site on a Cloudflare Worker, **https://ovoa-site.ovoa.workers.dev** (Worker `ovoa-site`), in the admin@ovoa.ai Cloudflare account. It has its own small database (Cloudflare D1, `ovoa-site-db`), so you can buy, cancel and refund with Stripe's **test** cards without touching Lovable.

1. Wrangler needs the **admin@ovoa.ai** Cloudflare account, which is your normal Wrangler login (as of Sept 23). Check with `npx wrangler whoami`; if it shows another account, sign in again and pick **Admin@ovoa.ai's Account**:

```bash
npx wrangler login
```

2. Do Part A's Steps 1 and 2 below (Stripe account and settings), in test mode.
3. Load Stripe into the test Worker. From the `ovoa-team` folder, with your `sk_test_` key:

```bash
node scripts/stripe-setup.mjs --key sk_test_XXXX --site https://ovoa-site.ovoa.workers.dev --cloudflare
```

This does Step 3 for the test Worker and uploads the secrets to it; nothing to paste. Keep the printed lines anyway (the admin key opens the admin page).

4. Give it the TestFlight link once you have one (Step 7), pasting the link when asked. Until then its **Join the OVOA beta** button has nowhere to go:

```bash
npx wrangler secret put TESTFLIGHT_PUBLIC_URL -c wrangler.site.jsonc
```

5. Run Step 8's checks at https://ovoa-site.ovoa.workers.dev/early-access and `/early-access/admin`.

To ship code changes to the test Worker: `npm run cf:deploy`. If a new file shows up in `migrations/`, run `npm run cf:migrate` first.

(Until Sept 23 the test Worker was `edgeformmedia-pixel-ovoa-team` in the Edgeformmedia account, reached with the separate login in `C:/Users/thoma/.wrangler-edgeformmedia`. That login can't reach the new Worker or its database.)

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
5. **The Band is a physical product shipped in the US.** Checkout already asks for a US shipping address and a phone number. Check **Settings → Tax** (Stripe Tax, or decide you'll handle sales tax yourself) and whether you want a shipping rate; right now checkout adds no shipping charge, so the $89.99 has to cover it.

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

It creates three products (Base AI, Pro AI, OVOA Band) and five prices: `ovoa_base_monthly` $9.95, `ovoa_base_annual` $95.99, `ovoa_pro_monthly` $25.95, `ovoa_pro_annual` $195.99 and `ovoa_band` $89.99. To use different prices, add them to the end, for example `--base-monthly 10.95 --pro-annual 199`. The options are `--base-monthly`, `--base-annual`, `--pro-monthly`, `--pro-annual` and `--band`. You can change prices any time later by running it again; existing members keep the price they signed up at.

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

The code is already on GitHub, so Lovable has it. There are three migrations, applied one at a time and in this order. In the Lovable chat, send exactly:

> Apply the database migration in supabase/migrations/20260922150000_membership.sql exactly as written. Don't change any code.

Lovable shows the SQL and an **Approve** button. Approve it. Then send:

> Apply the database migration in supabase/migrations/20260922200000_tiers_and_band_orders.sql exactly as written. Don't change any code.

and approve that too. Then the third:

> Apply the database migration in supabase/migrations/20260923120000_member_app_email.sql exactly as written. Don't change any code.

(The first creates the `members`, `affiliates` and `affiliate_commissions` tables; the second adds each member's plan tier and the `band_orders` table; the third adds the app email a member can move their plan to; the fourth adds each partner's CPM rate and the views logged for it. Nobody can read them from a browser; only the site's server can.)

The Cloudflare test Worker has its own copies in `migrations/`: `npm run cf:migrate` applies any that are missing (all four are applied as of Sept 23).

### Step 6. Publish

In Lovable, click **Publish** (top right), then **Update**. Wait for it to finish, then open https://ovoa.ai/early-access. The plan buttons should say "Get Base" and "Get Pro", and https://ovoa.ai/checkout should say "Continue to payment". If they say "Opening soon", Stripe isn't connected: re-check the `STRIPE_SECRET_KEY` secret and publish again.

### Step 7. Open TestFlight to people outside your team

Right now OVOA is only on your *internal* TestFlight group (team members only). Paying members need an *external* group, which Apple reviews once.

1. Go to https://appstoreconnect.apple.com → **Apps** → **OVOA-APP_TEST** → **TestFlight** tab.
2. In the left sidebar, click **Test Information** and fill in:
   - **Beta App Description:** what OVOA does, in a couple of sentences.
   - **Feedback Email:** `support@ovoa.ai`.
   - **Privacy Policy URL:** `https://ovoa.ai/privacy`.
   - **Beta App Review Information:** your name, phone and email. Tick **Sign-in required** and give Apple a working OVOA app login (make one for them in the app, e.g. `appreview@ovoa.ai` with a password).
   - Save.
   - **Give that login Pro, free.** On the admin page, **Give free access** → the App Review email → **Pro**. Otherwise, once the app checks plans (Part C), App Review sees only the free app and can't try the assistant. Do this before the first external submission.
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

1. Open https://ovoa.ai/checkout on your phone, keep "with 7 days of Base" picked, and tap **Continue to payment**.
2. Pay with the Stripe test card: number `4242 4242 4242 4242`, any future date, any CVC, any ZIP, and a US address.
3. You land on the welcome page. Check:
   - [ ] It says your 7 free days of Base are waiting, and shows the Band order. If emails are on (Part E), the order email from no-reply@ovoa.ai is in your inbox with a **Start my 7 free days** button.
   - [ ] **Start my 7 free days** asks you to confirm, then the page says your free days run until next week's date. In Stripe, the customer now has a Base subscription, trialing, on the card you paid with.
   - [ ] **Join the OVOA beta** opens TestFlight.
   - [ ] The **Pay yearly** offer works (nothing is charged today; Stripe now shows the yearly price starting after the free days).
   - [ ] **Manage billing** opens Stripe's page, where you can cancel.
   - [ ] Under step 3, **Use a different email in the app** saves an address, and the step then names that address.
4. Open https://ovoa.ai/early-access/admin, paste your `OVOA_ADMIN_KEY`. You should see yourself under *Everyone*, status `trialing`, the Band under *Band orders* with Base *Started*, and green dots in *Setup* for Stripe key, webhook, database, public link and emails. Click **Mark shipped** on the Band: the "your Band has shipped" email arrives.
5. In Stripe → **Developers → Webhooks**, open the `ovoa.ai` endpoint. Recent deliveries should all show `200`.
6. Buy **Pro yearly** on https://ovoa.ai/early-access with a second email: no free days, charged today. Then refund the Band in Stripe (**Payments** → the payment → **Refund**). On the admin page the Band order changes to `refunded`.
7. If the app's plan check is on (Part C): sign in to the app with each email and pull to refresh on Settings → Your plan. The Band email says Base (trial), the Pro one says Pro. Cancel one in Manage billing, refresh, and it says Free: health and notes still work, the assistant says it's part of a plan. On the Pro email's welcome page, move the plan to a third email you have an app account for: after Refresh, that account says Pro and the Pro email says Free.

The same run happens automatically on your PC with a fake Stripe: `npm run build && npm run test:billing`.

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
6. Buy Base monthly yourself with a real card, check the welcome page and admin page, then cancel it from Manage billing and refund yourself in Stripe (plans have no free days, so this one is charged).

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

## Part C: the app checks each person's plan (built; one secret turns it on)

This is built (Sept 22). The OVOA app's server (`jarvis/api` in `ovoa-app`) asks the website which plan an email is on:

```
GET https://ovoa.ai/api/public/membership?email=<the user's email>
Authorization: Bearer <MEMBERSHIP_API_KEY>
→ { "tier": "free" | "base" | "pro", "status": "trialing" | "active" | "past_due" | "canceled" | "comp" | "none",
    "trialEndsAt": "..." | null, "renewsAt": "..." | null, "source": "stripe" | "band_trial" | "comp" | "none" }
```

It keeps the answer for 10 minutes, and if ovoa.ai can't be reached it keeps the last answer for a day before treating the person as free. Free people get health and notes; anything else answers "part of a plan" in the app. Base gets the assistant (20 replies a day), Pro adds the wake word and the background agent (55 a day). The app shows no prices or buy buttons during TestFlight (Apple's rule); it says the plan is managed at ovoa.ai and has a Refresh button. Members sign up in the app with the same email they paid with; the welcome page tells them so, and lets them move the plan to a different app email if theirs doesn't match (the membership API answers for the app email, `members.app_email`, when one is set).

**Until the key is set on the app's Worker, everyone is treated as Pro**, so nothing is locked yet. To turn it on, in this order:

- [ ] Lovable has the migrations and is published (the "Already did the first setup?" steps 4 and 5). Check it: https://ovoa.ai/api/public/membership should answer `{"error":"unauthorized"}`, not a "Page not found" page. (Since Sept 23 the Worker keeps each person's last answer when the site answers 404 or nonsense, so an unpublished site can't turn paying members Free. Anyone it has never heard about is Free until it can ask.)
- [ ] Give Apple's review login (Step 7) **Pro** free access on the admin page, or App Review sees only the free app.
- [ ] Give yourself and your team free access too (Pro for anyone who tests the wake word or the agent).
- [ ] `MEMBERSHIP_API_KEY` is in Lovable's secrets (Step 4). Use **the same value** on the Worker, from the `ovoa-app\jarvis\api` folder in Git Bash, pasting it when asked:

  ```bash
  XDG_CONFIG_HOME=C:/Users/thoma/.wrangler-edgeformmedia npx wrangler secret put MEMBERSHIP_API_KEY
  ```

  Never put it in the phone app itself.
- [ ] Open the app, Settings → Your plan → **Refresh**. It should say your plan.

To undo it quickly, delete the secret on the Worker (`npx wrangler secret delete MEMBERSHIP_API_KEY`, same folder and login): everyone is Pro again. For one person, the developer override works too: `PUT /debug/plan` on the Worker with the debug key.

---

## Part D: running the partner program

1. Point creators to https://ovoa.ai/partners. They apply with their name, email, a code (e.g. `maria`) and a PayPal email.
2. Applications appear at the top of the admin page. Click **Approve** (or Reject).
3. In the *Partners* table, click **Copy dashboard link** and email it to them with their share link, `https://ovoa.ai/?ref=maria`. The dashboard shows their clicks, sign-ups, paying members and what they're owed.
4. On the 1st of each month, for everyone owed $50 or more: send the amount through PayPal to their *Pay to* email, then click **Mark paid**.

How it pays out: when someone arrives through `?ref=maria` and buys within 90 days, Maria earns:

- 15% of each of their plan payments (monthly or yearly) for 6 months.
- 11.11% of each Band they buy, which is $10 on an $89.99 Band.
- Her CPM on views of her OVOA posts. Set her rate with **Set CPM** in the *Partners* table (dollars per 1,000 views). When she sends you her view counts, check them and click **Log views**: the payout is added to what she's owed. Each click adds a new line, so log each batch of views once.

Nothing is earned during a free trial ($0), and refunded payments (Bands included) are voided automatically. Partners don't earn on their own purchases. The percentages, months, window and payout minimum are at the top of `src/lib/membership/plans.ts`; to give one partner a different plan rate, change their `percent` in the `affiliates` table.

---

## Part E: emails from no-reply@ovoa.ai (Resend)

Band buyers get two emails from `no-reply@ovoa.ai`: the order email right after they pay, with the link to start their free days, and a "your Band has shipped" email when you click **Mark shipped** (with the start link again if they haven't used it). Replies go to support@ovoa.ai. They're sent through Resend (resend.com; free up to 3,000 emails a month).

1. Sign up at https://resend.com.
2. **Domains → Add Domain** → `ovoa.ai`. Resend shows a few DNS records (an MX and TXT records for SPF and DKIM). Add them where the DNS for ovoa.ai is managed, then click **Verify** in Resend. It usually takes minutes, sometimes a few hours. It must say *Verified*, or Resend can't send as no-reply@ovoa.ai.
3. **API Keys → Create API Key**, permission *Sending access*, domain `ovoa.ai`. Copy it (starts with `re_`).
4. In Lovable → **Cloud → Secrets**, add `RESEND_API_KEY` with it. Publish → Update. For the Cloudflare test Worker: `npx wrangler secret put RESEND_API_KEY -c wrangler.site.jsonc` (already set as of Sept 23).
5. The admin page's *Setup* list shows **Emails from no-reply@ovoa.ai** in green.

Want a different sender? Add the secret `EMAIL_FROM`, e.g. `OVOA <hello@ovoa.ai>`.

Resend only sends. Replies go to support@ovoa.ai, which needs a real inbox: ovoa.ai's MX records go to Zoho Mail (being set up Sept 23), with support@ as an alias of admin@. Don't touch Resend's `send.ovoa.ai` and `resend._domainkey` records when changing mail settings.

Without the key nothing is emailed, and nothing else breaks: buyers still see **Start my 7 free days** on their welcome page right after paying, and the admin page has **Copy start link** on each Band order that hasn't started, to send them yourself (only to that buyer's own address: it opens their order).

---

## Day to day

| You want to… | Do this |
| --- | --- |
| See money and members | `/early-access/admin`, or the Stripe dashboard |
| Refund someone | Stripe → **Payments** → the payment → **Refund**. Their partner's commission is voided. A refunded Band shows `refunded` under *Band orders*, and its free days can no longer be started; if they were already started, Base carries on until you cancel that subscription too. |
| Cancel someone | Stripe → **Customers** → them → the subscription → **Cancel**. They keep access until the end of what they paid for. |
| Ship a Band | Admin page → *Band orders* → the address is there → **Mark shipped**. This emails the buyer that it's on its way, with the button to start their free days if they haven't. |
| Someone lost the link to start their free days | Admin page → *Band orders* → **Copy start link** under *Not started*, then email it to them (only to their own address). |
| Give someone free access | Admin page → **Give free access**, and pick Base or Pro (reviewers, friends, creators) |
| Someone paid but the app says Free | Usually the app account uses another email. Admin page → *Everyone* → **Set app email** under their email → the email they sign in to the app with. They tap Refresh on Settings → Your plan. |
| Change prices | Re-run `node scripts/stripe-setup.mjs --key sk_live_XXXX --site https://ovoa.ai --no-keys --base-monthly 10.95` (or `--base-annual`, `--pro-monthly`, `--pro-annual`, `--band`). The site shows new prices within 5 minutes; existing members keep theirs. |
| Offer a discount code | Stripe → **Products → Coupons** → create a coupon and a *promotion code* (e.g. `LAUNCH20`). Checkout already has a "Add promotion code" box. |
| Change the Band's free days | `BAND_TRIAL_DAYS` in `src/lib/membership/plans.ts` (plans bought alone have none: `NO_BAND_TRIAL_DAYS`) |
| Resend someone's welcome link | Admin page → *Everyone* → **Copy welcome link** under their email, then email it to them (only to the member's own address: it opens their billing). |

---

## Getting your first members

Roll's growth engine is short videos of the product doing its thing, pushed by creators on commission. For OVOA:

1. **Record 5 short clips** of OVOA handling a real, relatable errand ("I'm running late, tell my 3pm", "remind me to call mom when I leave work"). Screen recording plus your voice. Post them on TikTok, Instagram Reels and YouTube Shorts with `ovoa.ai/early-access` in the bio.
2. **Sign 10 micro-creators** (5k to 50k followers in productivity, ADHD, founders, fitness). Give each one free access on the admin page, ask them to apply at `/partners`, and approve them. 15% for 6 months, $10 a Band and a CPM is a strong offer at that size.
3. **Lead with Annual.** It's the highlighted card and the one-click upsell after checkout; each annual member is cash up front and far less churn.
4. **Email your Band buyers** a few days after their Band ships if their free days still say *Not started* on the admin page ("did it arrive? tap Start when you're ready"), and on day 6 of their free days ("they end tomorrow, here's what people use it for"). Their emails are on the admin page. Trial-to-paid conversion is the number that matters most; the admin page shows *In free trial* next to *Paying* so you can watch it.
5. **Lean on the free app.** Health and notes are free with no time limit, so "try it free" is an honest pitch. The upgrade happens when someone wants to talk to it.

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
| `MEMBERSHIP_API_KEY` | Yes | Printed by the script. The same value goes on **both** Lovable and the app's Worker (`wrangler secret put MEMBERSHIP_API_KEY` in `ovoa-app/jarvis/api`, Part C) |
| `RESEND_API_KEY` | Recommended | Resend → API Keys (Part E). Sends the Band emails from no-reply@ovoa.ai |
| `EMAIL_FROM` | No | A different sender than `OVOA <no-reply@ovoa.ai>` |
