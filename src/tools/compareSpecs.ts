import { z } from "zod";
import type { IntelligenceCompareResponse } from "../backendTypes.js";
import { guarded, resolveBothSpecs, specSourceShape, textResult, type ToolDef } from "./shared.js";

/**
 * Table-stakes raw diff — registered LAST. The differentiated value is the
 * deploy gate (is_change_safe); this is here for completeness.
 */
export const compareSpecs: ToolDef = {
  name: "compare_specs",
  title: "Compare two API specs",
  description:
    "Compares two API specs and lists breaking changes, additions, modifications, and warnings " +
    "with a risk score and compatibility summary. For a merge/deploy decision prefer " +
    "is_change_safe. Analyzes API contract compatibility only; it does NOT modify code.",
  inputSchema: {
    ...specSourceShape,
    specFormat: z.enum(["openapi", "pact"]).optional(),
    failOnBreaking: z
      .boolean()
      .optional()
      .describe("If true, the header flags when any breaking change is present."),
  },
  handler: guarded(async (args, ctx) => {
    const { baseSpec, targetSpec } = await resolveBothSpecs(args);
    const res = await ctx.client.post<IntelligenceCompareResponse>(
      "/api/intelligence/compare",
      { baseSpec, targetSpec, specFormat: args.specFormat },
    );
    const breakingCount = res.breakingChanges?.length ?? 0;
    const header =
      args.failOnBreaking && breakingCount > 0
        ? `⛔ ${breakingCount} breaking change(s) (failOnBreaking) — risk ${res.risk.level}`
        : `risk ${res.risk.level} · ${breakingCount} breaking · ${res.additions?.length ?? 0} additions`;
    return textResult(header, res);
  }),
};
