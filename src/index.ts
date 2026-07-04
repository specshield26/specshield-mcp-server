#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { SpecShieldApiClient } from "./client.js";
import { createServer } from "./server.js";
import { SpecShieldError } from "./errors.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const client = new SpecShieldApiClient(config, logger);
  const server = createServer({ client, logger });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // apiUrl is safe to log; the API key is never logged.
  logger.info("specshield-mcp-server started (stdio)", { apiUrl: config.apiUrl });
}

main().catch((err) => {
  const message =
    err instanceof SpecShieldError ? err.message : "Failed to start specshield-mcp-server.";
  process.stderr.write(`[specshield-mcp] fatal: ${message}\n`);
  process.exit(1);
});
