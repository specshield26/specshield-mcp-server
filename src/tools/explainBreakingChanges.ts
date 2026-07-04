import type { IntelligenceCompareResponse, MigrationAdvice } from "../backendTypes.js";
import {
  consumerImpact,
  guarded,
  resolveBothSpecs,
  specSourceShape,
  textResult,
  type ToolDef,
} from "./shared.js";

/**
 * Explains the breaking changes in plain language. Deterministic in the MVP: it
 * sources the changes and the migration steps entirely from the backend
 * (/compare + /migration-guide-preview) and only reshapes them — no diff or risk
 * logic lives here. AI-enhanced explanations arrive after Phase 4.
 */
export const explainBreakingChanges: ToolDef = {
  name: "explain_breaking_changes",
  title: "Explain the breaking changes",
  description:
    "Explains what breaks in an API spec change and why, with developer impact, likely consumer " +
    "impact, and suggested migration steps. Analyzes API contract compatibility only; it does " +
    "NOT modify code.",
  inputSchema: { ...specSourceShape },
  handler: guarded(async (args, ctx) => {
    const { baseSpec, targetSpec } = await resolveBothSpecs(args);
    const cmp = await ctx.client.post<IntelligenceCompareResponse>(
      "/api/intelligence/compare",
      { baseSpec, targetSpec },
    );
    const migration = await ctx.client.post<MigrationAdvice>(
      "/api/intelligence/migration-guide-preview",
      { baseSpec, targetSpec, language: "generic" },
    );

    const breaking = cmp.breakingChanges ?? [];
    const result = {
      explanation:
        breaking.length > 0
          ? `${breaking.length} breaking change(s) detected between the two specs.`
          : "No breaking changes detected.",
      breakingChanges: breaking.map((c) => ({
        change: c.type,
        where: `${(c.method ?? "").toUpperCase()} ${c.path ?? ""}`.trim(),
        detail: c.description,
      })),
      developerImpact: cmp.risk.summary,
      likelyConsumerImpact: consumerImpact(cmp.risk.level),
      suggestedMigration: migration.steps,
    };
    const header =
      breaking.length > 0 ? `⛔ ${breaking.length} breaking change(s)` : "✅ No breaking changes";
    return textResult(header, result);
  }),
};
