import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const SUMMARY = [
  "Band, made by Ovoa AI, is a health band with a companion app.",
  "In the app you ask for something in plain language; a personal agent works on it in the background and reports back what it actually did.",
  "Personal data (requests, results, notes, health readings) is private to the signed-in account and is not available through this public endpoint.",
  "Pages: / (home), /about, /faq, /early-access (plans), /checkout (buy Band).",
].join("\n");

// The /mcp endpoint is public and unauthenticated, so it exposes NO user data:
// no tasks, no notes, no health signals, and no way to create work in someone's
// account. Only this static product description is served here.
export default defineTool({
  name: "about_ovoa",
  title: "About Ovoa",
  description:
    "Public, non-personal description of Ovoa: what the band and companion app are and where to find them. This endpoint deliberately exposes no user data.",
  inputSchema: {},
  outputSchema: { summary: z.string() },
  handler: async () => ({
    content: [{ type: "text" as const, text: SUMMARY }],
    structuredContent: { summary: SUMMARY },
  }),
});
