#!/usr/bin/env node
// End-to-end check of OVOA accounts on the site (/account), against the real
// app server running locally. Nothing here touches real Stripe, Resend,
// Cloudflare or the live app server.
//
//   npm run build && node scripts/account-smoke.mjs
//
// It needs the ovoa-app repo next to this one (or OVOA_API_DIR pointing at its
// jarvis/api folder). It starts scripts/fake-stripe.mjs (which also stands in
// for Resend), gives the app server and the site each a fresh local D1 with
// every migration, starts both with `wrangler dev --local`, and then:
//
//   - signs up in the "app" first (proving the address with the code the
//     sign-up emails, as the app does), then signs in on the site with an
//     emailed code
//   - signs up on the site first, then signs in to the "app" with that password
//   - checks wrong codes, spent tickets, other sites' requests and sign-out
//   - checks a signed-in checkout is locked to the account's email
//   - checks the account page shows the plan, and Manage billing opens
//   - checks signing in has Apple (the fake one) email the TestFlight invite
//     once, and not to someone already in the beta group

import { spawn, spawnSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const API_DIR = process.env.OVOA_API_DIR ?? join(ROOT, "..", "ovoa-app", "jarvis", "api");
const STRIPE_PORT = Number(process.env.SMOKE_STRIPE_PORT ?? 12112);
const SITE_PORT = Number(process.env.SMOKE_SITE_PORT ?? 8794);
const API_PORT = Number(process.env.SMOKE_API_PORT ?? 8795);
const STRIPE = `http://127.0.0.1:${STRIPE_PORT}`;
const SITE = `http://127.0.0.1:${SITE_PORT}`;
const API = `http://127.0.0.1:${API_PORT}`;
const WHSEC = "whsec_fake_local_only";
// Short paths: Windows can't open miniflare's files under a long one.
const sitePersist = mkdtempSync(join(tmpdir(), "ovoa-acct-site-"));
const apiPersist = mkdtempSync(join(tmpdir(), "ovoa-acct-api-"));
const children = [];
let failures = 0;

// A kept-alive connection can be closed by wrangler while a slow `wrangler d1
// execute` runs between requests (as in billing-smoke.mjs): retry once fresh.
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
// An App Store Connect key of our own: the fake Apple only checks it's an ES256 token.
const ascKey = generateKeyPairSync("ec", { namedCurve: "P-256" })
  .privateKey.export({ type: "pkcs8", format: "der" })
  .toString("base64");

function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}${detail === undefined ? "" : `  ${JSON.stringify(detail)}`}`,
  );
}

function sh(cmd, cwd = ROOT) {
  const res = spawnSync(cmd, { shell: true, cwd, env, encoding: "utf8" });
  if (res.status !== 0) throw new Error(`${cmd}\n${res.stdout}\n${res.stderr}`);
  return res.stdout;
}

// The app server's local D1, for moving its clock on.
const apiSql = (command) =>
  sh(
    `npx wrangler d1 execute jarvis-db --local --persist-to "${apiPersist}" --json --command "${command.replace(/"/g, '\\"')}"`,
    API_DIR,
  );

const siteSql = (command) =>
  sh(
    `npx wrangler d1 --config wrangler.site.jsonc execute SITE_DB --local --persist-to "${sitePersist}" --json --command "${command.replace(/"/g, '\\"')}"`,
  );

function start(cmd, readyText, cwd = ROOT) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, { shell: true, cwd, env });
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

async function portFree(port) {
  try {
    await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
    return false;
  } catch {
    return true;
  }
}

