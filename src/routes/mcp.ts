import { createFileRoute } from "@tanstack/react-router";

// A public MCP server (Streamable HTTP, stateless, JSON replies) so AI tools can
// learn what OVOA is. It's reachable without signing in, so it must never read
// or write per-user data: its one tool returns a fixed product description.
//
//   POST /mcp   one JSON-RPC message: initialize, ping, tools/list, tools/call

const SUMMARY = [
  "Band, made by Ovoa AI, is a health band with a companion app.",
  "In the app you ask for something in plain language; a personal agent works on it in the background and reports back what it actually did.",
  "Personal data (requests, results, notes, health readings) is private to the signed-in account and is not available through this public endpoint.",
  "Pages: / (home), /about, /faq, /early-access (plans), /checkout (buy Band), /account (sign in or create an account).",
].join("\n");

const TOOLS = [
  {
    name: "about_ovoa",
    title: "About Ovoa",
    description:
      "Public, non-personal description of Ovoa: what the band and companion app are and where to find them. This endpoint deliberately exposes no user data.",
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
        serverInfo: { name: "ovoa", title: "Ovoa AI", version: "0.3.0" },
        instructions:
          "Public information about Ovoa, a health band with a companion agent app. No personal or account data is available here; requests, results, notes and health readings require signing in to the app.",
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
