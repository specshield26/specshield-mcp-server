import { z } from "zod";
import type { MigrationAdvice } from "../backendTypes.js";
import { guarded, markdownResult, resolveBothSpecs, specSourceShape, type ToolDef } from "./shared.js";

/**
 * Deterministic migration guide, sourced entirely from the backend
 * (/migration-guide-preview). No migration logic lives here.
 */
export const generateMigrationGuide: ToolDef = {
  name: "generate_migration_guide",
  title: "Generate a migration guide",
  description:
    "Generates a migration guide (markdown) and safe rollout steps for the breaking changes in " +
    "an API spec change. Analyzes API contract compatibility only; it does NOT modify code.",
  inputSchema: {
    ...specSourceShape,
    language: z.enum(["java", "node", "python", "go", "curl", "generic"]).optional(),
  },
  handler: guarded(async (args, ctx) => {
    const { baseSpec, targetSpec } = await resolveBothSpecs(args);
    const advice = await ctx.client.post<MigrationAdvice>(
      "/api/intelligence/migration-guide-preview",
      { baseSpec, targetSpec, language: args.language ?? "generic" },
    );

    const lines = [
      `# Migration guide (${advice.language})`,
      "",
      advice.summary,
      "",
      ...(advice.steps.length > 0
        ? ["## Steps", ...advice.steps.map((s, i) => `${i + 1}. ${s}`)]
        : ["_No breaking changes — no migration required._"]),
      "",
      "## Safe rollout",
      "1. Ship the change behind a new API version where possible.",
      "2. Announce the change and give consumers a migration window.",
      "3. Monitor error rates on affected endpoints after release.",
    ];
    return markdownResult(lines.join("\n"));
  }),
};
