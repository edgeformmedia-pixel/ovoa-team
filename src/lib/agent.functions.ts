import { createServerFn } from "@tanstack/react-start";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

const Input = z.object({
  request: z.string().min(1),
  notes: z.array(z.object({ title: z.string(), transcript: z.string(), at: z.string() })),
  autonomous: z.boolean(),
});

const Reply = z.object({
  kind: z.enum(["task", "answer", "rule"]),
  steps: z.array(z.string()),
  result: z.string().nullable(),
  question: z
    .object({ text: z.string(), options: z.array(z.string()) })
    .nullable(),
  ruleTitle: z.string().nullable(),
});

export type AgentReply = z.infer<typeof Reply>;

const FALLBACK: AgentReply = {
  kind: "task",
  steps: ["Couldn't reach the band's brain"],
  result: "Try that again in a moment.",
  question: null,
  ruleTitle: null,
};

const SYSTEM = `You are the brain of Band, a programmable AI wristband worn on the wrist.
The wearer clicks once and talks: that is a task you go and do. They click twice and talk:
that is a verbatim voice note, which becomes part of their knowledge base.

Decide what the request is:
- "task" — something to do now using their connected accounts (calendar, mail, messages,
  notes, music) or their voice notes. Give 2-4 short past-tense steps you took. Put the
  one-line outcome in result. If something is genuinely ambiguous, put a short question
  and 2-3 concrete options in question and leave result null.
- "answer" — a question about their body, their notes, or the band. Answer it in result,
  one or two sentences, concrete and specific. Steps can be empty.
- "rule" — a standing rule that should keep running on the band ("buzz when...",
  "every time I..."). Put a short imperative title in ruleTitle and the plain-English
  description in result.

Never mention being an AI model. Never write code. Be terse: this is read on a phone
between other things. Keep every step under 8 words.`;

export const runBandRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<AgentReply> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return FALLBACK;

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const notes = data.notes
      .map((n) => `- [${n.at}] ${n.title}: ${n.transcript}`)
      .join("\n");

    try {
      const result = streamText({
        model: gateway("google/gemini-3.7-flash"),
        system: SYSTEM,
        output: Output.object({ schema: Reply }),
        prompt: [
          `Voice notes on file:\n${notes || "(none yet)"}`,
          data.autonomous
            ? "The wearer let you act without asking. Do it and report back."
            : "The wearer wants to be asked before anything is sent, bought, or deleted.",
          `Request: ${data.request}`,
        ].join("\n\n"),
      });
      return await result.output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) return FALLBACK;
      console.error(error);
      return FALLBACK;
    }
  });
