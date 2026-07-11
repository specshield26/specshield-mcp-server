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
6. **run_governance_review** — deterministic API governance ruleset (design/policy
   checks beyond breaking changes: missing operationId, undocumented error responses,
   no security scheme, missing pagination, and more). Reviews a single spec via
   \`specContent\`/\`specPath\`. **Paid feature** (Team plan or above; a FREE key
   returns a \`payment_required\` error).

Tools 1–5 accept specs as inline content (\`baseSpecContent\`/\`targetSpecContent\`)
or file paths (\`baseSpecPath\`/\`targetSpecPath\`); run_governance_review takes a
single spec (\`specContent\`/\`specPath\`).

## Privacy

Requires a SpecShield API key (\`SPECSHIELD_API_KEY\`). Specs are sent to your
configured SpecShield backend for analysis. This server never logs spec content or
API keys.
`;
