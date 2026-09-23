#!/usr/bin/env node
// A tiny in-memory stand-in for the parts of Stripe this site uses, for local
// tests only. Nothing here talks to Stripe. Point the site at it with
// STRIPE_API_BASE=http://127.0.0.1:12111/v1 (scripts/billing-smoke.mjs does).
//
//   node scripts/fake-stripe.mjs [--port 12111] [--deliver http://127.0.0.1:8787]
//
// Besides the Stripe endpoints it has test controls, which play the part of
// the buyer, of you in the Stripe dashboard, and of time passing. Each one
// sends the webhooks real Stripe would (the ones the site listens for), signed
// with FAKE_WEBHOOK_SECRET, to --deliver:
//
//   POST /__complete/<checkout session id>   {"email","name","phone"}  buyer pays
//   POST /__cancel/<subscription id>                                   cancel now
//   POST /__refund/<payment intent id>                                 full refund
//   POST /__end_trial/<subscription id>      the free days run out now: charged
//                                            on its payment method (or the
//                                            customer's default), or cancelled
//                                            without one (missing_payment_method)
//   POST /__add_card/<customer id>           a card added in the billing portal:
//                                            attached, and the customer's default
//   GET  /__sessions/<checkout session id>   what the site asked Checkout for
//   GET  /pay/<checkout session id>          a bare "Pay (fake)" page for browser
//                                            click-throughs; it returns to success_url
//
// Like real Stripe, a subscription's default_payment_method must be attached
// to its customer, and the card a checkout took is attached only when the
// checkout saved it (setup_future_usage). Anything else is refused, so a test
// catches the error live Stripe would give.
//
// It also stands in for Resend's POST /emails (point RESEND_API_BASE at the
// server's root); GET /__emails lists what the site sent.

import { createHmac, randomBytes } from "node:crypto";
import { createServer } from "node:http";

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const PORT = Number(opt("port", 12111));
const DELIVER = opt("deliver", "http://127.0.0.1:8787").replace(/\/+$/, "");
export const FAKE_WEBHOOK_SECRET = process.env.FAKE_WEBHOOK_SECRET ?? "whsec_fake_local_only";

const db = {
  products: new Map(),
  prices: new Map(),
  hooks: new Map(),
  portals: new Map(),
  sessions: new Map(),
  customers: new Map(),
  subscriptions: new Map(),
  invoices: new Map(),
  charges: new Map(),
  paymentIntents: new Map(),
  paymentMethods: new Map(),
  // Idempotency-Key → the first answer, as real Stripe keeps them.
  idempotent: new Map(),
  emails: [],
};
const id = (prefix) => `${prefix}_${randomBytes(12).toString("hex")}`;
const nowS = () => Math.floor(Date.now() / 1000);

// a[b][0][c]=1 → { a: { b: [ { c: "1" } ] } }
function parseForm(text) {
  const out = {};
  for (const [rawKey, value] of new URLSearchParams(text)) {
    const parts = rawKey.split(/\[|\]\[|\]/).filter((p) => p !== "");
    let node = out;
    parts.forEach((part, i) => {
      const last = i === parts.length - 1;
      const nextIsIndex = !last && /^\d+$/.test(parts[i + 1]);
      if (last) node[part] = value;
      else node = node[part] ??= nextIsIndex ? [] : {};
    });
  }
  return out;
}

const list = (items) => ({ object: "list", data: items, has_more: false });

function err(res, status, message) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: { message } }));
}

function priceView(p) {
  return p;
}

function sessionView(s, expand = []) {
  const out = { ...s };
  if (expand.includes("subscription") && s.subscription)
    out.subscription = db.subscriptions.get(s.subscription);
  if (expand.includes("invoice") && s.invoice) out.invoice = db.invoices.get(s.invoice);
  if (s.payment_intent && expand.some((e) => e.startsWith("payment_intent"))) {
    const pi = db.paymentIntents.get(s.payment_intent);
    out.payment_intent = expand.includes("payment_intent.payment_method")
      ? pi
      : { ...pi, payment_method: pi.payment_method.id };
  }
  if (expand.includes("line_items"))
    out.line_items = list(
      s._items.map((li) => {
        const price = db.prices.get(li.price);
        return { price, quantity: 1, amount_total: price.unit_amount };
      }),
    );
  delete out._items;
  delete out._params;
  return out;
}

