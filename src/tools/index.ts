import { isChangeSafe } from "./isChangeSafe.js";
import { explainBreakingChanges } from "./explainBreakingChanges.js";
import { generateMigrationGuide } from "./generateMigrationGuide.js";
import { generateReleaseNotes } from "./generateReleaseNotes.js";
import { compareSpecs } from "./compareSpecs.js";
import { runGovernanceReview } from "./runGovernanceReview.js";
import type { ToolDef } from "./shared.js";

/**
 * Registration order IS the pitch: the differentiated deploy gate
 * (is_change_safe) is first; the free breaking-change tools follow; the
 * table-stakes raw diff (compare_specs) closes out the free set; and
 * run_governance_review — the paid, beyond-breaking-changes ruleset (backed by
 * /api/governance/review) — is the premium closer last.
 *
 * Every registered tool calls the backend rather than fabricating results.
 */
export const TOOLS: ToolDef[] = [
  isChangeSafe,
  explainBreakingChanges,
  generateMigrationGuide,
  generateReleaseNotes,
  compareSpecs,
  runGovernanceReview,
];
