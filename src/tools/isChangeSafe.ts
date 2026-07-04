import { z } from "zod";
import type { ChangeSafetyResponse } from "../backendTypes.js";
import { guarded, resolveBothSpecs, specSourceShape, textResult, type ToolDef } from "./shared.js";

/**
 * THE HERO TOOL — the deploy gate. Registered first.
 */
export const isChangeSafe: ToolDef = {
  name: "is_change_safe",
  title: "Is this API change safe to ship?",
  description:
    "THE DEPLOY GATE. Analyzes whether an API spec change is safe to merge/deploy — will it " +
    "break existing consumers? Returns a safeToMerge verdict, a risk level, the exact blocking " +
    "reasons, and a recommended action. Use this before merging or releasing an API change to " +
    "catch breaking changes before they reach your consumers. Analyzes API contract " +
    "compatibility only; it does NOT modify code.",
  inputSchema: {
    ...specSourceShape,
    specFormat: z.enum(["openapi", "pact"]).optional(),
    environment: z
      .string()
      .optional()
      .describe("Optional target environment, e.g. staging or production."),
  },
  handler: guarded(async (args, ctx) => {
    const { baseSpec, targetSpec } = await resolveBothSpecs(args);
    const res = await ctx.client.post<ChangeSafetyResponse>(
      "/api/intelligence/change-safety",
      { baseSpec, targetSpec, environment: args.environment },
    );
    const header = res.safeToMerge
      ? "✅ SAFE TO MERGE"
      : `⛔ NOT SAFE TO MERGE — risk ${res.riskLevel}`;
    return textResult(header, res);
  }),
};