// The card the buyer paid with, attached to the customer only when the site
// asked to save it (setup_future_usage): what a subscription made later charges.
function newPaymentIntent(customer, saved) {
  const pi = {
    id: id("pi"),
    object: "payment_intent",
    payment_method: {
      id: id("pm"),
      object: "payment_method",
      card: { brand: "visa", last4: "4242" },
      customer: saved ? customer : null,
    },
  };
  db.paymentIntents.set(pi.id, pi);
  db.paymentMethods.set(pi.payment_method.id, pi.payment_method);
  return pi;
}

async function deliver(type, object) {
  const event = { id: id("evt"), object: "event", type, data: { object } };
  const payload = JSON.stringify(event);
  const t = nowS();
  const sig = createHmac("sha256", FAKE_WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
  const res = await fetch(`${DELIVER}/api/public/billing/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${sig}` },
    body: payload,
  });
  const text = await res.text();
  console.log(`[fake-stripe] webhook ${type} → ${res.status} ${text.slice(0, 120)}`);
  if (!res.ok) throw new Error(`webhook ${type} failed: ${res.status} ${text}`);
  return res.status;
}

function newInvoice(customer, subscription, lines) {
  const amount = lines.reduce((t, l) => t + l.amount, 0);
  const inv = {
    id: id("in"),
    object: "invoice",
    customer,
    subscription,
    currency: "usd",
    amount_paid: amount,
    payment_intent: amount > 0 ? id("pi") : null,
    lines: list(lines),
  };
  db.invoices.set(inv.id, inv);
  if (inv.payment_intent)
    db.charges.set(inv.payment_intent, { id: id("ch"), invoice: inv.id, amount });
  return inv;
}

async function complete(s, buyer) {
  if (s.status === "complete") throw new Error("already complete");
  const p = s._params;
  const customer = {
    id: id("cus"),
    email: buyer.email,
    name: buyer.name ?? null,
    phone: buyer.phone ?? null,
  };
  db.customers.set(customer.id, customer);
  s.customer = customer.id;
  s.customer_details = { email: customer.email, name: customer.name, phone: customer.phone };
  if (p.shipping_address_collection)
    s.shipping_details = {
      name: customer.name,
      address: {
        line1: "1 Test St",
        line2: null,
        city: "Austin",
        state: "TX",
        postal_code: "78701",
        country: "US",
      },
    };
  const prices = s._items.map((li) => db.prices.get(li.price));
  const events = [];

  if (s.mode === "subscription") {
    const trialDays = Number(p.subscription_data?.trial_period_days ?? 0);
    const recurring = prices.filter((pr) => pr.recurring);
    const oneTime = prices.filter((pr) => !pr.recurring);
    const intervalS = (pr) => (pr.recurring.interval === "year" ? 365 : 30) * 86400;
    const end = trialDays > 0 ? nowS() + trialDays * 86400 : nowS() + intervalS(recurring[0]);
    const sub = {
      id: id("sub"),
      object: "subscription",
      customer: customer.id,
      status: trialDays > 0 ? "trialing" : "active",
      trial_end: trialDays > 0 ? end : null,
      current_period_end: end,
      cancel_at_period_end: false,
      canceled_at: null,
      metadata: p.subscription_data?.metadata ?? {},
      items: list(recurring.map((pr) => ({ id: id("si"), price: pr }))),
    };
    db.subscriptions.set(sub.id, sub);
    const inv = newInvoice(customer.id, sub.id, [
      ...oneTime.map((pr) => ({ amount: pr.unit_amount, price: pr })),
      ...recurring.map((pr) => ({ amount: trialDays > 0 ? 0 : pr.unit_amount, price: pr })),
    ]);
    s.subscription = sub.id;
    s.invoice = inv.id;
    s.amount_total = inv.amount_paid;
    s.payment_status = inv.amount_paid > 0 ? "paid" : "no_payment_required";
    s.status = "complete";
    events.push(
      ["checkout.session.completed", { ...sessionView(s), subscription: sub.id }],
      ["customer.subscription.created", sub],
      ["invoice.paid", inv],
    );
  } else {
    const inv = newInvoice(
      customer.id,
      null,
      prices.map((pr) => ({ amount: pr.unit_amount, price: pr })),
    );
    const pi = newPaymentIntent(
      customer.id,
      p.payment_intent_data?.setup_future_usage === "off_session",
    );
    // The invoice's payment is the session's payment.
    db.charges.set(pi.id, db.charges.get(inv.payment_intent));
    db.charges.delete(inv.payment_intent);
    inv.payment_intent = pi.id;
    s.payment_intent = inv.payment_intent;
    s.invoice = inv.id;
    s.amount_total = inv.amount_paid;
    s.payment_status = "paid";
    s.status = "complete";
    events.push(["checkout.session.completed", sessionView(s)]);
  }
  for (const [type, object] of events) await deliver(type, object);
  return sessionView(s);
}

