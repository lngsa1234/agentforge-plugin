# LynnCraft

*Built by Lynn, a product and systems engineer for 10+ years, for any builders.*

You build fast with AI. LynnCraft keeps your vibe coding high quality, and lets your AI do more with more confidence.

It gives your project a small AI team: **Maya** (product manager), **Alex** (technical lead) and **Priya** (QA). They read your code and write down what's there: a list of every feature, a spec for each one, how the app is put together, and which parts are really tested. Then LynnCraft checks their work against your code, so the docs say what the app does, not what someone hoped it does.

It's free, and it runs on the Claude or ChatGPT plan you already pay for. No new account, no API key.

## Install (about 2 minutes)

Pick the app you use.

### Claude on the web (claude.ai), desktop or phone

1. Open **Customize** in the left sidebar, then **Plugins**.
2. Next to **Personal plugins**, click **+** and choose **Add marketplace**.
3. Paste `lngsa1234/lynncraft-plugin` and confirm.
4. Find **LynnCraft** in the list and click **Add**.
5. **Use it in a Project connected to your GitHub repository.** Create a Project for your app and connect its GitHub repository. Claude then gets its own workspace with a copy of your code, where LynnCraft reads it, runs its checks and pushes the docs to a branch for you to review.

LynnCraft is now saved to your account, so it also works in your Projects on your phone and in Claude Code. It doesn't run in a plain chat outside a Project: it needs your code and a place to run its checks.

### Claude Code

Type these two lines into Claude Code, one at a time:

```text
/plugin marketplace add lngsa1234/lynncraft-plugin
/plugin install lynncraft@lynncraft
```

Then type `/reload-plugins` (or close and reopen Claude Code).

### Codex

Type this into Codex:

```text
codex plugin marketplace add lngsa1234/lynncraft-plugin
```

Then type `/plugins` (or open **Plugins** in the Codex app), choose **LynnCraft** and install it.

## Try it

Open your project and just ask, in plain words:

1. **"What features does this app have?"** Maya lists every feature she finds in your code.
2. **"Write the spec for the login feature."** You get a spec with checkable acceptance criteria, each pointing to the code it comes from.
3. **"Verify this branch."** Priya checks that the specs, the code and the tests agree, and tells you what to fix before merging.

You don't need to remember any commands. When you want something built or fixed, say **"make a work item: …"** and Maya writes it up as a GitHub issue, ready for Alex to plan.

## What it does

| Skill | Role | What you get |
|---|---|---|
| `/lynncraft:feature-map` | Maya | `.agentforge/feature-map.json`: every user-facing feature the code implements, with anchors saying where it lives |
| `/lynncraft:feature-spec` | Maya | `docs/specs/<feature>.md` written from the code; each acceptance criterion cites the lines it rests on, and the check verifies every quote |
| `/lynncraft:product-baseline` | Maya | `docs/product/baseline.md`: who the product is for, the journeys across features with the end-to-end test cases that prove each one, and, if you have a PRD in any format, what it asks for against what's built |
| `/lynncraft:work-item` | Maya | A request turned into a typed work item (feature, bug or chore) with testable acceptance criteria, filed as a GitHub issue; questions only when it's unclear |
| `/lynncraft:architecture` | Alex | `docs/architecture/README.md`: how the system is built and the rules the code must keep. Ask for "the architecture" and it runs the three below first |
| `/lynncraft:architecture-map` | Alex | The C4 container and component diagrams in `docs/architecture/`, every path checked |
| `/lynncraft:workflows` | Alex | The main runtime flows as sequence diagrams in `docs/architecture/workflows/`, every cited file checked |
| `/lynncraft:decision-records` | Alex | The decisions already in effect in `docs/adr/`, each naming the code it governs |
| `/lynncraft:tech-plan` | Alex | The smallest reversible plan for a work item or issue: spec first, the build steps, the engineer's checks (lint, typecheck, unit tests) as tasks, then verify. Impact rated none / minor / major, a decision record when major |
| `/lynncraft:verify` | Priya | The same verification GitHub runs on every pull request: specs still match the code, every test linked to a criterion or a journey's test case passes. Links tests and offers to write missing ones, including end-to-end tests from the journeys' test cases |
| `/lynncraft:refresh-docs` | Both | The feature map, specs and architecture docs brought up to date in one pass, for a project that's new to LynnCraft |
| `/lynncraft:setup` | — | Once per project: verification on every pull request, which blocks the merge until it passes. Claude offers it the first time; run it again after a LynnCraft update |

