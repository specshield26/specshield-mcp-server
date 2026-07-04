export const HELP_TEXT = `# SpecShield MCP tools

SpecShield answers one question inside your AI coding agent: **"Is it safe to ship
this API change to my consumers?"** All tools are **read-only** — they analyze API
contract compatibility and never modify your code.

## Tools (in order)

1. **is_change_safe** — THE DEPLOY GATE. Given a base and target spec, returns
   \`safeToMerge\`, a risk level, and the exact blocking reasons. Use this before
   merging or releasing an API change.
2. **explain_breaking_changes** — plain-language explanation of what breaks, the
   developer/consumer impact, and suggested migration.
3. **generate_migration_guide** — a migration guide (markdown) + safe rollout steps.
4. **generate_release_notes** — release notes for developer/customer/internal audiences.
5. **compare_specs** — the raw diff (breaking / additions / modifications / warnings)
   with a risk score. Prefer is_change_safe for a go/no-go decision.

Each tool accepts specs as inline content (\`baseSpecContent\`/\`targetSpecContent\`)
or file paths (\`baseSpecPath\`/\`targetSpecPath\`).

## Planned

- **run_governance_review** — deterministic API governance ruleset. Ships once the
  backend \`/api/governance\` endpoint lands (a later release).

## Privacy

Requires a SpecShield API key (\`SPECSHIELD_API_KEY\`). Specs are sent to your
configured SpecShield backend for analysis. This server never logs spec content or
API keys.
`;
