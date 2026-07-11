import type { GovernanceReviewResponse } from "../backendTypes.js";
import {
  guarded,
  resolveSingleSpec,
  singleSpecShape,
  textResult,
  type ToolDef,
} from "./shared.js";

/**
 * The paid governance ruleset — design/policy checks beyond breaking changes.
 * Requires a Team-or-above plan; the backend returns 402 for FREE keys, which
 * the client surfaces as a `payment_required` error.
 */
export const runGovernanceReview: ToolDef = {
  name: "run_governance_review",
  title: "Review an API spec against governance rules",
  description:
    "Runs SpecShield's deterministic API governance ruleset against a single OpenAPI spec — " +
    "design and policy checks that go beyond breaking changes: missing operationId, undocumented " +
    "error responses, no declared security scheme, missing pagination, inconsistent versioning, " +
    "unconstrained additionalProperties, and more. Returns located findings, each with a severity " +
    "and a suggested fix. Paid feature (Team plan or above). Analyzes the spec only; it does NOT " +
    "modify code.",
  inputSchema: {
    ...singleSpecShape,
  },
  handler: guarded(async (args, ctx) => {
    const spec = await resolveSingleSpec(args);
    const res = await ctx.client.post<GovernanceReviewResponse>("/api/governance/review", {
      spec,
      ruleset: null,
    });
    const header = `🔎 ${res.summary ?? `${res.findings?.length ?? 0} finding(s)`}`;
    return textResult(header, res);
  }),
};