In Codex, skills start with `$` instead of `/lynncraft:`, for example `$feature-map`. Either way, you don't have to type them: just ask for what you want.

## Checks quality automatically

- **Docs match the code.** A script checks every spec against your code. Only it can mark a spec "complete".
- **Tests are run, not assumed.** Each feature and journey shows whether its tests pass. Change the code, and it's marked "needs re-verify".
- **Before every push and merge.** Claude runs `verify` first and won't push, open a pull request or merge while something must be fixed. This works in private repositories too, with no GitHub setup.
- **On every pull request.** After a one-time setup per project (Claude offers it), GitHub verifies each change automatically, whatever tool wrote it, and the merge waits until specs, code and tests agree.

Want an early look? Ask "verify this branch".

<details>
<summary>For developers: the checks and settings</summary>

The checks are one script, `scripts/agentforge.mjs` (Node 18+ and git, no dependencies), which every skill runs. Its commands:

- `check-specs`: each acceptance criterion's quote against the file it cites; fixes line numbers that moved; the only thing that marks a spec complete.
- `verify`: what GitHub runs on every pull request. Compares the branch with its base and runs every test linked to a criterion or a journey's test case; fails when a criterion the branch breaks isn't updated in its spec, or a linked test fails or is missing. Records the results with the commit and a fingerprint of each feature's code, so later changes read as "needs re-verify".
- `check-baseline`: every journey runs through real features and has a main-path end-to-end test case, every test case has steps and an expected result, and every PRD requirement cites the feature that builds it.
- `check-architecture`: every file the C4 map cites exists, and each feature has exactly one component holding only its own code.
- `check-workflows`: every workflow step's code exists.

**Browser tests.** Playwright tests linked to criteria or journeys run only against localhost, so CI never signs in to your live site. Set the local server in `.agentforge/config.json`, using the variable your Playwright config reads: `{ "qa": { "browser": { "env": { "E2E_BASE_URL": "http://localhost:3000" } } } }`. Add `"allowRemote": true` to test a deployed site. Without Playwright's own Chromium, the installed Google Chrome is used.

**Verify before push.** In Claude Code, a hook runs `verify` before `git push`, `gh pr create` and pull-request merges, and blocks them on *Must fix*. It runs once per commit and skips docs-only pushes. Turn it off with `{ "hooks": { "verifyBeforePush": false } }` in `.agentforge/config.json`. In Codex and Claude Projects, the skills run it themselves.

**Making the check required.** `setup` asks GitHub to require the `verify` check on your default branch, so a failing check blocks the merge. Some private repositories on GitHub's free plan can't require checks; there it still runs and comments on every pull request, and the verify-before-push gate is what stops a failing change.

**The session-start note.** In Claude Code, LynnCraft tells Claude what's missing in the repository when a session starts. Turn it off with `{ "hooks": { "sessionStart": false } }` in `.agentforge/config.json`, or `AGENTFORGE_HOOKS=off`.

</details>

## Files it keeps in your repository

- `.agentforge/feature-map.json`: the feature map, spec drafts and test results. Commit it.
- `.agentforge/product-baseline.json` and `docs/product/baseline.md`: the product baseline, its journeys and their end-to-end test cases and results.
- `docs/specs/`: feature specs, each with its scenarios.
- `.agentforge/architecture-map.json`, `.agentforge/workflows.json` and the pages they produce in `docs/architecture/`.
- `docs/architecture/README.md`: the architecture overview.
- `docs/adr/NNNN-*.md`: decision records, with `paths:` naming the code each one governs.
- `.github/workflows/agentforge.yml` and `.agentforge/bin/`: the pull request verification, added by `setup`.

## LynnCraft and AgentForge

LynnCraft is the free plugin. AgentForge, the hosted product from the same maker, reads the same files and keeps them true for a whole team: a live feature map and dashboard anyone can open, each feature's change log linked to the work that changed it, and Software Engineer and QA agents that build and verify on branches.

## Contributing

This repository is published automatically from AgentForge's main repository, so changes made here directly are overwritten. Issues and pull requests are welcome: accepted changes are applied upstream and published from there.

## License

MIT
