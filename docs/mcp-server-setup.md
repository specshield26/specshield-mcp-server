# SpecShield MCP Server — Setup & Operations

A complete setup, configuration, verification, and troubleshooting guide for the
SpecShield MCP server. For the quickstart, see the [README](../README.md).

The server brings the **API-change deploy gate** into your AI coding agent: *"is it
safe to ship this API change to my consumers?"* It is a thin adapter over the
SpecShield backend and is **read-only / analyze-only — it never modifies your code.**

---

## 1. Prerequisites

- **Node.js ≥ 20** (`node -v`). Installing via `npx` also needs npm.
- A **SpecShield account and API key** — create one at
  [specshield.io/account](https://specshield.io/account). The key is passed to the
  server as `SPECSHIELD_API_KEY`. Treat it like a password: store it as a secret,
  never commit it.
- An MCP-capable client: Claude Desktop, Claude Code, Cursor, or any other stdio MCP client.

---

## 2. Install

### Option A — `npx` (recommended)
No global install; the client launches it on demand:
```bash
npx -y specshield-mcp-server
```

### Option B — global install
```bash
npm install -g specshield-mcp-server
specshield-mcp        # the installed binary
```

### Option C — from source (development)
```bash
git clone <repo-url> specshield-mcp-server
cd specshield-mcp-server
npm install
npm run build
node dist/index.js
```

The server speaks MCP over **stdio**. Run directly it will appear to "hang" — that's
expected; it's waiting for an MCP client on stdin/stdout. Use a client, or `npm run smoke`.

---

## 3. Client configuration

All clients use the same shape: a `command` + `args` that launch the server, and an
`env` block carrying `SPECSHIELD_API_KEY`.

### Claude Desktop
Edit `claude_desktop_config.json`:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "specshield": {
      "command": "npx",
      "args": ["-y", "specshield-mcp-server"],
      "env": { "SPECSHIELD_API_KEY": "ss_your_key_here" }
    }
  }
}
```
Fully quit and reopen Claude Desktop after editing.

### Claude Code
```bash
claude mcp add specshield \
  --env SPECSHIELD_API_KEY=ss_your_key_here \
  -- npx -y specshield-mcp-server
```
Or commit a project-scoped `.mcp.json` (shareable with your team) using the same
`mcpServers` shape as above.

### Cursor
- Global: `~/.cursor/mcp.json`
- Project: `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "specshield": {
      "command": "npx",
      "args": ["-y", "specshield-mcp-server"],
      "env": { "SPECSHIELD_API_KEY": "ss_your_key_here" }
    }
  }
}
```

### Any other stdio MCP client
Point it at `command: npx`, `args: ["-y", "specshield-mcp-server"]`, and set
`SPECSHIELD_API_KEY` in the environment.

---

## 4. Configuration reference

| Env var | Required | Default | Purpose |
|---------|----------|---------|---------|
| `SPECSHIELD_API_KEY` | **yes** | — | SpecShield API key. |
| `SPECSHIELD_API_URL` | no | `https://api.specshield.io` | Backend base URL. Override for **self-hosted / staging**. |
| `SPECSHIELD_TIMEOUT_MS` | no | `30000` | Per-request timeout in ms. |
| `SPECSHIELD_LOG_LEVEL` | no | `info` | `debug` \| `info` \| `warn` \| `error`. Logs are written to **stderr** only. |

Transient failures (HTTP 429/5xx, network hiccups, timeouts) are retried with
bounded backoff; authentication (401/403) and validation (4xx) errors are **not**
retried.

---

## 5. Verify it works

1. **List tools in your client.** You should see six tools, in this order:
   `is_change_safe`, `explain_breaking_changes`, `generate_migration_guide`,
   `generate_release_notes`, `compare_specs`, `run_governance_review`.
