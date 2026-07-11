import { describe, expect, it, vi } from "vitest";
import { createLogger } from "../src/logger.js";
import { SpecShieldError } from "../src/errors.js";
import type { SpecShieldApiClient } from "../src/client.js";
import type { ToolContext } from "../src/tools/shared.js";
import { isChangeSafe } from "../src/tools/isChangeSafe.js";
import { explainBreakingChanges } from "../src/tools/explainBreakingChanges.js";
import { generateMigrationGuide } from "../src/tools/generateMigrationGuide.js";
import { generateReleaseNotes } from "../src/tools/generateReleaseNotes.js";
import { compareSpecs } from "../src/tools/compareSpecs.js";
import { runGovernanceReview } from "../src/tools/runGovernanceReview.js";

const logger = createLogger("error");

function ctxWith(responses: Record<string, unknown>): {
  ctx: ToolContext;
  post: ReturnType<typeof vi.fn>;
} {
  const post = vi.fn(async (path: string) => {
    if (!(path in responses)) throw new SpecShieldError("backend_error", "unexpected path");
    return responses[path];
  });
  const client = { post } as unknown as SpecShieldApiClient;
  return { ctx: { client, logger }, post };
}

function text(result: { content: Array<{ text?: string }> }): string {
  return result.content.map((c) => c.text ?? "").join("\n");
}

const SPECS = { baseSpecContent: "SECRET_BASE_SPEC", targetSpecContent: "SECRET_TARGET_SPEC" };

describe("is_change_safe (hero)", () => {
  it("posts to /change-safety and surfaces the verdict", async () => {
    const { ctx, post } = ctxWith({
      "/api/intelligence/change-safety": {
        safeToMerge: false,
        riskLevel: "CRITICAL",
        blockingReasons: ["GET /b was removed"],
        recommendedAction: "Do not merge as-is.",
      },
    });
    const out = await isChangeSafe.handler(SPECS, ctx);
    expect(post).toHaveBeenCalledWith(
      "/api/intelligence/change-safety",
      expect.objectContaining({ baseSpec: "SECRET_BASE_SPEC", targetSpec: "SECRET_TARGET_SPEC" }),
    );
    expect(out.isError).toBeFalsy();
    expect(text(out)).toContain("NOT SAFE TO MERGE");
    expect(text(out)).toContain("CRITICAL");
  });

  it("returns a validation error when no spec is provided", async () => {
    const { ctx, post } = ctxWith({});
    const out = await isChangeSafe.handler({}, ctx);
    expect(out.isError).toBe(true);
    expect(text(out)).toContain("validation_error");
    expect(post).not.toHaveBeenCalled();
  });

  it("surfaces a backend error safely without leaking the spec", async () => {
    const post = vi.fn().mockRejectedValue(new SpecShieldError("auth_error", "key rejected", 401));
    const ctx = { client: { post } as unknown as SpecShieldApiClient, logger };
    const out = await isChangeSafe.handler(SPECS, ctx);
    expect(out.isError).toBe(true);
    expect(text(out)).toContain("auth_error");
    expect(text(out)).not.toContain("SECRET_BASE_SPEC");
  });
});

describe("the other tools call the backend and never echo the input spec", () => {
  it("explain_breaking_changes queries /compare and /migration-guide-preview", async () => {
    const { ctx, post } = ctxWith({
      "/api/intelligence/compare": {
        breakingChanges: [{ type: "ENDPOINT_REMOVED", method: "get", path: "/b", description: "removed" }],
        additions: [],
        risk: { level: "CRITICAL", summary: "1 breaking change" },
      },
      "/api/intelligence/migration-guide-preview": { summary: "s", steps: ["do x"], language: "generic" },
    });
    const out = await explainBreakingChanges.handler(SPECS, ctx);
    expect(post).toHaveBeenCalledWith("/api/intelligence/compare", expect.any(Object));
    expect(post).toHaveBeenCalledWith("/api/intelligence/migration-guide-preview", expect.any(Object));
    expect(text(out)).toContain("breaking change");
    expect(text(out)).not.toContain("SECRET_BASE_SPEC");
  });

  it("generate_migration_guide renders markdown from the backend advice", async () => {
    const { ctx } = ctxWith({
      "/api/intelligence/migration-guide-preview": {
        summary: "1 breaking change requires updates.",
        steps: ["Stop calling GET /b"],
        language: "java",
      },
    });
    const out = await generateMigrationGuide.handler({ ...SPECS, language: "java" }, ctx);
    expect(text(out)).toContain("Migration guide (java)");
    expect(text(out)).toContain("Stop calling GET /b");
  });

  it("generate_release_notes returns the backend markdown", async () => {
    const { ctx } = ctxWith({
      "/api/intelligence/release-notes-preview": { audience: "customer", markdown: "## API changes\n- x" },
    });
    const out = await generateReleaseNotes.handler({ ...SPECS, audience: "customer" }, ctx);
    expect(text(out)).toContain("## API changes");
  });

  it("compare_specs flags breaking changes when failOnBreaking is set", async () => {
    const { ctx } = ctxWith({
      "/api/intelligence/compare": {
        breakingChanges: [{ type: "ENDPOINT_REMOVED" }],
        additions: [],
        risk: { level: "CRITICAL" },
      },
    });
    const out = await compareSpecs.handler({ ...SPECS, failOnBreaking: true }, ctx);
    expect(text(out)).toContain("failOnBreaking");
    expect(text(out)).not.toContain("SECRET_TARGET_SPEC");
  });
});

describe("run_governance_review (paid)", () => {
  const SPEC = { specContent: "SECRET_GOV_SPEC" };

  it("posts a single spec to /api/governance/review and surfaces findings", async () => {
    const { ctx, post } = ctxWith({
      "/api/governance/review": {
        findings: [
          { ruleId: "security-scheme-missing", severity: "warning", message: "GET /Users: no security", suggestedFix: "Declare security." },
        ],
        errorCount: 0,
        warningCount: 1,
        infoCount: 0,
        summary: "1 finding(s): 0 error, 1 warning, 0 info.",
      },
    });
    const out = await runGovernanceReview.handler(SPEC, ctx);
    expect(post).toHaveBeenCalledWith(
      "/api/governance/review",
      expect.objectContaining({ spec: "SECRET_GOV_SPEC" }),
    );
    expect(out.isError).toBeFalsy();
    expect(text(out)).toContain("security-scheme-missing");
    expect(text(out)).toContain("1 finding(s)");
  });

  it("returns a validation error when no spec is provided", async () => {
    const { ctx, post } = ctxWith({});
    const out = await runGovernanceReview.handler({}, ctx);
    expect(out.isError).toBe(true);
    expect(text(out)).toContain("validation_error");
    expect(post).not.toHaveBeenCalled();
  });

  it("surfaces a paid-plan (402) error without leaking the spec", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(new SpecShieldError("payment_required", "requires a paid plan", 402));
    const ctx = { client: { post } as unknown as SpecShieldApiClient, logger };
    const out = await runGovernanceReview.handler(SPEC, ctx);
    expect(out.isError).toBe(true);
    expect(text(out)).toContain("payment_required");
    expect(text(out)).not.toContain("SECRET_GOV_SPEC");
  });
});
