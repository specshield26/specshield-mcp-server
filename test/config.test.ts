import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("does not throw when the API key is missing (enforced later, at call time)", () => {
    const cfg = loadConfig({});
    expect(cfg.apiKey).toBe("");
    expect(cfg.apiUrl).toBe("https://api.specshield.io");
  });

  it("applies defaults", () => {
    const cfg = loadConfig({ SPECSHIELD_API_KEY: "ss_test" });
    expect(cfg.apiUrl).toBe("https://api.specshield.io");
    expect(cfg.timeoutMs).toBe(30000);
    expect(cfg.logLevel).toBe("info");
  });

  it("honors overrides and strips trailing slash from the URL", () => {
    const cfg = loadConfig({
      SPECSHIELD_API_KEY: "ss_test",
      SPECSHIELD_API_URL: "http://localhost:8081/",
      SPECSHIELD_TIMEOUT_MS: "5000",
      SPECSHIELD_LOG_LEVEL: "debug",
    });
    expect(cfg.apiUrl).toBe("http://localhost:8081");
    expect(cfg.timeoutMs).toBe(5000);
    expect(cfg.logLevel).toBe("debug");
  });

  it("falls back on invalid timeout / log level", () => {
    const cfg = loadConfig({
      SPECSHIELD_API_KEY: "ss_test",
      SPECSHIELD_TIMEOUT_MS: "-3",
      SPECSHIELD_LOG_LEVEL: "loud",
    });
    expect(cfg.timeoutMs).toBe(30000);
    expect(cfg.logLevel).toBe("info");
  });
});
