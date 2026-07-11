import { describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { createLogger } from "../src/logger.js";
import type { SpecShieldApiClient } from "../src/client.js";

async function connect(responses: Record<string, unknown>) {
  const post = vi.fn(async (path: string) => responses[path] ?? {});
  const server = createServer({
    client: { post } as unknown as SpecShieldApiClient,
    logger: createLogger("error"),
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientTransport);
  return { client, post };
}

describe("MCP server", () => {
  it("registers the tools in pitch order (deploy gate first, paid governance last)", async () => {
    const { client } = await connect({});
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toEqual([
      "is_change_safe",
      "explain_breaking_changes",
      "generate_migration_guide",
      "generate_release_notes",
      "compare_specs",
      "run_governance_review",
    ]);
    expect(names[0]).toBe("is_change_safe");
    expect(names[names.length - 1]).toBe("run_governance_review");
  });

  it("exposes governance and keeps every tool read-only / analyze-only", async () => {
    const { client } = await connect({});
    const tools = (await client.listTools()).tools;
    const names = tools.map((t) => t.name);
    expect(names).toContain("run_governance_review");
    // no mutation/shell tools; every tool is read-only
    for (const t of tools) {
      expect(t.annotations?.readOnlyHint).toBe(true);
    }
  });

  it("exposes exactly the help resource", async () => {
    const { client } = await connect({});
    const resources = (await client.listResources()).resources;
    expect(resources.map((r) => r.uri)).toEqual(["specshield://help/tools"]);
    const read = await client.readResource({ uri: "specshield://help/tools" });
    expect(String(read.contents[0].text).toLowerCase()).toContain("deploy gate");
  });

  it("routes a tool call through to the backend client", async () => {
    const { client, post } = await connect({
      "/api/intelligence/change-safety": { safeToMerge: true, riskLevel: "LOW", blockingReasons: [], recommendedAction: "ok" },
    });
    const result = await client.callTool({
      name: "is_change_safe",
      arguments: { baseSpecContent: "a", targetSpecContent: "b" },
    });
    expect(post).toHaveBeenCalledWith("/api/intelligence/change-safety", expect.any(Object));
    const content = result.content as Array<{ text?: string }>;
    expect(content.map((c) => c.text).join("")).toContain("SAFE TO MERGE");
  });
});
