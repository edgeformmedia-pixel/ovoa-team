#!/usr/bin/env node
// Sets up Stripe for OVOA in one go:
//   - one product per thing: Base AI, Pro AI, and the OVOA Band
//   - five prices, found by the site through lookup keys:
//       ovoa_base_monthly $9.95/month    ovoa_base_annual $95.99/year
//       ovoa_pro_monthly  $25.95/month   ovoa_pro_annual  $195.99/year
//       ovoa_band         $89.99 once
//   - the webhook that keeps members in sync (prints its signing secret)
//   - customer portal settings (so members can cancel and change cards)
// and prints every secret to paste into Lovable.
//
//   node scripts/stripe-setup.mjs --key sk_test_... --site https://ovoa.ai
//
// Options: --base-monthly 9.95 --base-annual 95.99 --pro-monthly 25.95
//          --pro-annual 195.99 --band 89.99  (USD; these are the defaults)
//          --new-webhook   replace the webhook and print a fresh secret
//          --no-keys       don't make new OVOA_ADMIN_KEY / MEMBERSHIP_API_KEY values
//          --cloudflare    also upload the secrets to the Cloudflare test Worker
//                          (use with --site https://edgeformmedia-pixel-ovoa-team.edgeformmedia.workers.dev)
//
// Safe to run again: it reuses what exists and only creates what's missing.
// A changed price creates a new Stripe price and moves the lookup key to it
// (transfer_lookup_key); the old price is left alone, so people already
// subscribed keep what they pay today. The old ovoa_member_* prices and the
// ovoa_membership product aren't touched; the site still reads them as Base.

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

const API = process.env.STRIPE_API_BASE ?? "https://api.stripe.com/v1";
const API_VERSION = "2024-06-20";
const PRODUCTS = [
  {
    id: "ovoa_base",
    name: "OVOA Base AI",
    description: "The OVOA assistant: chat, voice, reminders, email, calendar, memory. Beta.",
  },
  {
    id: "ovoa_pro",
    name: "OVOA Pro AI",
    description:
      "Everything in Base, plus the hands-free wake word, the background agent and a bigger daily allowance. Beta.",
  },
  {
    id: "ovoa_band",
    name: "OVOA Band",
    description: "The OVOA wristband (beta hardware). Comes with 7 days of Base AI.",
  },
];
const EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "charge.refunded",
];

function args() {
  const out = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[a.slice(2)] = true;
    else out[a.slice(2)] = argv[++i];
  }
  return out;
}

