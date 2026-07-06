export type LogLevel = "debug" | "info" | "warn" | "error";

export interface SpecShieldConfig {
  apiUrl: string;
  apiKey: string;
  timeoutMs: number;
  logLevel: LogLevel;
}

const DEFAULT_API_URL = "https://api.specshield.io";
const DEFAULT_TIMEOUT_MS = 30_000;
const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

/**
 * Loads configuration from environment variables. SPECSHIELD_API_KEY is required;
 * everything else has a sensible default. Throws {@link ConfigError} (never
 * echoing the key) when the key is missing.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): SpecShieldConfig {
  // The key is optional at load time so the server can start and answer MCP
  // introspection (tools/list) without any secret — e.g. Glama's automated
  // checks, or a client inspecting the server before it's configured. It is
  // enforced the moment a tool actually calls the backend (SpecShieldApiClient).
  const apiKey = env.SPECSHIELD_API_KEY?.trim() ?? "";

  const apiUrl = (env.SPECSHIELD_API_URL?.trim() || DEFAULT_API_URL).replace(/\/+$/, "");

  const timeoutMs = parsePositiveInt(env.SPECSHIELD_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);

  const rawLevel = env.SPECSHIELD_LOG_LEVEL?.trim().toLowerCase();
  const logLevel: LogLevel = (LOG_LEVELS as readonly string[]).includes(rawLevel ?? "")
    ? (rawLevel as LogLevel)
    : "info";

  return { apiUrl, apiKey, timeoutMs, logLevel };
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
