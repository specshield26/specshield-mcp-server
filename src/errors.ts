/**
 * Machine-readable error codes surfaced to the MCP client. Deliberately coarse
 * and free of any spec content or credentials.
 */
export type ErrorCode =
  | "config_error"
  | "validation_error"
  | "auth_error"
  | "rate_limited"
  | "backend_error"
  | "timeout"
  | "network_error"
  | "not_available";

/**
 * The only error type this server throws outward. Its message is safe to show
 * an end user: it never contains spec content, API keys, JWTs, or request bodies.
 */
export class SpecShieldError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "SpecShieldError";
  }

  /** Structured, safe payload for a tool's `isError` result. */
  toPayload(): { error: { code: ErrorCode; message: string; status?: number } } {
    return { error: { code: this.code, message: this.message, status: this.status } };
  }
}

export class ConfigError extends SpecShieldError {
  constructor(message: string) {
    super("config_error", message);
  }
}
