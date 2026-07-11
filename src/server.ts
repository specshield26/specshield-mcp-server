import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpecShieldApiClient } from "./client.js";
import type { Logger } from "./logger.js";
import type { ToolContext } from "./tools/shared.js";
import { TOOLS } from "./tools/index.js";
import { HELP_TEXT } from "./resources/help.js";

export const SERVER_NAME = "specshield-mcp-server";
export const SERVER_VERSION = "1.1.0";

export interface ServerDeps {
  client: SpecShieldApiClient;
  logger: Logger;
}

/**
 * Builds the MCP server with all tools registered in pitch order and the single
 * read-only help resource. `deps.client` is injectable so tests can mock the
 * backend without any network I/O.
 */
export function createServer(deps: ServerDeps): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const ctx: ToolContext = { client: deps.client, logger: deps.logger };

  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
      },
      (args: Record<string, unknown>) => tool.handler(args, ctx),
    );
  }

  server.registerResource(
    "help",
    "specshield://help/tools",
    {
      title: "SpecShield MCP tools",
      description: "How to use the SpecShield deploy-gate tools.",
      mimeType: "text/markdown",
    },
    async (uri: URL) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: HELP_TEXT }],
    }),
  );

  return server;
}
