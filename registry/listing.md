# Registry listings — specshield-mcp-server

Distribution is the point of this phase. Treat listing as a launch. Shared copy below.

**Name:** SpecShield
**Package:** `specshield-mcp-server`
**Install:** `npx -y specshield-mcp-server`
**Homepage:** https://specshield.io
**Repository:** https://github.com/specshield26/specshield-mcp-server
**Categories/tags:** `api`, `openapi`, `developer-tools`, `testing`, `ci-cd`, `contract-testing`
**One-liner:** The API-change deploy gate for AI coding agents — "is it safe to ship this API change to my consumers?" Read-only.

**Long description:**
> SpecShield brings the API-change deploy gate into your AI coding agent. Its hero
> tool, `is_change_safe`, answers "can I deploy this?" — returning a safe-to-merge
> verdict, a risk level, and the exact breaking reasons — so you catch breaking
> changes before they reach your consumers. Also explains breaking changes, generates
> migration guides and release notes, and does raw spec diffs. Thin adapter over the
> SpecShield backend; read-only/analyze-only (it never modifies code). Requires a
> SpecShield API key.

## Checklist (do at publish time)

- [ ] Publish `specshield-mcp-server` to npm (`npm login && npm publish`; unscoped, no org/--access needed).
- [ ] **Official MCP Registry** — publish `server.json` (namespace-verified). Draft below.
- [ ] **mcp.so** — submit listing (name, description, install cmd, tags, homepage).
- [ ] **smithery.ai** — add server (supports the `npx` command form + env schema).
- [ ] **glama.ai/mcp** — submit; it auto-indexes from npm + GitHub, verify metadata.
- [ ] **punkpeye/awesome-mcp-servers** — PR adding SpecShield under the API / dev-tools section.
- [ ] Cross-link from specshield.io docs + the `/mcp-server-setup` doc (Phase 5).

## Draft `server.json` (official MCP Registry)

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json",
  "name": "io.specshield/mcp-server",
  "description": "The API-change deploy gate for AI coding agents: is it safe to ship this API change to my consumers? Read-only.",
  "version": "1.0.2",
  "homepage": "https://specshield.io",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "specshield-mcp-server",
      "version": "1.0.2",
      "transport": { "type": "stdio" },
      "environmentVariables": [
        { "name": "SPECSHIELD_API_KEY", "description": "SpecShield API key", "isRequired": true, "isSecret": true },
        { "name": "SPECSHIELD_API_URL", "description": "Backend base URL", "isRequired": false },
        { "name": "SPECSHIELD_TIMEOUT_MS", "description": "Per-request timeout (ms)", "isRequired": false },
        { "name": "SPECSHIELD_LOG_LEVEL", "description": "debug|info|warn|error", "isRequired": false }
      ]
    }
  ]
}
```

_Verify the current registry schema URL and `server.json` shape at publish time —
the MCP spec evolves._

## awesome-mcp-servers PR

Repo: https://github.com/punkpeye/awesome-mcp-servers — add one line under the most
relevant category (e.g. **Developer Tools** / API section). Entries are alphabetized
by name within a section; legend: `📇` = TypeScript, `☁️` = cloud/SaaS-backed.

**Entry line (paste this):**

```markdown
- [specshield26/specshield-mcp-server](https://github.com/specshield26/specshield-mcp-server) 📇 ☁️ - The API-change deploy gate for AI coding agents: "is it safe to ship this API change to my consumers?" Analyze-only OpenAPI breaking-change detection + migration guides.
```

> ⚠️ Replace the URL with wherever you actually push the repo (the `specshield/…`
> owner assumes that GitHub org/user). The line must match the live repo.

**How to open the PR:**
1. Fork `punkpeye/awesome-mcp-servers`, branch `add-specshield`.
2. Insert the line in alphabetical order within the chosen category section.
3. Commit, push, open the PR from your GitHub account (follow the repo's contributing
   note — some sections/readme are generated; edit the source list they point to).

