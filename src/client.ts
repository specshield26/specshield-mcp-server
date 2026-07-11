import type { SpecShieldConfig } from "./config.js";
import type { Logger } from "./logger.js";
import { SpecShieldError } from "./errors.js";

export interface ApiClientOptions {
  /** Total attempts including the first (retries = maxAttempts - 1). */
  maxAttempts?: number;
  /** Base backoff in ms; delay grows linearly per attempt. 0 disables sleeping (tests). */
  baseDelayMs?: number;
  /** Injectable fetch + sleep for tests. */
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
}

/**
 * Thin HTTP adapter over the SpecShield backend `/api/intelligence/**` endpoints.
 * It holds NO diff/risk logic — every result comes from the backend.
 *
 * Contract:
 *  - sends `X-Api-Key` on every request;
 *  - retries only transient 429 / 5xx / network / timeout, up to `maxAttempts`;
 *  - never retries 4xx validation/auth errors;
 *  - enforces `SPECSHIELD_TIMEOUT_MS`;
 *  - throws {@link SpecShieldError} whose message never contains the spec, the
 *    API key, or the request body.
 */
export class SpecShieldApiClient {
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly config: SpecShieldConfig,
    private readonly logger: Logger,
    options: ApiClientOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 300;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleepImpl ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /** POST a JSON body and return the parsed JSON response. */
  async post<T>(path: string, body: unknown): Promise<T> {
    if (!this.config.apiKey) {
      throw new SpecShieldError(
        "config_error",
        "SPECSHIELD_API_KEY is required. Set it to a SpecShield API key from " +
          "https://specshield.io/account (store it as a secret; never commit it).",
      );
    }
    const url = `${this.config.apiUrl}${path}`;

    for (let attempt = 1; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const res = await this.fetchImpl(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": this.config.apiKey,
            "X-SpecShield-Client": "mcp",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (res.ok) {
          return (await res.json()) as T;
        }

        const status = res.status;
        // 4xx auth/validation: never retry.
        if (status === 401 || status === 403) {
          throw new SpecShieldError(
            "auth_error",
            "SpecShield rejected the API key. Check SPECSHIELD_API_KEY.",
            status,
          );
        }
        if (status === 402) {
          throw new SpecShieldError(
            "payment_required",
            "This SpecShield feature requires a paid plan (Team or above). " +
              "Upgrade at https://specshield.io/pricing, then retry with a paid API key.",
            status,
          );
        }
        if (status >= 400 && status < 500 && status !== 429) {
          throw new SpecShieldError(
            "validation_error",
            `SpecShield rejected the request as invalid (HTTP ${status}). ` +
              "Check that both specs are valid OpenAPI.",
            status,
          );
        }
        // 429 / 5xx: retry if attempts remain.
        if (attempt < this.maxAttempts) {
          this.logger.debug("retrying after transient status", { status, attempt });
          await this.backoff(attempt);
          continue;
        }
        throw new SpecShieldError(
          status === 429 ? "rate_limited" : "backend_error",
          `SpecShield request failed after ${this.maxAttempts} attempts (HTTP ${status}).`,
          status,
        );
      } catch (err) {
        if (err instanceof SpecShieldError) throw err;

        const aborted = err instanceof Error && err.name === "AbortError";
        if (attempt < this.maxAttempts) {
          this.logger.debug("retrying after transient error", {
            attempt,
            kind: aborted ? "timeout" : "network",
          });
          await this.backoff(attempt);
          continue;
        }
        if (aborted) {
          throw new SpecShieldError(
            "timeout",
            `SpecShield request timed out after ${this.config.timeoutMs}ms.`,
          );
        }
        throw new SpecShieldError("network_error", "Could not reach SpecShield.");
      } finally {
        clearTimeout(timer);
      }
    }
  }

  private async backoff(attempt: number): Promise<void> {
    if (this.baseDelayMs > 0) await this.sleep(this.baseDelayMs * attempt);
  }
}
