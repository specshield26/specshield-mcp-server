#!/usr/bin/env node
// Smoke test: boots the built server with a stubbed (no-network) backend, lists
// the tools, and round-trips the deploy gate + raw diff. Run `npm run build` first.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../dist/server.js";
import { SpecShieldApiClient } from "../dist/client.js";
import { createLogger } from "../dist/logger.js";

const CANNED = {
  "/api/intelligence/change-safety": {
    safeToMerge: false,
    riskLevel: "CRITICAL",
    blockingReasons: ["GET /b was removed"],
    recommendedAction: "Do not merge as-is.",
  },
  "/api/intelligence/compare": {
    breakingChanges: [{ type: "ENDPOINT_REMOVED", path: "/b", method: "get" }],
    additions: [],
    modifications: [],
    warnings: [],
    risk: { level: "CRITICAL", score: 91, breakingCount: 1, totalChanges: 1, summary: "1 breaking change" },
    safeToMerge: false,
    compatibilitySummary: "1 breaking change",
  },
};

const cannedFetch = async (url) => {
  const path = new URL(url).pathname;
  const body = CANNED[path] ?? {};
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
};

const config = { apiUrl: "http://smoke.local", apiKey: "ss_smoke", timeoutMs: 5000, logLevel: "error" };
const logger = createLogger("error");
const client = new SpecShieldApiClient(config, logger, { fetchImpl: cannedFetch, baseDelayMs: 0 });
const server = createServer({ client, logger });

const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
const mcp = new Client({ name: "smoke", version: "0.0.0" });
await mcp.connect(clientTransport);

const tools = (await mcp.listTools()).tools.map((t) => t.name);
console.log("tools:", tools.join(", "));
if (tools[0] !== "is_change_safe" || tools[tools.length - 1] !== "run_governance_review") {
  throw new Error("tool order regression");
}

const gate = await mcp.callTool({
  name: "is_change_safe",
  arguments: { baseSpecContent: "a", targetSpecContent: "b" },
});
console.log("is_change_safe →", gate.content[0].text.split("\n")[0]);

const diff = await mcp.callTool({
  name: "compare_specs",
  arguments: { baseSpecContent: "a", targetSpecContent: "b", failOnBreaking: true },
});
console.log("compare_specs  →", diff.content[0].text.split("\n")[0]);

await mcp.close();
await server.close();
console.log("SMOKE OK");
