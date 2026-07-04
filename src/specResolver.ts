import { readFile } from "node:fs/promises";
import { SpecShieldError } from "./errors.js";

export interface SpecSource {
  content?: string;
  path?: string;
}

/**
 * Resolves a spec to its text content from either inline content or a file path.
 * A path is only read when the user explicitly passed one through the MCP client.
 * Error messages never include the spec content (and only a generic note about
 * the path, not the file body).
 */
export async function resolveSpec(source: SpecSource, label: string): Promise<string> {
  if (source.content && source.content.trim().length > 0) {
    return source.content;
  }
  if (source.path && source.path.trim().length > 0) {
    try {
      return await readFile(source.path, "utf8");
    } catch {
      throw new SpecShieldError(
        "validation_error",
        `Could not read the ${label} spec from the provided file path.`,
      );
    }
  }
  throw new SpecShieldError(
    "validation_error",
    `Provide either ${label}SpecContent or ${label}SpecPath.`,
  );
}
