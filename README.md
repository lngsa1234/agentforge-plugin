# AgentForge for Claude Code

An AI product manager (Maya), technical lead (Alex) and QA engineer (Priya) for your repository. They read your code and write the product and architecture docs your team keeps meaning to write: a feature map, feature specs, user journeys, C4 diagrams, workflows and decision records.

It runs on your own Claude Code subscription. No server, no API key, no account.

## Install

**Claude Code** (terminal, desktop app or IDE):

```text
/plugin marketplace add lngsa1234/agentforge-plugin
/plugin install agentforge@agentforge
```

Then restart Claude Code, or run `/reload-plugins`.

**Claude on the web, desktop or mobile:** on claude.ai or in the desktop app, open **Customize → Plugins**, select **Add marketplace**, enter `lngsa1234/agentforge-plugin`, and install **AgentForge**. The plugin is saved to your account, so its skills are also available in chat on your phone and in Claude Code when you sign in with the same account. Code execution must be on.

In chat there is no checkout of your repository: attach it as a .zip (on GitHub, **Code → Download ZIP**) or connect GitHub. Claude writes the docs and gives them back as a .zip for you to commit. The session-start reminder below only runs in Claude Code.

## What it does

| Skill | Role | What you get |
|---|---|---|
| `/agentforge:feature-map` | Maya | `.agentforge/feature-map.json`: every user-facing feature the code implements, with anchors saying where it lives |
| `/agentforge:feature-spec` | Maya | `docs/specs/<feature>.md` written from the code, each acceptance criterion citing the lines it rests on, with step-by-step scenarios |
| `/agentforge:product-baseline` | Maya | `docs/product/baseline.md`: who the product is for, the journeys across features as swimlane diagrams, and, if you have a PRD in any format, what it asks for against what's built |
| `/agentforge:requirements` | Maya | A request turned into a typed work item with testable acceptance criteria; questions only when it's unclear |
| `/agentforge:architecture` | Alex | `docs/architecture/README.md`, the C4 container and component diagrams, runtime workflows as sequence diagrams, and decision records in `docs/adr/` |
| `/agentforge:qa` | Priya | Each acceptance criterion linked to the tests that check it: every spec page shows which criteria have a test and which don't |
| `/agentforge:tech-plan` | Alex | The smallest reversible plan for a change, impact rated none / minor / major, with a decision record when it's major |

You don't have to name the skills. Claude picks them up when you ask for what they do: "what features does this app have?", "spec the checkout feature", "how is this system built?", "plan this change".

In Claude Code, when a session starts in a repository with no feature map, missing specs or no architecture overview, Claude knows and mentions it once. To turn that off, add `.agentforge/config.json` with `{ "hooks": { "sessionStart": false } }`, or set `AGENTFORGE_HOOKS=off`.

## Drafts

Claude writes each document as JSON; a script bundled with the skills (`scripts/agentforge.mjs`, Node 18+, no dependencies) checks that it has every part and turns it into Markdown with Mermaid diagrams. The script checks structure (ids, required fields, references between the feature map, specs and journeys). It also confirms that each test linked to a criterion exists. It does **not** check that each criterion's quote is really in the code, or run the tests, so specs are marked **Draft, not verified**. The skills tell Claude to re-read every citation, but read them as claims to confirm.

The hosted AgentForge reads the same files from your repository and adds verification against the code, a live feature map, spec-drift and architecture checks on every pull request, and QA that runs the linked tests and records which criteria pass.

## Files it keeps in your repository

- `.agentforge/feature-map.json`: the feature map and spec drafts. Commit it.
- `.agentforge/product-baseline.json` and `docs/product/baseline.md`: the product baseline and its journeys.
- `docs/specs/`: feature specs, each with its scenarios.
- `.agentforge/architecture-map.json`, `.agentforge/workflows.json` and the pages they produce in `docs/architecture/`.
- `docs/architecture/README.md`: the architecture overview.
- `docs/adr/NNNN-*.md`: decision records, with `paths:` naming the code each one governs.

## Contributing

This repository is published automatically from AgentForge's main repository, so changes made here directly are overwritten. Issues and pull requests are welcome: accepted changes are applied upstream and published from there.

## License

MIT
