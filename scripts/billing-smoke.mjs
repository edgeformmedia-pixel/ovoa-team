#!/usr/bin/env node
// End-to-end billing check on the local Worker with a fake Stripe. Nothing
// here touches real Stripe or Cloudflare.
//
//   npm run build && node scripts/billing-smoke.mjs
//
// It starts scripts/fake-stripe.mjs, runs scripts/stripe-setup.mjs against it
// (twice, plus a price change, to prove re-runs are safe), gives the Worker a
// fresh local D1 with every migration, starts `wrangler dev --local`, then
// buys, cancels and refunds through the real checkout and webhook routes and
// checks what /api/public/membership answers after each step.

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url);
const STRIPE_PORT = Number(process.env.SMOKE_STRIPE_PORT ?? 12111);
const SITE_PORT = Number(process.env.SMOKE_SITE_PORT ?? 8793);
const STRIPE = `http://127.0.0.1:${STRIPE_PORT}`;
const SITE = `http://127.0.0.1:${SITE_PORT}`;
const API_KEY = "local-membership-key-0123456789";
const ADMIN_KEY = "local-admin-key-0123456789abcdef";
const WHSEC = "whsec_fake_local_only";
const persist = mkdtempSync(join(tmpdir(), "ovoa-billing-smoke-"));
const children = [];
let failures = 0;

// A kept-alive connection can be closed by wrangler while a slow `wrangler d1
// execute` runs between requests; Node then reuses it and gets ECONNRESET.
// Retry once on a fresh connection instead of failing the run.
const rawFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  try {
    return await rawFetch(url, init);
  } catch (error) {
    if (error?.cause?.code !== "ECONNRESET") throw error;
    return rawFetch(url, { ...init, headers: { ...init?.headers, connection: "close" } });
  }
};

const env = { ...process.env, STRIPE_API_BASE: `${STRIPE}/v1`, FAKE_WEBHOOK_SECRET: WHSEC };

function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}${detail === undefined ? "" : `  ${JSON.stringify(detail)}`}`,
  );
}

function sh(cmd) {
  const res = spawnSync(cmd, { shell: true, cwd: ROOT, env, encoding: "utf8" });
  if (res.status !== 0) throw new Error(`${cmd}\n${res.stdout}\n${res.stderr}`);
  return res.stdout;
}

const wranglerLocal = `npx wrangler d1 --config wrangler.site.jsonc`;
const sql = (command) =>
  JSON.parse(
    sh(
      `${wranglerLocal} execute SITE_DB --local --persist-to "${persist}" --json --command "${command.replace(/"/g, '\\"')}"`,
    ),
  )[0].results;

function start(cmd, readyText) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, { shell: true, cwd: ROOT, env });
    children.push(child);
    let out = "";
    const onData = (d) => {
      out += d;
      if (out.includes(readyText)) resolve(child);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => reject(new Error(`${cmd} exited ${code}\n${out}`)));
    setTimeout(() => reject(new Error(`${cmd} not ready\n${out}`)), 90_000);
  });
}

