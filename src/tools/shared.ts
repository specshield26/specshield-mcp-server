import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { SpecShieldApiClient } from "../client.js";
import type { Logger } from "../logger.js";
import { SpecShieldError } from "../errors.js";
import { resolveSpec } from "../specResolver.js";
import type { RiskLevel } from "../backendTypes.js";

export interface ToolContext {
  client: SpecShieldApiClient;
  logger: Logger;
}

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<CallToolResult>;
}

/** base/target spec inputs shared by every tool (inline content or a file path). */
export const specSourceShape = {
  baseSpecContent: z.string().optional().describe("Inline base (old) spec content."),
  baseSpecPath: z.string().optional().describe("Path to the base (old) spec file."),
  targetSpecContent: z.string().optional().describe("Inline target (new) spec content."),
  targetSpecPath: z.string().optional().describe("Path to the target (new) spec file."),
};

export async function resolveBothSpecs(
  args: Record<string, unknown>,
): Promise<{ baseSpec: string; targetSpec: string }> {
  const baseSpec = await resolveSpec(
    { content: args.baseSpecContent as string, path: args.baseSpecPath as string },
    "base",
  );
  const targetSpec = await resolveSpec(
    { content: args.targetSpecContent as string, path: args.targetSpecPath as string },
    "target",
  );
  return { baseSpec, targetSpec };
}

/** A single-spec input (governance reviews one spec, not a base/target pair). */
export const singleSpecShape = {
  specContent: z.string().optional().describe("Inline OpenAPI spec content (YAML or JSON)."),
  specPath: z.string().optional().describe("Path to an OpenAPI spec file."),
};

export async function resolveSingleSpec(args: Record<string, unknown>): Promise<string> {
  const content = args.specContent as string | undefined;
  const path = args.specPath as string | undefined;
  if (content && content.trim().length > 0) return content;
  if (path && path.trim().length > 0) return resolveSpec({ path }, "OpenAPI");
  throw new SpecShieldError("validation_error", "Provide either specContent or specPath.");
}

export function textResult(header: string, data: unknown): CallToolResult {
  const body = JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text: header ? `${header}\n\n${body}` : body }] };
}

export function markdownResult(markdown: string): CallToolResult {
  return { content: [{ type: "text", text: markdown }] };
}

export function errorResult(err: unknown): CallToolResult {
  const e =
    err instanceof SpecShieldError
      ? err
      : new SpecShieldError("backend_error", "Unexpected error while contacting SpecShield.");
  return { isError: true, content: [{ type: "text", text: JSON.stringify(e.toPayload(), null, 2) }] };
}

/** Wrap a handler so any error becomes a safe, machine-readable isError result. */
export function guarded(
  fn: (args: Record<string, unknown>, ctx: ToolContext) => Promise<CallToolResult>,
): ToolDef["handler"] {
  return async (args, ctx) => {
    try {
      return await fn(args, ctx);
    } catch (err) {
      // Log the code only — never the message body, spec, or key.
      ctx.logger.warn("tool call failed", {
        code: err instanceof SpecShieldError ? err.code : "unknown",
      });
      return errorResult(err);
    }
  };
}

export function consumerImpact(level: RiskLevel): string {
  switch (level) {
    case "CRITICAL":
      return "Existing consumers will break until they are updated.";
    case "HIGH":
      return "Existing consumers are likely to break; coordinate an upgrade.";
    case "MEDIUM":
      return "No breaking changes, but consumers may see behavior differences.";
    case "LOW":
    default:
      return "Additive/non-breaking; existing consumers are unaffected.";
  }
}
