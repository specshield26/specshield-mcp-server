import { z } from "zod";
import type { ReleaseNotesPreview } from "../backendTypes.js";
import { guarded, markdownResult, resolveBothSpecs, specSourceShape, type ToolDef } from "./shared.js";

/**
 * Deterministic release notes, sourced from the backend (/release-notes-preview).
 */
export const generateReleaseNotes: ToolDef = {
  name: "generate_release_notes",
  title: "Generate release notes",
  description:
    "Generates release notes (markdown) for an API spec change, grouped into breaking changes, " +
    "additions, and other changes, tailored to an audience. Analyzes API contract compatibility " +
    "only; it does NOT modify code.",
  inputSchema: {
    ...specSourceShape,
    audience: z.enum(["developer", "customer", "internal"]).optional(),
  },
  handler: guarded(async (args, ctx) => {
    const { baseSpec, targetSpec } = await resolveBothSpecs(args);
    const notes = await ctx.client.post<ReleaseNotesPreview>(
      "/api/intelligence/release-notes-preview",
      { baseSpec, targetSpec, audience: args.audience ?? "developer" },
    );
    return markdownResult(notes.markdown);
  }),
};
