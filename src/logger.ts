import type { LogLevel } from "./config.js";

const RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

/**
 * Minimal level-gated logger. Writes to **stderr** only — stdout is reserved for
 * the MCP JSON-RPC stream. Callers must never pass spec content, API keys, JWTs,
 * or request bodies as `msg`/`meta`; this logger does not attempt to parse specs
 * out of arbitrary strings, so the discipline lives at the call sites.
 */
export function createLogger(level: LogLevel = "info"): Logger {
  const threshold = RANK[level];
  const emit = (lvl: LogLevel, msg: string, meta?: Record<string, unknown>) => {
    if (RANK[lvl] < threshold) return;
    const line = meta
      ? `[specshield-mcp] ${lvl}: ${msg} ${JSON.stringify(meta)}`
      : `[specshield-mcp] ${lvl}: ${msg}`;
    process.stderr.write(line + "\n");
  };
  return {
    debug: (m, meta) => emit("debug", m, meta),
    info: (m, meta) => emit("info", m, meta),
    warn: (m, meta) => emit("warn", m, meta),
    error: (m, meta) => emit("error", m, meta),
  };
}
