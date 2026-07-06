import { describe, expect, it, vi } from "vitest";
import { SpecShieldApiClient } from "../src/client.js";
import { SpecShieldError } from "../src/errors.js";
import { createLogger } from "../src/logger.js";
import type { SpecShieldConfig } from "../src/config.js";

const CONFIG: SpecShieldConfig = {
  apiUrl: "http://backend.test",
  apiKey: "ss_secret_key_value",
  timeoutMs: 1000,
  logLevel: "error",
};
const logger = createLogger("error");

function res(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function client(fetchImpl: typeof fetch, maxAttempts = 3) {
  return new SpecShieldApiClient(CONFIG, logger, { fetchImpl, maxAttempts, baseDelayMs: 0 });
}

describe("SpecShieldApiClient", () => {
  it("returns the parsed JSON and sends the X-Api-Key header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(200, { safeToMerge: true }));
    const out = await client(fetchImpl).post<{ safeToMerge: boolean }>("/x", { a: 1 });
    expect(out.safeToMerge).toBe(true);

    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-Api-Key"]).toBe("ss_secret_key_value");
  });

  it("returns config_error (and never calls fetch) when no API key is set", async () => {
    const fetchImpl = vi.fn();
    const c = new SpecShieldApiClient({ ...CONFIG, apiKey: "" }, logger, {
      fetchImpl,
      maxAttempts: 3,
      baseDelayMs: 0,
    });
    await expect(c.post("/x", {})).rejects.toMatchObject({ code: "config_error" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does NOT retry a 401 and reports auth_error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(401, { error: "nope" }));
    await expect(client(fetchImpl).post("/x", {})).rejects.toMatchObject({ code: "auth_error" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry a 400 and reports validation_error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(400, "Invalid OpenAPI spec"));
    await expect(client(fetchImpl).post("/x", {})).rejects.toMatchObject({
      code: "validation_error",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a 429 up to maxAttempts then gives up (rate_limited)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(429, {}));
    await expect(client(fetchImpl, 3).post("/x", {})).rejects.toMatchObject({
      code: "rate_limited",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("retries a 5xx then succeeds if a later attempt is ok", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(res(503, {}))
      .mockResolvedValueOnce(res(200, { ok: true }));
    const out = await client(fetchImpl).post<{ ok: boolean }>("/x", {});
    expect(out.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("maps an aborted request to a timeout error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    await expect(client(fetchImpl, 2).post("/x", {})).rejects.toMatchObject({ code: "timeout" });
  });

  it("maps a network failure to network_error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(client(fetchImpl, 2).post("/x", {})).rejects.toMatchObject({
      code: "network_error",
    });
  });

  it("never leaks the API key in any error message", async () => {
    for (const status of [401, 400, 429, 500]) {
      const fetchImpl = vi.fn().mockResolvedValue(res(status, "boom"));
      try {
        await client(fetchImpl, 1).post("/x", { baseSpec: "openapi: 3.0.0 SECRET_SPEC" });
      } catch (err) {
        const msg = (err as SpecShieldError).message;
        expect(msg).not.toContain("ss_secret_key_value");
        expect(msg).not.toContain("SECRET_SPEC");
      }
    }
  });
});
