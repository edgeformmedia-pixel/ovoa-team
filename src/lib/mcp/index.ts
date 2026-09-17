import { defineMcp } from "@lovable.dev/mcp-js";
import aboutOvoaTool from "./tools/about-ovoa";

// This MCP server is reachable without authentication, so it must never read or
// write per-user data. Task, note and health tools were removed for that reason;
// those live behind the signed-in app only.
export default defineMcp({
  name: "ovoa",
  title: "Ovoa AI",
  version: "0.2.0",
  instructions:
    "Public information about Ovoa, a health band with a companion agent app. No personal or account data is available here; requests, results, notes and health readings require signing in to the app.",
  tools: [aboutOvoaTool],
});