async function handle(req, res) {
  const url = new URL(req.url, "http://x");
  const body = await new Promise((r) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => r(b));
  });
  const send = (obj, status = 200) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };
  const path = url.pathname.replace(/^\/v1/, "");
  const q = req.method === "GET" ? parseForm(url.search.slice(1)) : parseForm(body);
  const m = (re) => re.exec(path);
  let hit;

  // ---- test controls ----
  if ((hit = m(/^\/__complete\/(cs_[\w]+)$/)) && req.method === "POST") {
    const s = db.sessions.get(hit[1]);
    if (!s) return err(res, 404, "no such session");
    return send(await complete(s, JSON.parse(body || "{}")));
  }
  if ((hit = m(/^\/__cancel\/(sub_\w+)$/)) && req.method === "POST") {
    const sub = db.subscriptions.get(hit[1]);
    if (!sub) return err(res, 404, "no such subscription");
    Object.assign(sub, { status: "canceled", canceled_at: nowS() });
    await deliver("customer.subscription.deleted", sub);
    return send(sub);
  }
  if ((hit = m(/^\/__refund\/(pi_\w+)$/)) && req.method === "POST") {
    const ch = db.charges.get(hit[1]);
    if (!ch) return err(res, 404, "no such payment");
    const charge = {
      id: ch.id,
      object: "charge",
      refunded: true,
      payment_intent: hit[1],
      invoice: ch.invoice,
    };
    await deliver("charge.refunded", charge);
    return send(charge);
  }
  if ((hit = m(/^\/__end_trial\/(sub_\w+)$/)) && req.method === "POST") {
    const sub = db.subscriptions.get(hit[1]);
    if (!sub) return err(res, 404, "no such subscription");
    if (sub.status !== "trialing") return err(res, 400, "not trialing");
    const pm =
      sub.default_payment_method ??
      db.customers.get(sub.customer)?.invoice_settings?.default_payment_method ??
      null;
    if (!pm && sub.trial_settings?.end_behavior?.missing_payment_method === "cancel") {
      Object.assign(sub, { status: "canceled", canceled_at: nowS(), trial_end: nowS() });
      await deliver("customer.subscription.deleted", sub);
      return send(sub);
    }
    if (!pm) return err(res, 400, "fake-stripe only ends trials that cancel or have a card");
    const price = sub.items.data[0].price;
    const days = price.recurring.interval === "year" ? 365 : 30;
    Object.assign(sub, { status: "active", trial_end: null });
    sub.current_period_end = nowS() + days * 86400;
    const inv = newInvoice(sub.customer, sub.id, [{ amount: price.unit_amount, price }]);
    await deliver("invoice.paid", inv);
    await deliver("customer.subscription.updated", sub);
    return send(sub);
  }
  if ((hit = m(/^\/__add_card\/(cus_\w+)$/)) && req.method === "POST") {
    const customer = db.customers.get(hit[1]);
    if (!customer) return err(res, 404, "no such customer");
    const pm = {
      id: id("pm"),
      object: "payment_method",
      card: { brand: "mastercard", last4: "4444" },
      customer: customer.id,
    };
    db.paymentMethods.set(pm.id, pm);
    customer.invoice_settings = { default_payment_method: pm.id };
    return send(customer);
  }
  if ((hit = m(/^\/__sessions\/(cs_\w+)$/))) {
    const s = db.sessions.get(hit[1]);
    return s ? send({ ...s._params, _items: s._items }) : err(res, 404, "no such session");
  }
  if (path === "/__emails") return send(list(db.emails));

  // ---- Resend ----
  if (path === "/emails" && req.method === "POST") {
    const key = req.headers["idempotency-key"];
    const email = { id: `em_${randomBytes(8).toString("hex")}`, ...JSON.parse(body) };
    if (!key || !db.emails.some((e) => e._key === key)) db.emails.push({ ...email, _key: key });
    return send({ id: email.id });
  }

  // ---- the buyer's side of Checkout, for clicking through in a browser ----
  if ((hit = m(/^\/pay\/(cs_test_\w+)$/))) {
    const s = db.sessions.get(hit[1]);
    if (!s) return err(res, 404, "no such session");
    if (req.method === "POST") {
      const done =
        s.status === "complete"
          ? sessionView(s)
          : await complete(s, {
              email: q.email || "buyer@example.test",
              name: q.name || "Test Buyer",
              phone: "+15125550100",
            });
      const to = String(s._params.success_url ?? "").replace("{CHECKOUT_SESSION_ID}", done.id);
      res.writeHead(303, { location: to });
      return res.end();
    }
    const lines = s._items
      .map((li) => db.prices.get(li.price))
      .map(
        (p) =>
          `<li>${p.nickname ?? p.lookup_key}: $${(p.unit_amount / 100).toFixed(2)}${p.recurring ? `/${p.recurring.interval}` : ""}</li>`,
      )
      .join("");
    const trial = s._params.subscription_data?.trial_period_days;
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(`<!doctype html><meta name="viewport" content="width=device-width">
<title>Fake Stripe Checkout</title>
<body style="font:16px system-ui;max-width:420px;margin:40px auto;padding:0 16px">
<p style="color:#b00;font-weight:600">FAKE STRIPE (local test, no real payment)</p>
<p>mode: ${s.mode}${trial ? ` · trial ${trial} days` : ""}${s._params.shipping_address_collection ? " · ships to US" : ""}</p>
<ul>${lines}</ul>
<form method="post"><input name="email" value="buyer@example.test" style="width:100%;padding:8px">
<button style="margin-top:12px;padding:10px 18px">Pay (fake)</button></form>
<p><a href="${s._params.cancel_url}">Cancel</a></p></body>`);
  }

  // ---- Stripe ----
  if (path === "/account")
    return send({ id: "acct_fake", settings: { dashboard: { display_name: "Fake Stripe" } } });

  if ((hit = m(/^\/products\/([\w-]+)$/))) {
    const p = db.products.get(hit[1]);
    if (!p) return err(res, 404, "No such product");
    if (req.method === "POST") Object.assign(p, q, { active: q.active !== "false" });
    return send(p);
  }
  if (path === "/products" && req.method === "POST") {
    const p = { object: "product", active: true, ...q };
    db.products.set(p.id, p);
    return send(p);
  }

  if (path === "/prices" && req.method === "GET") {
    const keys = [].concat(q.lookup_keys ?? []);
    const all = [...db.prices.values()].filter(
      (p) => (q.active !== "true" || p.active) && (!keys.length || keys.includes(p.lookup_key)),
    );
    return send(list(all.map(priceView)));
  }
  if (path === "/prices" && req.method === "POST") {
    if (!db.products.has(q.product)) return err(res, 400, "No such product");
    const holder = [...db.prices.values()].find((p) => p.lookup_key === q.lookup_key);
    if (holder) {
      if (q.transfer_lookup_key !== "true")
        return err(res, 400, "A price with this lookup_key already exists");
      holder.lookup_key = null;
    }
    const p = {
      id: id("price"),
      object: "price",
      active: true,
      product: q.product,
      currency: q.currency,
      unit_amount: Number(q.unit_amount),
      nickname: q.nickname ?? null,
      lookup_key: q.lookup_key ?? null,
      recurring: q.recurring ? { interval: q.recurring.interval } : null,
    };
    db.prices.set(p.id, p);
    return send(p);
  }

  if (path === "/webhook_endpoints" && req.method === "GET")
    return send(list([...db.hooks.values()]));
  if (path === "/webhook_endpoints" && req.method === "POST") {
    const h = {
      id: id("we"),
      url: q.url,
      enabled_events: q.enabled_events,
      secret: FAKE_WEBHOOK_SECRET,
    };
    db.hooks.set(h.id, h);
    return send(h);
  }
  if ((hit = m(/^\/webhook_endpoints\/(we_\w+)$/))) {
    if (req.method === "DELETE") db.hooks.delete(hit[1]);
    else Object.assign(db.hooks.get(hit[1]) ?? {}, q);
    return send({ id: hit[1] });
  }

  if (path === "/billing_portal/configurations" && req.method === "GET")
    return send(list([...db.portals.values()]));
  if (path === "/billing_portal/configurations" && req.method === "POST") {
    const c = { id: id("bpc"), is_default: db.portals.size === 0, ...q };
    db.portals.set(c.id, c);
    return send(c);
  }
  if (path === "/billing_portal/sessions" && req.method === "POST")
    return send({ url: `http://127.0.0.1:${PORT}/portal/${q.customer}` });

  if (path === "/checkout/sessions" && req.method === "POST") {
    const items = [].concat(q.line_items ?? []);
    for (const li of items)
      if (!db.prices.get(li.price)?.active) return err(res, 400, `No such price: ${li.price}`);
    const s = {
      id: `cs_test_${randomBytes(16).toString("hex")}`,
      object: "checkout.session",
      mode: q.mode,
      status: "open",
      payment_status: "unpaid",
      customer: null,
      customer_email: q.customer_email ?? null,
      customer_details: null,
      subscription: null,
      payment_intent: null,
      invoice: null,
      amount_total: null,
      currency: "usd",
      metadata: q.metadata ?? {},
      client_reference_id: q.client_reference_id ?? null,
      success_url: q.success_url ?? null,
      return_url: q.return_url ?? null,
      shipping_details: null,
      _items: items,
      _params: q,
    };
    s.url = `http://127.0.0.1:${PORT}/pay/${s.id}`;
    db.sessions.set(s.id, s);
    return send(sessionView(s));
  }
  if ((hit = m(/^\/checkout\/sessions\/(cs_\w+)$/))) {
    const s = db.sessions.get(hit[1]);
    return s ? send(sessionView(s, [].concat(q.expand ?? []))) : err(res, 404, "No such session");
  }
  if (path === "/subscriptions" && req.method === "GET") {
    const subs = [...db.subscriptions.values()].filter(
      (s) =>
        (!q.customer || s.customer === q.customer) &&
        (q.status === "all" || s.status !== "canceled"),
    );
    return send(list(subs));
  }
  if (path === "/subscriptions" && req.method === "POST") {
    const key = req.headers["idempotency-key"];
    if (key && db.idempotent.has(key)) return send(db.idempotent.get(key));
    if (!db.customers.has(q.customer)) return err(res, 400, "No such customer");
    const prices = [].concat(q.items ?? []).map((i) => db.prices.get(i.price));
    if (!prices.length || prices.some((p) => !p?.active)) return err(res, 400, "No such price");
    if (q.default_payment_method) {
      const pm = db.paymentMethods.get(q.default_payment_method);
      if (!pm) return err(res, 400, `No such PaymentMethod: '${q.default_payment_method}'`);
      // Live Stripe's answer for the card that paid for a Band it didn't save.
      if (pm.customer !== q.customer)
        return err(
          res,
          400,
          `The customer does not have a payment method with the ID ${pm.id}. The payment method must be attached to the customer.`,
        );
    }
    const trialDays = Number(q.trial_period_days ?? 0);
    const intervalS = (prices[0].recurring.interval === "year" ? 365 : 30) * 86400;
    const end = trialDays > 0 ? nowS() + trialDays * 86400 : nowS() + intervalS;
    const sub = {
      id: id("sub"),
      object: "subscription",
      customer: q.customer,
      status: trialDays > 0 ? "trialing" : "active",
      trial_end: trialDays > 0 ? end : null,
      current_period_end: end,
      cancel_at_period_end: false,
      canceled_at: null,
      default_payment_method: q.default_payment_method ?? null,
      trial_settings: q.trial_settings ?? null,
      metadata: q.metadata ?? {},
      items: list(prices.map((pr) => ({ id: id("si"), price: pr }))),
    };
    db.subscriptions.set(sub.id, sub);
    if (key) db.idempotent.set(key, sub);
    const inv = newInvoice(
      q.customer,
      sub.id,
      prices.map((pr) => ({ amount: trialDays > 0 ? 0 : pr.unit_amount, price: pr })),
    );
    await deliver("customer.subscription.created", sub);
    await deliver("invoice.paid", inv);
    return send(sub);
  }
  if ((hit = m(/^\/subscriptions\/(sub_\w+)$/)) && req.method === "POST") {
    // Plan switches from the welcome page: a new price, and maybe the trial
    // ended now. Charges what real Stripe would, roughly: nothing while the
    // trial runs, the full new price when it ends now, the difference otherwise.
    const sub = db.subscriptions.get(hit[1]);
    if (!sub) return err(res, 404, "No such subscription");
    const item = [].concat(q.items ?? [])[0];
    const price = item?.price ? db.prices.get(item.price) : null;
    if (item && !price?.active) return err(res, 400, `No such price: ${item?.price}`);
    const old = sub.items.data[0]?.price;
    let charge = 0;
    if (price) {
      sub.items = list([{ id: sub.items.data[0]?.id ?? id("si"), price }]);
      const days = price.recurring.interval === "year" ? 365 : 30;
      if (q.trial_end === "now") {
        Object.assign(sub, { status: "active", trial_end: null });
        sub.current_period_end = nowS() + days * 86400;
        charge = price.unit_amount;
      } else if (sub.status !== "trialing") {
        if (price.recurring.interval !== old?.recurring?.interval)
          sub.current_period_end = nowS() + days * 86400;
        charge = Math.max(0, price.unit_amount - (old?.unit_amount ?? 0));
      }
    }
    if (charge > 0) {
      const inv = newInvoice(sub.customer, sub.id, [{ amount: charge, price }]);
      await deliver("invoice.paid", inv);
    }
    await deliver("customer.subscription.updated", sub);
    return send(sub);
  }
  if ((hit = m(/^\/subscriptions\/(sub_\w+)$/))) {
    const sub = db.subscriptions.get(hit[1]);
    if (!sub) return err(res, 404, "No such subscription");
    const expand = [].concat(q.expand ?? []);
    return send(
      expand.includes("customer") ? { ...sub, customer: db.customers.get(sub.customer) } : sub,
    );
  }
  if ((hit = m(/^\/customers\/(cus_\w+)$/))) {
    const c = db.customers.get(hit[1]);
    return c ? send(c) : err(res, 404, "No such customer");
  }
  if ((hit = m(/^\/invoices\/(in_\w+)$/))) {
    const inv = db.invoices.get(hit[1]);
    return inv ? send(inv) : err(res, 404, "No such invoice");
  }
  return err(res, 404, `fake-stripe has no ${req.method} ${path}`);
}

createServer((req, res) =>
  handle(req, res).catch((e) => {
    console.error("[fake-stripe]", e);
    err(res, 500, e.message);
  }),
).listen(PORT, "127.0.0.1", () =>
  console.log(`[fake-stripe] http://127.0.0.1:${PORT}/v1 → webhooks to ${DELIVER}`),
);
