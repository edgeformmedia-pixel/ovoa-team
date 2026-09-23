import { createFileRoute } from "@tanstack/react-router";

// A public MCP server (Streamable HTTP, stateless, JSON replies) so AI tools can
// learn what OVOA is. It's reachable without signing in, so it must never read
// or write per-user data: its one tool returns a fixed product description.
//
//   POST /mcp   one JSON-RPC message: initialize, ping, tools/list, tools/call

// Keep in step with llms.txt, which has the same facts with live prices.
const SUMMARY = [
  "OVOA is an AI assistant for iPhone that you text or talk to: it schedules, remembers and follows through, then says when it's done or when it needs you.",
  "The OVOA Band is a woven wristband with one button, heart rate and motion sensing, a microphone and a vibration motor that brings OVOA to your wrist.",
  "Everything is in beta: the app ships through Apple TestFlight and the Band is beta hardware. Health tracking and notes are free; the Base and Pro plans add the assistant. Current prices are at https://ovoa.ai/early-access and https://ovoa.ai/llms.txt.",
  "Personal data (requests, results, notes, health readings) is private to the signed-in account and is not available through this public endpoint.",
  "Pages: / (home), /about (the Band), /faq, /early-access (plans), /checkout (buy the Band), /partners, /privacy, /terms, /account (sign in or create an account). Contact: support@ovoa.ai.",
].join("\n");

const TOOLS = [
  {
    name: "about_ovoa",
    title: "About OVOA",
    description:
      "Public, non-personal description of OVOA: what the assistant and the OVOA Band are and where to find them. This endpoint deliberately exposes no user data.",
    inputSchema: { type: "object", properties: {} },
    outputSchema: {
      type: "object",
      properties: { summary: { type: "string" } },
      required: ["summary"],
    },
  },
];

// Newest first. A client asking for one of these gets it back; anything else
// gets the newest.
const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, accept, mcp-protocol-version, mcp-session-id",
};

type Message = { jsonrpc?: string; id?: string | number | null; method?: string; params?: unknown };

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });

const rpcError = (id: Message["id"], code: number, message: string) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

function answer(msg: Message) {
  const params = (msg.params ?? {}) as Record<string, unknown>;
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id: msg.id, result });

  switch (msg.method) {
    case "initialize": {
      const asked = typeof params["protocolVersion"] === "string" ? params["protocolVersion"] : "";
      return ok({
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: { name: "ovoa", title: "OVOA", version: "0.4.0" },
        instructions:
          "Public information about OVOA, an AI assistant for iPhone, and the OVOA Band wristband. No personal or account data is available here; requests, results, notes and health readings require signing in to the app.",
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: TOOLS });
    case "tools/call":
      if (params["name"] !== "about_ovoa") {
        return rpcError(msg.id, -32602, `Unknown tool: ${String(params["name"])}`);
      }
      return ok({
        content: [{ type: "text", text: SUMMARY }],
        structuredContent: { summary: SUMMARY },
      });
    default:
      return rpcError(msg.id, -32601, `Method not found: ${String(msg.method)}`);
  }
}

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS }),
      // No server-to-client stream is offered.
      GET: () => reply(rpcError(null, -32000, "Use POST"), 405),
      POST: async ({ request }) => {
        let msg: Message;
        try {
          msg = (await request.json()) as Message;
        } catch {
          return reply(rpcError(null, -32700, "Parse error"), 400);
        }
        if (
          !msg ||
          typeof msg !== "object" ||
          Array.isArray(msg) ||
          typeof msg.method !== "string"
        ) {
          return reply(rpcError(null, -32600, "Invalid request"), 400);
        }
        // Notifications (no id) such as notifications/initialized need no answer.
        if (msg.id === undefined) return new Response(null, { status: 202, headers: CORS });
        return reply(answer(msg));
      },
    },
  },
});