function encode(params, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v))
      v.forEach((item, i) =>
        typeof item === "object"
          ? encode(item, `${key}[${i}]`, out)
          : out.append(`${key}[${i}]`, String(item)),
      );
    else if (typeof v === "object") encode(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

let SECRET = "";

async function stripe(method, path, params) {
  const form = params ? encode(params).toString() : "";
  const url = method === "GET" && form ? `${API}${path}?${form}` : `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Stripe-Version": API_VERSION,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? form : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error?.message ?? `Stripe returned ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

const cents = (usd) => Math.round(Number(usd) * 100);
const say = (s = "") => console.log(s);

async function main() {
  const opts = args();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  SECRET =
    String(opts.key ?? "").trim() ||
    (await rl.question("Stripe secret key (sk_test_... or sk_live_...): ")).trim();
  let site =
    String(opts.site ?? "").trim() ||
    (await rl.question("Your live site address [https://ovoa.ai]: ")).trim();
  rl.close();
  site = (site || "https://ovoa.ai").replace(/\/+$/, "");

  if (!/^(sk|rk)_(test|live)_/.test(SECRET))
    throw new Error("That doesn't look like a Stripe secret key (sk_test_... or sk_live_...).");
  if (!/^https:\/\//.test(site))
    throw new Error(
      "The site address must start with https:// (Stripe won't send webhooks to http).",
    );
  const live = SECRET.includes("_live_");

  const account = await stripe("GET", "/account");
  say(
    `\nStripe account: ${account.settings?.dashboard?.display_name ?? account.business_profile?.name ?? account.id} (${live ? "LIVE" : "test"} mode)`,
  );

  // ---- Products ----
  for (const p of PRODUCTS) {
    try {
      const product = await stripe("GET", `/products/${p.id}`);
      if (!product.active) await stripe("POST", `/products/${p.id}`, { active: true });
      say(`✓ Product exists: ${product.name}`);
    } catch (e) {
      if (e.status !== 404) throw e;
      await stripe("POST", "/products", p);
      say(`✓ Created product: ${p.name}`);
    }
  }

  // ---- Prices ----
  const wanted = [
    {
      key: "ovoa_base_monthly",
      product: "ovoa_base",
      nickname: "Base monthly",
      amount: cents(opts["base-monthly"] ?? 9.95),
      interval: "month",
    },
    {
      key: "ovoa_base_annual",
      product: "ovoa_base",
      nickname: "Base yearly",
      amount: cents(opts["base-annual"] ?? 95.99),
      interval: "year",
    },
    {
      key: "ovoa_pro_monthly",
      product: "ovoa_pro",
      nickname: "Pro monthly",
      amount: cents(opts["pro-monthly"] ?? 25.95),
      interval: "month",
    },
    {
      key: "ovoa_pro_annual",
      product: "ovoa_pro",
      nickname: "Pro yearly",
      amount: cents(opts["pro-annual"] ?? 195.99),
      interval: "year",
    },
    {
      key: "ovoa_band",
      product: "ovoa_band",
      nickname: "Band",
      amount: cents(opts.band ?? 89.99),
      interval: null,
    },
  ];
  const existing = await stripe("GET", "/prices", {
    lookup_keys: wanted.map((w) => w.key),
    active: true,
    limit: 10,
  });
  for (const w of wanted) {
    if (!(w.amount > 0)) throw new Error(`Bad amount for ${w.nickname}`);
    const found = existing.data.find((p) => p.lookup_key === w.key);
    const same =
      found &&
      found.unit_amount === w.amount &&
      found.currency === "usd" &&
      found.product === w.product &&
      (found.recurring?.interval ?? null) === w.interval;
    if (same) {
      say(`✓ ${w.nickname} price: $${(w.amount / 100).toFixed(2)}`);
      continue;
    }
    await stripe("POST", "/prices", {
      product: w.product,
      currency: "usd",
      unit_amount: w.amount,
      nickname: w.nickname,
      lookup_key: w.key,
      transfer_lookup_key: true,
      ...(w.interval ? { recurring: { interval: w.interval } } : {}),
    });
    say(`✓ ${found ? "Updated" : "Created"} ${w.nickname} price: $${(w.amount / 100).toFixed(2)}`);
  }

  // ---- Webhook ----
  const url = `${site}/api/public/billing/webhook`;
  const hooks = await stripe("GET", "/webhook_endpoints", { limit: 100 });
  let hook = hooks.data.find((h) => h.url === url);
  let webhookSecret = null;
  if (hook && opts["new-webhook"]) {
    await stripe("DELETE", `/webhook_endpoints/${hook.id}`);
    hook = null;
  }
  if (hook) {
    await stripe("POST", `/webhook_endpoints/${hook.id}`, {
      enabled_events: EVENTS,
      disabled: false,
    });
    say(`✓ Webhook exists: ${url}`);
    say(
      `  (Stripe only shows a webhook secret once. If you didn't save it, run again with --new-webhook.)`,
    );
  } else {
    hook = await stripe("POST", "/webhook_endpoints", {
      url,
      enabled_events: EVENTS,
      api_version: API_VERSION,
      description: "OVOA memberships and Band orders",
    });
    webhookSecret = hook.secret;
    say(`✓ Created webhook: ${url}`);
  }

  // ---- Customer portal ----
  try {
    const configs = await stripe("GET", "/billing_portal/configurations", {
      active: true,
      limit: 10,
    });
    if (configs.data.length > 0) {
      say("✓ Customer portal is set up");
    } else {
      await stripe("POST", "/billing_portal/configurations", {
        business_profile: {
          headline: "Manage your OVOA membership",
          terms_of_service_url: `${site}/early-access#terms`,
        },
        features: {
          customer_update: { enabled: true, allowed_updates: ["email", "name", "address"] },
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: { enabled: true, mode: "at_period_end" },
        },
      });
      say("✓ Created customer portal settings (cancel, update card, invoices)");
    }
  } catch (e) {
    say(`! Customer portal: ${e.message}`);
    say("  Open Stripe → Settings → Billing → Customer portal and press Save once instead.");
  }

  // ---- Secrets to paste ----
  const adminKey = randomBytes(24).toString("hex");
  const appKey = randomBytes(24).toString("hex");
  say("\n──────── Paste these into Lovable → Cloud → Secrets ────────\n");
  say(`STRIPE_SECRET_KEY=${SECRET}`);
  say(
    webhookSecret
      ? `STRIPE_WEBHOOK_SECRET=${webhookSecret}`
      : "STRIPE_WEBHOOK_SECRET=(the one you saved earlier, or re-run with --new-webhook)",
  );
  if (!opts["no-keys"]) {
    say(`OVOA_ADMIN_KEY=${adminKey}`);
    say(`MEMBERSHIP_API_KEY=${appKey}`);
    say("\n(The two keys above are freshly made. If you already set them, keep your old ones.)");
  }

  // ---- Cloudflare test Worker ----
  if (opts.cloudflare) {
    const secrets = {
      STRIPE_SECRET_KEY: SECRET,
      ...(webhookSecret ? { STRIPE_WEBHOOK_SECRET: webhookSecret } : {}),
      ...(opts["no-keys"] ? {} : { OVOA_ADMIN_KEY: adminKey, MEMBERSHIP_API_KEY: appKey }),
    };
    const file = join(tmpdir(), `ovoa-secrets-${randomBytes(6).toString("hex")}.json`);
    writeFileSync(file, JSON.stringify(secrets));
    try {
      say(`\nUploading ${Object.keys(secrets).join(", ")} to the Cloudflare test Worker…`);
      const res = spawnSync(`npx wrangler secret bulk "${file}" -c wrangler.site.jsonc`, {
        shell: true,
        stdio: "inherit",
        cwd: new URL("..", import.meta.url),
      });
      if (res.status !== 0)
        throw new Error(
          "wrangler secret bulk failed (is `npx wrangler login` on the right account?)",
        );
      say("✓ Secrets are on the Worker. Save the lines above in your password manager too.");
    } finally {
      rmSync(file, { force: true });
    }
  }
  say("\nDone. Next: setup.md, the step after this one.");
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