// The browser's calls to the app server. Each from its own address, as from
// different visitors: its sign-in limit allows ten a minute from one.
let visitor = 0;
async function api(path, body, headers = {}) {
  visitor++;
  const res = await fetch(`${API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": `10.9.${visitor >> 8}.${visitor & 255}`,
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// The newest code emailed to this address, read from the fake Resend.
async function lastCode(to) {
  const sent = (await (await fetch(`${STRIPE}/__emails`)).json()).data.filter((e) =>
    e.to.includes(to),
  );
  const email = sent.at(-1);
  return { email, code: /^(\d{6}) is your OVOA code$/.exec(email?.subject ?? "")?.[1] ?? null };
}

// The site keeps the session the browser got: POST /api/public/account/session.
async function keepSession(token, origin) {
  const res = await fetch(`${SITE}/api/public/account/session`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify({ token }),
  });
  const cookie = /ovoa_session=([0-9a-f]{64})/.exec(res.headers.get("set-cookie") ?? "")?.[1];
  return { status: res.status, cookie: cookie ? `ovoa_session=${cookie}` : null };
}

const ascState = async () => (await fetch(`${STRIPE}/__asc`)).json();

const page = async (path, cookie) =>
  (await fetch(`${SITE}${path}`, { headers: cookie ? { cookie } : {} })).text();

// What a signed-in (or not) checkout asked Stripe for.
async function checkoutEmail(cookie) {
  const res = await fetch(`${SITE}/api/public/billing/checkout?plan=base_monthly`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  const id = /\/pay\/(cs_test_\w+)/.exec(res.headers.get("location") ?? "")?.[1];
  if (!id) throw new Error(`checkout → ${res.status} ${res.headers.get("location")}`);
  return (await (await fetch(`${STRIPE}/__sessions/${id}`)).json()).customer_email ?? null;
}

async function main() {
  if (!existsSync(join(API_DIR, "wrangler.jsonc")))
    throw new Error(`No app server at ${API_DIR} (set OVOA_API_DIR to ovoa-app/jarvis/api).`);
  for (const port of [STRIPE_PORT, SITE_PORT, API_PORT])
    if (!(await portFree(port)))
      throw new Error(
        `Port ${port} is busy (set SMOKE_SITE_PORT / SMOKE_API_PORT / SMOKE_STRIPE_PORT).`,
      );

  await start(
    `node scripts/fake-stripe.mjs --port ${STRIPE_PORT} --deliver ${SITE}`,
    "fake-stripe]",
  );
  sh(
    `node scripts/stripe-setup.mjs --key sk_test_fake --site https://fake.local.test --no-keys --no-upload`,
  );

  sh(`npx wrangler d1 migrations apply jarvis-db --local --persist-to "${apiPersist}"`, API_DIR);
  await start(
    [
      `npx wrangler dev --local --port ${API_PORT} --persist-to "${apiPersist}"`,
      `--var RESEND_API_KEY:re_fake --var RESEND_API_BASE:${STRIPE}`,
    ].join(" "),
    "Ready on",
    API_DIR,
  );

  sh(
    `npx wrangler d1 --config wrangler.site.jsonc migrations apply SITE_DB --local --persist-to "${sitePersist}"`,
  );
  await start(
    [
      `npx wrangler dev -c wrangler.site.jsonc --local --port ${SITE_PORT} --persist-to "${sitePersist}"`,
      `--var STRIPE_API_BASE:${STRIPE}/v1 --var STRIPE_SECRET_KEY:sk_test_fake`,
      `--var STRIPE_WEBHOOK_SECRET:${WHSEC} --var OVOA_API_URL:${API}`,
      `--var ASC_API_BASE:${STRIPE}/asc/v1 --var ASC_KEY_ID:FAKEKEY1 --var ASC_ISSUER_ID:fake-issuer`,
      `--var ASC_PRIVATE_KEY:${ascKey} --var TESTFLIGHT_GROUP_ID:grp_members`,
    ].join(" "),
    "Ready on",
  );

  // ---- Signed out ----
  const signedOut = await page("/account");
  check("/account asks them to sign in", signedOut.includes("Sign in or create your account"));
  check(
    "Google is shown switched off until it's set up",
    /<button[^>]*disabled[^>]*>.*?Continue with Google/s.test(signedOut),
  );
  const off = await fetch(`${SITE}/api/public/account/google`, { redirect: "manual" });
  check(
    "Google without keys goes back with a note",
    (off.headers.get("location") ?? "").endsWith("/account?error=google-off"),
  );
  check("a checkout signed out asks Stripe for no email", (await checkoutEmail(null)) === null);

  // ---- 1. Made in the app first, then signed in on the site ----
  // mail.ovoa.ai, not a reserved domain like .test: the app's server won't
  // mail a code to those once Resend is set (reservedAddress in its
  // emailauth.ts), and its own tests use this domain. Nothing leaves: every
  // email goes to the fake Resend.
  const ada = "ada@mail.ovoa.ai";
  const appSignup = await api("/auth/signup", {
    email: ada,
    password: "app-password-1",
    name: "Ada Lovelace",
  });
  check("the app makes Ada's account", appSignup.status === 201);
  // The app's server emails a code with the sign-up, and the app asks for it
  // before anything else (POST /me/email/verify). An account whose address
  // nobody proved gives way when someone proves it on the site, so Ada proves
  // hers first. A server without that step (codeSent missing) skips it.
  if (appSignup.body.codeSent !== undefined) {
    const { code } = await lastCode(ada);
    const proven = await api(
      "/me/email/verify",
      { code },
      { authorization: `Bearer ${appSignup.body.token}` },
    );
    check(
      "the app proves Ada's address with the code its sign-up emailed",
      appSignup.body.codeSent === true && proven.status === 200 && proven.body.emailVerified,
      proven.body,
    );
    // A minute later, when the next code can go (codes are 60 s apart).
    apiSql(`UPDATE email_codes SET sent_at = sent_at - 60000 WHERE email = '${ada}'`);
  }

  const sent = await api("/auth/email/code", { email: "  Ada@MAIL.ovoa.ai " });
  check("a code is sent", sent.status === 200 && sent.body.expiresInMinutes === 10, sent.body);
  const { email: adaEmail, code: adaCode } = await lastCode(ada);
  check("from no-reply@ovoa.ai", adaEmail?.from === "OVOA <no-reply@ovoa.ai>", adaEmail?.from);
  check(
    "saying it's to sign in, by first name",
    /Hi Ada,[\s\S]*sign in to OVOA/.test(adaEmail?.text ?? ""),
  );
  const again = await api("/auth/email/code", { email: ada });
  check("a second code right away waits", again.status === 429 && again.body.retryAfter > 0);

  const wrong = await api("/auth/email/verify", {
    email: ada,
    code: adaCode === "000000" ? "111111" : "000000",
  });
  check(
    "a wrong code says so, with tries left",
    wrong.status === 400 && wrong.body.attemptsLeft === 4,
    wrong.body,
  );
  const right = await api("/auth/email/verify", { email: ada, code: adaCode });
  check(
    "the right code signs in to the app's account",
    right.status === 200 &&
      /^[0-9a-f]{64}$/.test(right.body.token) &&
      right.body.user?.name === "Ada Lovelace",
    right.body.user,
  );
  const reused = await api("/auth/email/verify", { email: ada, code: adaCode });
  check("the code works once", reused.status === 400 && reused.body.expired === true);

  const evil = await keepSession(right.body.token, "https://evil.example");
  check("another site can't set the session", evil.status === 403 && !evil.cookie);
  const junk = await keepSession("f".repeat(64));
  check("a made-up session isn't kept", junk.status === 401 && !junk.cookie);
  const kept = await keepSession(right.body.token, SITE);
  check("the site keeps Ada's session in a cookie", kept.status === 200 && !!kept.cookie);

  let adaPage = await page("/account", kept.cookie);
  check("/account greets Ada", adaPage.includes("Hi, Ada.") && adaPage.includes(ada));
  check("on the free plan", /Plan.*?Free/s.test(adaPage) && adaPage.includes("See plans"));
  check("with no billing to manage", !adaPage.includes("Manage billing"));

  // ---- The free app's TestFlight invite ----
  let asc = await ascState();
  check(
    "signing in puts Ada in the beta group",
    asc.testers.some((t) => t.email === ada && t.groups.includes("grp_members")),
    asc.testers,
  );
  check(
    "and Apple emails her the invite once",
    asc.emails.filter((e) => e.email === ada).length === 1,
    asc.emails,
  );
  check(
    "the page says to open Apple's email",
    /Open the invite Apple emailed to.*?ada@mail\.ovoa\.ai/s.test(adaPage) &&
      adaPage.includes("send it again"),
  );
  await page("/account", kept.cookie);
  asc = await ascState();
  check(
    "coming back doesn't email her again",
    asc.emails.filter((e) => e.email === ada).length === 1,
  );
  const adaRow = JSON.parse(
    siteSql(`SELECT state, sends, source FROM app_invites WHERE email = '${ada}'`),
  )[0].results[0];
  check(
    "the invite is kept",
    adaRow?.state === "invited" && adaRow.sends === 1 && adaRow.source === "account",
    adaRow,
  );
  check(
    "a checkout signed in is locked to Ada's email",
    (await checkoutEmail(kept.cookie)) === ada,
  );

  siteSql(
    `INSERT INTO members (email, plan, tier, status) VALUES ('${ada}', 'comp', 'pro', 'comp')`,
  );
  adaPage = await page("/account", kept.cookie);
  check("given Pro, the page says Pro", /Plan.*?Pro.*?Free access, from OVOA/s.test(adaPage));
  const appLogin = await api("/auth/login", { email: ada, password: "app-password-1" });
  check("Ada's app password still works", appLogin.status === 200);

  // ---- 2. Made on the site first, then signed in to the app ----
  const bo = "bo@mail.ovoa.ai";
  await api("/auth/email/code", { email: bo });
  const { email: boEmail, code: boCode } = await lastCode(bo);
  check(
    "someone new is told the code creates an account",
    /create your OVOA account/.test(boEmail?.text ?? ""),
  );
  const proven = await api("/auth/email/verify", { email: bo, code: boCode });
  check(
    "no account yet: a ticket to finish with",
    proven.status === 200 &&
      !proven.body.token &&
      /^[0-9a-f]{48}$/.test(proven.body.ticket) &&
      proven.body.email === bo,
    proven.body,
  );
  const short = await api("/auth/email/signup", {
    ticket: proven.body.ticket,
    name: "Bo",
    password: "short",
  });
  check(
    "a short password is sent back, ticket kept",
    short.status === 400 && !!short.body.fields?.password,
  );
  const made = await api("/auth/email/signup", {
    ticket: proven.body.ticket,
    name: "Bo Diddley",
    password: "site-password-1",
  });
  check(
    "the site makes Bo's account",
    made.status === 201 && /^[0-9a-f]{64}$/.test(made.body.token),
    made.status,
  );
  const spent = await api("/auth/email/signup", {
    ticket: proven.body.ticket,
    name: "X",
    password: "whatever-123",
  });
  check("the ticket works once", spent.status === 400 && spent.body.expired === true);
  const boApp = await api("/auth/login", { email: bo, password: "site-password-1" });
  check(
    "Bo signs in to the app with that password",
    boApp.status === 200 && boApp.body.user?.email === bo,
  );
  const boSignupInApp = await api("/auth/signup", {
    email: bo,
    password: "other-pass-1",
    name: "Bo",
  });
  check("the app won't make a second Bo", boSignupInApp.status === 409);

  // Bo was put in the beta group earlier (say a plan he bought): no second email.
  await fetch(`${STRIPE}/__asc/tester`, {
    method: "POST",
    body: JSON.stringify({ email: bo, groups: ["grp_members"] }),
  });
  const boKept = await keepSession(made.body.token);
  siteSql(
    `INSERT INTO members (email, plan, tier, status, stripe_customer_id) VALUES ('${bo}', 'monthly', 'base', 'active', 'cus_fake_bo')`,
  );
  const boPage = await page("/account", boKept.cookie);
  check(
    "Bo's page shows Base and Manage billing",
    /Plan.*?Base/s.test(boPage) && boPage.includes("Manage billing"),
  );
  check(
    "someone already in the beta isn't emailed again",
    boPage.includes("Open the invite Apple emailed") &&
      !(await ascState()).emails.some((e) => e.email === bo),
  );
  const billing = await fetch(`${SITE}/api/public/account/billing`, {
    method: "POST",
    headers: { cookie: boKept.cookie },
    redirect: "manual",
  });
  check(
    "Manage billing opens Stripe's portal",
    billing.status === 303 && !(billing.headers.get("location") ?? "").includes("/account"),
    billing.headers.get("location"),
  );

  // ---- Sign out ----
  const out = await fetch(`${SITE}/api/public/account/session`, {
    method: "DELETE",
    headers: { cookie: kept.cookie },
  });
  check(
    "signing out clears the cookie",
    /ovoa_session=;.*Max-Age=0/.test(out.headers.get("set-cookie") ?? ""),
  );
  const after = await api("/me", undefined, { authorization: `Bearer ${right.body.token}` });
  check("and ends the session on the app server", after.status === 401);
  check(
    "so /account is signed out again",
    (await page("/account", kept.cookie)).includes("Sign in or create your account"),
  );
  const boStill = await api("/me", undefined, { authorization: `Bearer ${made.body.token}` });
  check("Bo's session is untouched", boStill.status === 200);

  // ---- Google, as far as it goes without Google ----
  const bogus = await api("/auth/google", { idToken: "x".repeat(40) });
  check("a made-up Google token is refused", bogus.status === 401);
}

try {
  await main();
} catch (error) {
  failures++;
  console.error(error);
} finally {
  for (const child of children) {
    if (process.platform === "win32")
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    else child.kill();
  }
  for (const dir of [sitePersist, apiPersist]) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows may still hold the SQLite file for a moment */
    }
  }
}
console.log(failures ? `\n${failures} check(s) failed` : "\nAll account checks passed");
process.exit(failures ? 1 : 0);
