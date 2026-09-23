import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";

const Input = z.object({
  prompt: z.string().min(1),
});

const SaveInput = z.object({
  token: z.string().min(10).max(2000),
});

/** A real Claude setup token looks like sk-ant-oat01-…; reject anything else (e.g. pasted error text). */
const TOKEN_SHAPE = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

export type ClaudeTestResult = {
  ok: boolean;
  answer: string;
  detail: string;
  authInvalid?: boolean;
};

type ClaudeSession = { claudeToken?: string };

/**
 * The pasted sign-in lives in an encrypted, http-only session cookie.
 * It never sits in browser-readable storage and is never sent back to the page.
 */
function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "band-claude",
    maxAge: 60 * 60 * 24 * 60, // 60 days
    // The Lovable preview runs the app inside a cross-site iframe. `none` is
    // required there; `secure` + `httpOnly` keep the credential protected.
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

async function readToken(): Promise<string> {
  try {
    const session = await useSession<ClaudeSession>(sessionConfig());
    const fromSession = (session.data.claudeToken ?? "").trim();
    if (fromSession.length > 10) return fromSession;
  } catch {
    // no session yet
  }
  return "";
}

async function forgetToken() {
  const session = await useSession<ClaudeSession>(sessionConfig());
  await session.clear();
}

/** Is a Claude sign-in saved? Never returns the token itself. */
export const claudeTokenStatus = createServerFn({ method: "GET" }).handler(async () => {
  const token = await readToken();
  return { saved: token.length > 10, hint: token ? `…${token.slice(-4)}` : "" };
});

/** Save the pasted sign-in into the encrypted session cookie. */
export const saveClaudeToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data }) => {
    const token = data.token.trim();
    if (!TOKEN_SHAPE.test(token)) {
      return {
        saved: false,
        hint: "",
        error:
          "That does not look like a Claude setup token. Run `claude setup-token` and paste the value that starts with sk-ant-.",
      };
    }
    const session = await useSession<ClaudeSession>(sessionConfig());
    await session.update({ claudeToken: token });
    return { saved: true, hint: `…${token.slice(-4)}`, error: "" };
  });

/** Forget the saved sign-in. */
export const clearClaudeToken = createServerFn({ method: "POST" }).handler(async () => {
  await forgetToken();
  return { saved: false };
});

/**
 * Spike: does a Claude subscription setup token (from `claude setup-token`)
 * drive the API, and does it bring the person's memory / connectors along?
 */
export const probeClaudeToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<ClaudeTestResult> => {
    const token = await readToken();
    if (token.length < 10) {
      return {
        ok: false,
        answer: "",
        detail: "No Claude sign-in saved. Paste a fresh setup token to connect.",
        authInvalid: true,
      };
    }

    async function attempt() {
      return fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "oauth-2025-04-20",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 400,
          system: "You are Claude Code, Anthropic's official CLI.",
          messages: [{ role: "user", content: data.prompt }],
        }),
      });
    }

    try {
      let res = await attempt();
      // Subscription-backed tokens are rate limited per plan; wait it out once or twice.
      for (let i = 0; i < 2 && res.status === 429; i++) {
        const after = Number(res.headers.get("retry-after") ?? "");
        const waitMs = Math.min(
          Number.isFinite(after) && after > 0 ? after * 1000 : 4000 * (i + 1),
          15000,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        res = await attempt();
      }

      const body = await res.text();
      if (!res.ok) {
        let message = body.slice(0, 400);
        try {
          const parsed = JSON.parse(body);
          message = parsed?.error?.message ?? message;
        } catch {
          // keep raw
        }
        if (res.status === 429) {
          const reset = res.headers.get("anthropic-ratelimit-requests-reset") ??
            res.headers.get("retry-after") ?? "";
          const resetText = reset ? ` Resets around ${reset}.` : "";
          return {
            ok: false,
            answer: "",
            detail:
              `Claude accepted the sign-in, but the setup token is being rate-limited by Anthropic right now.${resetText} This limit is separate from what you see in Claude's terminal. Check /usage inside Claude Code or platform.anthropic.com/usage, then try again in a few minutes.`,
          };
        }
        if (res.status === 401 || res.status === 403) {
          await forgetToken();
          return {
            ok: false,
            answer: "",
            detail: "Your Claude sign-in expired or was revoked. Reconnect Claude to continue.",
            authInvalid: true,
          };
        }
        return { ok: false, answer: "", detail: `HTTP ${res.status}: ${message || "no details"}` };
      }

      const parsed = JSON.parse(body);
      const answer = (parsed?.content ?? [])
        .filter((b: { type?: string }) => b.type === "text")
        .map((b: { text?: string }) => b.text ?? "")
        .join("\n")
        .trim();
      return { ok: true, answer, detail: `${res.status} · model ${parsed?.model ?? "?"}` };
    } catch (error) {
      return { ok: false, answer: "", detail: String(error) };
    }
  });
