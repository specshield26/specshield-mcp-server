/**
 * Shapes returned by the SpecShield backend /api/intelligence/** endpoints
 * (Phase 1 facade). Kept in one place so the tools stay thin mappers.
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ChangeItem {
  type: string;
  changeId: string;
  path: string | null;
  method: string | null;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  severity: string;
}

export interface RiskScore {
  level: RiskLevel;
  score: number;
  breakingCount: number;
  totalChanges: number;
  summary: string;
}

/** POST /api/intelligence/change-safety */
export interface ChangeSafetyResponse {
  safeToMerge: boolean;
  riskLevel: RiskLevel;
  blockingReasons: string[];
  recommendedAction: string;
  reportUrl?: string;
  environment?: string;
}

/** POST /api/intelligence/compare */
export interface IntelligenceCompareResponse {
  breakingChanges: ChangeItem[];
  additions: ChangeItem[];
  modifications: ChangeItem[];
  warnings: ChangeItem[];
  risk: RiskScore;
  safeToMerge: boolean;
  compatibilitySummary: string;
}

/** POST /api/intelligence/release-notes-preview */
export interface ReleaseNotesPreview {
  audience: string;
  markdown: string;
}

/** POST /api/intelligence/migration-guide-preview */
export interface MigrationAdvice {
  summary: string;
  steps: string[];
  language: string;
}
