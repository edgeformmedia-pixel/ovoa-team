// Email to buyers from no-reply@ovoa.ai, sent through Resend (resend.com): one
// HTTPS call, so it runs on Lovable and on the Cloudflare Worker alike.
// Replies go to support@ovoa.ai.
//
//   RESEND_API_KEY   turns sending on (Resend → API Keys, with ovoa.ai verified
//                    under Domains, or it can't send as no-reply@ovoa.ai)
//   EMAIL_FROM       optional, default "OVOA <no-reply@ovoa.ai>"
//
// Without the key nothing is sent: the welcome page has the same buttons, and
// the admin page can copy each buyer's link.

import { envVar } from "./db.server";

const FROM = "OVOA <no-reply@ovoa.ai>";
const REPLY_TO = "support@ovoa.ai";

// RESEND_API_BASE exists only so a local test run can catch the emails.
const resendApi = () => envVar("RESEND_API_BASE") ?? "https://api.resend.com";

export function emailConfigured(): boolean {
  return Boolean(envVar("RESEND_API_KEY"));
}

export type Email = { to: string; subject: string; text: string; html: string };

// Never throws: an email that doesn't go out is logged and false comes back,
// so it can't fail a webhook. The idempotency key makes Resend drop a repeat
// of the same email within 24 hours (a webhook Stripe delivered twice).
export async function sendEmail(email: Email, idempotencyKey?: string): Promise<boolean> {
  const key = envVar("RESEND_API_KEY");
  if (!key) {
    console.warn("[email] RESEND_API_KEY isn't set; not sent:", email.subject);
    return false;
  }
  try {
    const res = await fetch(`${resendApi()}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: envVar("EMAIL_FROM") ?? FROM,
        to: [email.to],
        reply_to: REPLY_TO,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });
    if (!res.ok) {
      console.error("[email]", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email]", error);
    return false;
  }
}

// ---------- The emails ----------

// Free days that came with a Band and haven't been started, in words (from
// trialOffer in sync.server.ts).
export type TrialOffer = {
  days: number;
  planName: string;
  // "$9.95 a month", or null if the price couldn't be loaded (always null
  // with noCard: nothing is charged).
  price: string | null;
  // "Visa ending in 4242", or null.
  card: string | null;
  // A Band bought on its own: no card, so the days end on their own.
  noCard: boolean;
};

// A paragraph, or the email's one button.
type Block = string | { label: string; url: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Plain text and a plain page (one column, readable in any mail app) from the
// same blocks. In the text version the button is its link on its own line.
function compose(to: string, subject: string, blocks: Block[]): Email {
  const text = blocks.map((b) => (typeof b === "string" ? b : b.url)).join("\n\n");
  const html = blocks
    .map((b) =>
      typeof b === "string"
        ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#060606">${esc(b)}</p>`
        : `<p style="margin:8px 0 24px"><a href="${esc(b.url)}" style="display:inline-block;background:#0078eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:999px">${esc(b.label)}</a></p>`,
    )
    .join("\n");
  return {
    to,
    subject,
    text: `${text}\n\nOVOA`,
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#edebee">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edebee;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"><tr><td>
<p style="margin:0 0 24px;font-size:14px;font-weight:700;letter-spacing:0.08em;color:#060606">OVOA</p>
${html}
</td></tr></table>
</td></tr></table></body></html>`,
  };
}

const hello = (firstName: string | null) => `Hi${firstName ? ` ${firstName}` : ""},`;

const SIGN_OFF = "Questions? Reply to this email, or write to support@ovoa.ai.";

const startLabel = (t: TrialOffer) => `Start my ${t.days} free days`;

function afterTrial(t: TrialOffer): string {
  if (t.noCard)
    return `No card is needed: your ${t.days} days of ${t.planName} end on their own, and nothing is charged. You can also give them to someone: start them, then move them to their app email from your order page.`;
  const then = t.price
    ? `Then it's ${t.price}${t.card ? ` on your ${t.card}` : ""}, until you cancel.`
    : "Then it's the monthly price, until you cancel.";
  return `Nothing is charged for ${t.planName} until your ${t.days} days are up. ${then} Cancel before they end and you pay nothing more.`;
}

// Right after a Band is bought, with Base or on its own: the free days wait
// for them. The button opens the order page, which has the start form.
export function trialWaitingEmail(input: {
  to: string;
  firstName: string | null;
  url: string;
  trial: TrialOffer;
}): Email {
  const t = input.trial;
  return compose(input.to, `Your OVOA Band is ordered. Your ${t.days} free days wait for you.`, [
    hello(input.firstName),
    "Thanks for ordering the OVOA Band. It's beta hardware, made in small batches, so it may take a while to reach you. We'll email you when it ships.",
    `Your ${t.days} free days of OVOA ${t.planName} haven't started. They start when you choose, so they don't run out while your Band is on its way. When it arrives, or whenever you're ready, open your order page and tap ${startLabel(t)}.`,
    { label: startLabel(t), url: input.url },
    afterTrial(t),
    "Your order page also shows how to put the free OVOA app on your iPhone in the meantime.",
    SIGN_OFF,
  ]);
}

// When a Band is marked shipped. With free days still waiting, it's the
// reminder to start them once the Band arrives.
export function bandShippedEmail(input: {
  to: string;
  firstName: string | null;
  url: string;
  shipTo: string | null;
  trial: TrialOffer | null;
}): Email {
  const t = input.trial;
  return compose(input.to, "Your OVOA Band has shipped", [
    hello(input.firstName),
    `Your OVOA Band is on its way${input.shipTo ? ` to ${input.shipTo}` : ""}.`,
    ...(t
      ? [
          `When it arrives, start your ${t.days} free days of OVOA ${t.planName} from your order page.`,
          { label: startLabel(t), url: input.url },
          afterTrial(t),
        ]
      : [
          "Pair it from the OVOA app on your iPhone. Your order page has the steps if you haven't set the app up yet.",
          { label: "Open my order page", url: input.url },
        ]),
    SIGN_OFF,
  ]);
}