2. **Read the help resource** `specshield://help/tools`.
3. **Ask the deploy gate** (see example prompts below).
4. **From source**, run the offline smoke test (no backend needed):
   ```bash
   npm run smoke
   # → tools: is_change_safe, …, run_governance_review
   # → is_change_safe → ⛔/✅ …
   # → SMOKE OK
   ```

---

## 6. Tools & example prompts

| Tool | Use it for |
|------|-----------|
| `is_change_safe` ⭐ | The deploy gate — a `safeToMerge` verdict, risk level, and blocking reasons. |
| `explain_breaking_changes` | Plain-language impact + suggested migration. |
| `generate_migration_guide` | Migration guide (markdown) + rollout steps. |
| `generate_release_notes` | Release notes for developer / customer / internal. |
| `compare_specs` | The raw diff + risk score. |
| `run_governance_review` 🔒 | API governance ruleset beyond breaking changes → located findings + suggested fixes. **Paid (Team+).** |

Tools 1–5 take specs inline (`baseSpecContent` / `targetSpecContent`) or by path
(`baseSpecPath` / `targetSpecPath`). `run_governance_review` reviews a single spec
(`specContent` / `specPath`).

Example prompts (lead with the gate):
- *"Here are my old and new `openapi.yaml` — is it safe to ship this API change to my consumers?"*
- *"Compare `v1.yaml` and `v2.yaml` and tell me if I can deploy, and why not."*
- *"Explain the breaking changes and how consumers should migrate."*
- *"Run a governance review on `openapi.yaml` and list what to fix."*

> 🔒 `run_governance_review` is a **paid** feature (Team plan or above). With a FREE
> API key it returns a `payment_required` error — upgrade at
> [specshield.io/pricing](https://specshield.io/pricing).

---

## 7. Security & privacy

- **API key** is sent only as the `X-Api-Key` header to your configured backend.
- **Read-only / analyze-only:** no mutation tools, no shell execution, no arbitrary
  file access. A spec file is read only when you explicitly pass a path.
- **No secret or spec logging:** the server never logs spec content, API keys, or
  request bodies. Error messages are redacted and machine-readable.
- Specs are transmitted to your configured SpecShield backend for analysis. For
  self-hosted deployments, point `SPECSHIELD_API_URL` at your instance.

---

## 8. Troubleshooting

Errors are returned as a compact `{ "error": { "code", "message", "status" } }`
payload. Map the `code`:

| Code | Meaning | Fix |
|------|---------|-----|
| `config_error` | `SPECSHIELD_API_KEY` is missing | Set the env var in your client's `env` block. |
| `auth_error` (401/403) | Key rejected | Check the key value; regenerate it at specshield.io/account. |
| `validation_error` (4xx) | Backend rejected the request | Ensure both specs are valid OpenAPI; check `*Content`/`*Path` were provided. |
| `rate_limited` (429) | Too many requests | Retried automatically; back off and retry. |
| `backend_error` (5xx) | Backend failure | Retried automatically; check SpecShield status. |
| `timeout` | Exceeded `SPECSHIELD_TIMEOUT_MS` | Raise the timeout, or check connectivity. |
| `network_error` | Couldn't reach the backend | Check `SPECSHIELD_API_URL` and network/proxy. |

**The server doesn't appear in my client.** Confirm the config file path and JSON are
valid, that `npx` is on PATH, and fully restart the client. Check the client's MCP
logs — the server logs startup and errors to **stderr**.

**"It hangs when I run it directly."** Expected — it's an stdio server waiting for a
client. Use a client or `npm run smoke`.

**Set `SPECSHIELD_LOG_LEVEL=debug`** to see retry/timeout diagnostics on stderr (never
spec content or keys).

---

## 9. Uninstall

- Remove the `specshield` entry from your client's MCP config.
- If globally installed: `npm uninstall -g specshield-mcp-server`.
- `npx` leaves nothing to remove beyond its cache.

---

## 10. Versioning & support

- Semantic versioning; the tool contract (names, inputs, output fields) is stable
  within a major version.
- Issues and questions: [specshield.io](https://specshield.io).