async function membership(email) {
  const res = await fetch(`${SITE}/api/public/membership?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  return res.json();
}

async function checkout(query) {
  const res = await fetch(`${SITE}/api/public/billing/checkout?${query}`, { redirect: "manual" });
  const location = res.headers.get("location") ?? "";
  const sessionId = /\/pay\/(cs_test_\w+)/.exec(location)?.[1];
  if (!sessionId) throw new Error(`checkout ${query} → ${res.status} ${location}`);
  const params = await (await fetch(`${STRIPE}/__sessions/${sessionId}`)).json();
  return { sessionId, params };
}

async function pay(sessionId, email, name = "Test Buyer") {
  const res = await fetch(`${STRIPE}/__complete/${sessionId}`, {
    method: "POST",
    body: JSON.stringify({ email, name, phone: "+15125550100" }),
  });
  if (!res.ok) throw new Error(`pay ${sessionId}: ${await res.text()}`);
  return res.json();
}

const post = (path) => fetch(`${STRIPE}${path}`, { method: "POST" }).then((r) => r.json());

// What the site sent through the fake Resend.
const emailsTo = async (to) =>
  (await (await fetch(`${STRIPE}/__emails`)).json()).data.filter((e) => e.to.includes(to));

// The welcome page's "Start my free days" button.
async function startTrial(sessionId) {
  const res = await fetch(`${SITE}/api/public/billing/start-trial`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `session_id=${sessionId}`,
    redirect: "manual",
  });
  return res.headers.get("location") ?? "";
}

async function portFree(port) {
  try {
    await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
    return false;
  } catch {
    return true;
  }
}

async function main() {
  for (const port of [STRIPE_PORT, SITE_PORT])
    if (!(await portFree(port)))
      throw new Error(`Port ${port} is busy (set SMOKE_SITE_PORT / SMOKE_STRIPE_PORT).`);
  await start(
    `node scripts/fake-stripe.mjs --port ${STRIPE_PORT} --deliver ${SITE}`,
    "fake-stripe]",
  );

  // ---- stripe-setup.mjs: first run, re-run, price change ----
  const setup = (extra = "") =>
    sh(
      `node scripts/stripe-setup.mjs --key sk_test_fake --site https://fake.local.test --no-keys ${extra}`,
    );
  const first = setup();
  check(
    "setup creates 3 products and 5 prices",
    (first.match(/Created product/g) ?? []).length === 3 &&
      (first.match(/Created .* price/g) ?? []).length === 5,
  );
  const again = setup();
  check("setup re-run creates nothing", !/Created|Updated/.test(again));
  const changed = setup("--base-monthly 10.95");
  check(
    "setup price change moves the lookup key",
    /Updated Base monthly price: \$10\.95/.test(changed),
  );
  const back = setup();
  check("setup back to $9.95 moves it again", /Updated Base monthly price: \$9\.95/.test(back));
  const prices = await (await fetch(`${STRIPE}/v1/prices?active=true`)).json();
  const baseMonthly = prices.data.filter(
    (p) => p.product === "ovoa_base" && p.recurring?.interval === "month",
  );
  check(
    "old prices kept, one lookup key holder",
    baseMonthly.length === 3 &&
      baseMonthly.filter((p) => p.lookup_key === "ovoa_base_monthly").length === 1,
    baseMonthly.map((p) => [p.unit_amount, p.lookup_key]),
  );

  // ---- local D1 ----
  sh(`${wranglerLocal} migrations apply SITE_DB --local --persist-to "${persist}"`);
  sql(
    "INSERT INTO affiliates (code, name, email, status, percent, cpm_cents) VALUES ('maria', 'Maria', 'maria@partner.test', 'approved', 15, 500)",
  );
  // A row from before tiers existed: no tier given, so it takes the default.
  sql(
    "INSERT INTO members (email, plan, status) VALUES ('legacy@buyer.test', 'lifetime', 'lifetime')",
  );
  sql(
    "INSERT INTO members (email, plan, tier, status) VALUES ('reviewer@buyer.test', 'comp', 'pro', 'comp')",
  );

  await start(
    [
      `npx wrangler dev -c wrangler.site.jsonc --local --port ${SITE_PORT} --persist-to "${persist}"`,
      `--var STRIPE_API_BASE:${STRIPE}/v1 --var STRIPE_SECRET_KEY:sk_test_fake`,
      `--var STRIPE_WEBHOOK_SECRET:${WHSEC} --var MEMBERSHIP_API_KEY:${API_KEY} --var OVOA_ADMIN_KEY:${ADMIN_KEY}`,
      `--var RESEND_API_KEY:re_fake --var RESEND_API_BASE:${STRIPE}`,
    ].join(" "),
    "Ready on",
  );

  const results = {};
  const plansPage = await fetch(`${SITE}/early-access`);
  check(
    "/early-access renders",
    plansPage.status === 200 && (await plansPage.text()).includes("$9.95"),
  );
  // Every price on the pages comes from Stripe (here, the fake one).
  for (const [path, must] of [
    ["/", ['"price":"89.99"', "LimitedAvailability", "$9.95/month"]],
    ["/checkout", ["$89.99", '"price":"89.99"', "Band only"]],
    ["/faq", ["$25.95/month", "What&#x27;s free?"]],
    ["/privacy", ["14 days"]],
    ["/terms", ["$195.99/year"]],
    ["/llms.txt", ["$89.99", "$95.99/year"]],
  ]) {
    const res = await fetch(`${SITE}${path}`);
    const text = await res.text();
    const missing = must.filter(
      (m) => !text.includes(m.replace("&#x27;", "'")) && !text.includes(m),
    );
    const stale = ["$99<", "$99,", "$9.99", "$19.99", '"99.00"'].filter((m) => text.includes(m));
    check(`${path} shows live prices`, res.status === 200 && !missing.length && !stale.length, {
      status: res.status,
      missing,
      stale,
    });
  }

  // ---- 1. Band + AI: the free days wait until the buyer starts them ----
  {
    const { sessionId, params } = await checkout("band=1&ref=maria");
    check(
      "band+ai: one payment for the Band, card saved for Base",
      params.mode === "payment" &&
        params._items.length === 1 &&
        params.payment_intent_data?.setup_future_usage === "off_session" &&
        !params.subscription_data,
      params,
    );
    check(
      "band+ai: plan and 7 free days kept for later",
      params.metadata?.plan === "base_monthly" && params.metadata?.trial_days === "7",
      params.metadata,
    );
    check(
      "band+ai: US shipping + phone",
      params.shipping_address_collection?.allowed_countries?.[0] === "US" &&
        params.phone_number_collection?.enabled === "true",
    );
    await pay(sessionId, "band-ai@buyer.test");
    results.bandAiWaiting = await membership("band-ai@buyer.test");
    check(
      "band+ai: no plan until the free days are started",
      results.bandAiWaiting.tier === "free" && results.bandAiWaiting.status === "none",
      results.bandAiWaiting,
    );
    const order = sql(`SELECT * FROM band_orders WHERE checkout_session_id = '${sessionId}'`)[0];
    check(
      "band+ai: band order paid, with_ai, shipping",
      order?.status === "paid" &&
        order.with_ai === 1 &&
        order.amount_cents === 8999 &&
        order.ship_state === "TX" &&
        order.phone === "+15125550100",
      order,
    );
    const bandComm = sql(
      `SELECT * FROM affiliate_commissions WHERE source_id = 'band:${sessionId}'`,
    )[0];
    check(
      "band+ai: $10 Band commission",
      bandComm?.amount_cents === 8999 &&
        bandComm.commission_cents === 1000 &&
        bandComm.payment_intent_id === order?.stripe_payment_intent_id,
      bandComm,
    );
    results.bandAiPi = order?.stripe_payment_intent_id;

    const [email, ...more] = await emailsTo("band-ai@buyer.test");
    check(
      "band+ai: one order email from no-reply@ovoa.ai with the start link",
      more.length === 0 &&
        email?.from === "OVOA <no-reply@ovoa.ai>" &&
        email.reply_to === "support@ovoa.ai" &&
        email.text.includes(`/early-access/welcome?session_id=${sessionId}`) &&
        email.text.includes("$9.95 a month on your Visa ending in 4242"),
      email && { from: email.from, subject: email.subject, text: email.text },
    );
    const waitingPage = await (
      await fetch(`${SITE}/early-access/welcome?session_id=${sessionId}`)
    ).text();
    check(
      "band+ai: welcome page offers the free days",
      waitingPage.includes("free days of Base are waiting") &&
        waitingPage.includes("/api/public/billing/start-trial"),
    );

    const started = Date.now();
    const back = await startTrial(sessionId);
    check(
      "band+ai: start, then back to the welcome page",
      back.includes(`/early-access/welcome?session_id=${sessionId}`) && !back.includes("error"),
      back,
    );
    results.bandAi = await membership("band-ai@buyer.test");
    const trialDays = (Date.parse(results.bandAi.trialEndsAt) - started) / 86_400_000;
    check(
      "band+ai: Base trial, 7 days from the start",
      results.bandAi.tier === "base" &&
        results.bandAi.status === "trialing" &&
        results.bandAi.source === "band_trial" &&
        trialDays > 6.9 &&
        trialDays < 7.1,
      { ...results.bandAi, trialDays },
    );
    await startTrial(sessionId);
    const subs = (
      await (
        await fetch(`${STRIPE}/v1/subscriptions?customer=${order?.stripe_customer_id}&status=all`)
      ).json()
    ).data;
    check(
      "band+ai: pressed twice, one subscription, on the saved card, tied to the order",
      subs.length === 1 &&
        subs[0].default_payment_method?.startsWith("pm_") &&
        subs[0].metadata?.checkout_session === sessionId &&
        subs[0].metadata?.ref === "maria",
      subs.map((x) => ({ pm: x.default_payment_method, metadata: x.metadata })),
    );
    const member = sql(`SELECT * FROM members WHERE checkout_session_id = '${sessionId}'`);
    check(
      "band+ai: member row tied to the Band's checkout",
      member.length === 1 && member[0].stripe_subscription_id === subs[0]?.id,
      member,
    );
    const comm = sql(
      `SELECT * FROM affiliate_commissions WHERE member_id = '${member[0]?.id}' AND source_id NOT LIKE 'band:%'`,
    );
    check("band+ai: no plan commission during the trial", comm.length === 0, comm);
    const page = await (await fetch(`${SITE}/early-access/welcome?session_id=${sessionId}`)).text();
    check(
      "band+ai: welcome page renders the membership",
      page.includes("You&#x27;re in") || page.includes("You're in"),
    );
  }

  // ---- 2. Band only ----
  {
    const { sessionId, params } = await checkout("band=1&ai=0&ref=maria");
    check(
      "band only: payment mode, Band only",
      params.mode === "payment" && params._items.length === 1 && !params.subscription_data,
      params._items,
    );
    await pay(sessionId, "band-only@buyer.test");
    results.bandOnly = await membership("band-only@buyer.test");
    check(
      "band only: membership free/none",
      results.bandOnly.tier === "free" &&
        results.bandOnly.status === "none" &&
        results.bandOnly.source === "none",
      results.bandOnly,
    );
    const order = sql(`SELECT * FROM band_orders WHERE checkout_session_id = '${sessionId}'`)[0];
    check(
      "band only: band order paid, no AI",
      order?.status === "paid" && order.with_ai === 0 && order.amount_cents === 8999,
      order,
    );
    const comm = sql(`SELECT * FROM affiliate_commissions WHERE source_id = '${sessionId}'`);
    check("band only: no plan commission", comm.length === 0, comm);
    const bandComm = sql(
      `SELECT * FROM affiliate_commissions WHERE source_id = 'band:${sessionId}'`,
    )[0];
    check(
      "band only: $10 Band commission",
      bandComm?.amount_cents === 8999 && bandComm.commission_cents === 1000,
      bandComm,
    );
    results.bandOnlyPi = order?.stripe_payment_intent_id;
    const page = await (await fetch(`${SITE}/early-access/welcome?session_id=${sessionId}`)).text();
    check(
      "band only: welcome page renders the Band order",
      page.includes("Your Band is on its way") && !page.includes("start-trial"),
    );
    check(
      "band only: no card saved, no order email, nothing to start",
      !params.payment_intent_data?.setup_future_usage &&
        (await emailsTo("band-only@buyer.test")).length === 0 &&
        (await startTrial(sessionId)).includes("error=no-trial"),
    );
  }

  // ---- 3. Base monthly ----
  {
    const { sessionId, params } = await checkout("plan=base_monthly");
    check(
      "base monthly: subscription, no trial, no shipping",
      params.mode === "subscription" &&
        !params.subscription_data?.trial_period_days &&
        !params.shipping_address_collection,
    );
    const s = await pay(sessionId, "base@buyer.test");
    results.base = await membership("base@buyer.test");
    check(
      "base monthly: membership",
      results.base.tier === "base" &&
        results.base.status === "active" &&
        results.base.source === "stripe" &&
        Boolean(results.base.renewsAt) &&
        results.base.trialEndsAt === null,
      results.base,
    );
    results.baseSub = s.subscription.id ?? s.subscription;
  }

  // ---- 4. Pro annual (with a partner) ----
  {
    const { sessionId } = await checkout("plan=pro_annual&ref=maria");
    const s = await pay(sessionId, "pro@buyer.test");
    results.pro = await membership("pro@buyer.test");
    check(
      "pro annual: membership",
      results.pro.tier === "pro" &&
        results.pro.status === "active" &&
        results.pro.source === "stripe",
      results.pro,
    );
    const comm = sql(
      `SELECT * FROM affiliate_commissions WHERE source_id = '${s.invoice.id ?? s.invoice}'`,
    )[0];
    check(
      "pro annual: 15% commission",
      comm?.amount_cents === 19599 && comm.commission_cents === 2940,
      comm,
    );

    // Signs in to the app with another email: the welcome page moves the plan.
    sql("UPDATE members SET app_email = 'pro-app@buyer.test' WHERE email = 'pro@buyer.test'");
    const moved = await membership("pro-app@buyer.test");
    const payer = await membership("pro@buyer.test");
    check(
      "app email: the plan goes to the app account, not the paying email",
      moved.tier === "pro" && moved.status === "active" && payer.tier === "free",
      { moved, payer },
    );
    sql("UPDATE members SET app_email = NULL WHERE email = 'pro@buyer.test'");
    const back = await membership("pro@buyer.test");
    check("app email: cleared, back on the paying email", back.tier === "pro", back);
  }

  // ---- 5. Cancel ----
  {
    await post(`/__cancel/${results.baseSub}`);
    results.canceled = await membership("base@buyer.test");
    check(
      "cancel: membership",
      results.canceled.tier === "free" &&
        results.canceled.status === "canceled" &&
        results.canceled.source === "stripe",
      results.canceled,
    );
  }

  // ---- 6. Refunds ----
  {
    await post(`/__refund/${results.bandOnlyPi}`);
    await post(`/__refund/${results.bandAiPi}`);
    const orders = sql("SELECT email, status FROM band_orders ORDER BY email");
    check(
      "refund: both Band orders refunded",
      orders.every((o) => o.status === "refunded"),
      orders,
    );
    const bandComms = sql(
      "SELECT source_id, status FROM affiliate_commissions WHERE source_id LIKE 'band:%'",
    );
    check(
      "refund: both Band commissions voided",
      bandComms.length === 2 && bandComms.every((c) => c.status === "void"),
      bandComms,
    );
    results.afterRefundBandAi = await membership("band-ai@buyer.test");
    results.afterRefundBandOnly = await membership("band-only@buyer.test");
    check(
      "refund: Band+AI keeps its trial until cancelled",
      results.afterRefundBandAi.tier === "base" && results.afterRefundBandAi.status === "trialing",
      results.afterRefundBandAi,
    );
  }

  // ---- Old rows, comp, errors ----
  results.legacy = await membership("legacy@buyer.test");
  check(
    "legacy lifetime → base, no end date",
    results.legacy.tier === "base" &&
      results.legacy.status === "active" &&
      results.legacy.renewsAt === null,
    results.legacy,
  );
  results.comp = await membership("reviewer@buyer.test");
  check(
    "comp pro",
    results.comp.tier === "pro" && results.comp.status === "comp" && results.comp.source === "comp",
    results.comp,
  );
  const unauthorized = await fetch(`${SITE}/api/public/membership?email=a@b.co`);
  check("membership without key → 401", unauthorized.status === 401);

  console.log("\nMembership API answers:");
  for (const [k, v] of Object.entries(results))
    if (typeof v === "object") console.log(`  ${k}: ${JSON.stringify(v)}`);
}

main()
  .catch((e) => {
    failures++;
    console.error(e);
  })
  .finally(() => {
    for (const c of children) {
      if (process.platform === "win32") spawnSync(`taskkill /pid ${c.pid} /T /F`, { shell: true });
      else c.kill();
    }
    try {
      rmSync(persist, { recursive: true, force: true });
    } catch {
      /* Windows may still hold the SQLite file for a moment */
    }
    console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
    process.exit(failures ? 1 : 0);
  });
