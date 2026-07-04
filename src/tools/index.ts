import { isChangeSafe } from "./isChangeSafe.js";
import { explainBreakingChanges } from "./explainBreakingChanges.js";
import { generateMigrationGuide } from "./generateMigrationGuide.js";
import { generateReleaseNotes } from "./generateReleaseNotes.js";
import { compareSpecs } from "./compareSpecs.js";
import type { ToolDef } from "./shared.js";

/**
 * Registration order IS the pitch: the differentiated deploy gate
 * (is_change_safe) is first; the table-stakes raw diff (compare_specs) is last.
 *
 * `run_governance_review` is intentionally NOT registered in the MVP: there is
 * no backend governance endpoint yet (it ships with /api/governance in Phase 4),
 * and every registered tool must call the backend rather than fabricate results.
 */
export const TOOLS: ToolDef[] = [
  isChangeSafe,
  explainBreakingChanges,
  generateMigrationGuide,
  generateReleaseNotes,
  compareSpecs,
];
