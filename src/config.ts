import { ConfigError } from "./errors.js";

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
  const apiKey = env.SPECSHIELD_API_KEY?.trim();
  if (!apiKey) {
    throw new ConfigError(
      "SPECSHIELD_API_KEY is required. Set it to a SpecShield API key from " +
        "https://specshield.io/account (store it as a secret; never commit it).",
    );
  }

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
