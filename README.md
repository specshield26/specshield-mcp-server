# SpecShield MCP Server

**The API-change deploy gate for AI coding agents.** Ask *"is it safe to ship this
API change to my consumers?"* right inside Claude, Cursor, and other MCP clients —
and catch breaking changes before they reach your consumers.

It's a thin adapter over the [SpecShield](https://specshield.io) backend. Every tool
is **read-only / analyze-only — it never modifies your code.**

> Why not just diff specs? Plenty of tools (including free ones) list breaking
> changes. SpecShield's job is the *decision*: **can I deploy this?** — the deploy
> gate is the hero tool here.

## Tools

| # | Tool | What it answers |
|---|------|-----------------|
| 1 | **`is_change_safe`** ⭐ | Is this change safe to merge/deploy? Will it break consumers? (`safeToMerge` + risk + blocking reasons) |
| 2 | `explain_breaking_changes` | What breaks, developer & consumer impact, suggested migration |
| 3 | `generate_migration_guide` | Migration guide (markdown) + safe rollout steps |
| 4 | `generate_release_notes` | Release notes for developer / customer / internal |
| 5 | `compare_specs` | The raw diff (breaking / additions / modifications / warnings) + risk score |

Each tool accepts specs inline (`baseSpecContent` / `targetSpecContent`) or by path
(`baseSpecPath` / `targetSpecPath`).

_`run_governance_review` is planned — it ships once the backend governance endpoint
lands._

> Full setup, verification & troubleshooting: **[docs/mcp-server-setup.md](docs/mcp-server-setup.md)**.

## Install

Requires **Node.js ≥ 20** and a SpecShield API key (from
[specshield.io/account](https://specshield.io/account)).

```bash
npx -y @specshield/mcp-server
```

### Claude Desktop
`claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "specshield": {
      "command": "npx",
      "args": ["-y", "@specshield/mcp-server"],
      "env": { "SPECSHIELD_API_KEY": "ss_your_key_here" }
    }
  }
}
```

### Claude Code
```bash
claude mcp add specshield --env SPECSHIELD_API_KEY=ss_your_key_here -- npx -y @specshield/mcp-server
```

### Cursor
`~/.cursor/mcp.json` (or the project `.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "specshield": {
      "command": "npx",
      "args": ["-y", "@specshield/mcp-server"],
      "env": { "SPECSHIELD_API_KEY": "ss_your_key_here" }
    }
  }
}
```

## Configuration

| Env var | Required | Default | Purpose |
|---------|----------|---------|---------|
| `SPECSHIELD_API_KEY` | **yes** | — | Your SpecShield API key. Store it as a secret; never commit it. |
| `SPECSHIELD_API_URL` | no | `https://api.specshield.io` | Backend base URL (override for self-hosted/staging). |
| `SPECSHIELD_TIMEOUT_MS` | no | `30000` | Per-request timeout. |
| `SPECSHIELD_LOG_LEVEL` | no | `info` | `debug` \| `info` \| `warn` \| `error` (logs go to stderr). |

## Example prompts (lead with the deploy gate)

- *"Here are my old and new `openapi.yaml` — **is it safe to ship this API change to my consumers?**"*
- *"Compare `v1.yaml` and `v2.yaml` and tell me if I can deploy, and why not."*
- *"Explain the breaking changes between these two specs and how consumers should migrate."*
- *"Generate customer-facing release notes for this API change."*

## Security & privacy

- **API key required.** Sent only as the `X-Api-Key` header to your configured backend.
- **Read-only / analyze-only.** No mutation tools, no shell execution, no arbitrary
  file access (a spec file is read only when you explicitly pass a path).
- **No secret or spec logging.** The server never logs spec content, API keys, or
  request bodies; error messages are redacted and machine-readable.
- Specs are sent to your configured SpecShield backend for analysis.

## Local development

```bash
npm install
npm run build      # tsc → dist/
npm test           # vitest (no network)
npm run lint
npm run smoke      # boots the server against a stubbed backend and lists tools
npm start          # run the built server over stdio
```

## License

MIT © SpecShield Software Private Limited
