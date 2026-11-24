---
name: verify
description: Verify a branch the way GitHub does on every pull request, as LynnCraft's QA (Priya) — check that the specs still match the code, run every test linked to an acceptance criterion or a journey, and say what must be fixed before merging and what is worth a look. Also links tests to criteria and end-to-end tests to journeys, and offers to write missing tests. Use when the user asks to verify, whether a branch is ready or OK to PR, whether features are tested, or for QA status.
---

# Verify (Priya, QA)

The same verification GitHub runs on every pull request, run on the user's branch. A script decides; you never mark anything passed yourself. Your part is to link tests, explain the result and help fix it.

## Where it runs

Work in a checkout of the user's repository: the current repository in Claude Code or Codex, or the repository cloned into the workspace of a Claude Project connected to GitHub. Commit what you write and push it on a branch with a pull request, unless the user asks you to push to the default branch. If you can't run commands here or there's no checkout (a plain chat), say that LynnCraft works in Claude Code, Codex, or a Claude Project connected to GitHub, and stop.

LynnCraft's checks are one script in the plugin's `scripts/` folder, two folders up from this SKILL.md. Run it as `${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs`; where that placeholder isn't filled in (Codex), use `../../scripts/agentforge.mjs` from this skill's folder.

## 1. Run it

Commit first: results for uncommitted code aren't tied to a commit. Then (add `--base <branch>` when the branch isn't cut from the default branch):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs" verify
```

It compares the branch with its base and runs every linked test, then gives one verdict:

- **Must fix** (GitHub blocks the merge on these): an acceptance criterion the branch breaks (its cited code changed so it no longer holds) while its spec didn't change with it; a linked test, for a criterion or a journey, that fails or can't be found.
- **Worth a look** (doesn't block): feature code changed while its spec didn't, features with no complete spec, new code no feature owns, architecture findings, criteria and journeys with no test yet.

It also records each feature's and journey's test results in `.agentforge/feature-map.json` and `.agentforge/product-baseline.json`, with the commit and a fingerprint of the feature's code, so a later change reads as "needs re-verify". Commit those files with the branch: results go in with the code, never after the merge.

If it says there is no feature map, offer the `feature-map` skill; verification starts working once there is one.

## 2. Fix what must be fixed

- **A criterion no longer holds.** Read the criterion, its spec in `docs/specs/` and the changed code. If the code is wrong, fix the code. If the behavior changed on purpose, it should have started with the spec: update the criterion and its evidence in `.agentforge/feature-map.json` on this branch (the `feature-spec` skill), then run `check-specs`. Ask the user which it is when the work item doesn't say.
- **A test fails.** Read the test and the code. Say which criterion or journey it breaks and whether the code or the test is wrong. Fix it if the user asks.
- **A linked test wasn't found.** The test was renamed or deleted: link the right one (step 4) or remove the link.

Run `verify` again after each fix, until nothing is left under *Must fix*.

## 3. Go through what's worth a look

- **Spec may no longer match** — read the spec and the changed code. If behavior changed, update the spec on this branch; if it didn't (a refactor), say so.
- **No complete spec** — offer the `feature-spec` skill for that feature.
- **New code in no feature** — add it to the right feature's anchors (or a new feature) with the `feature-map` skill.
- **Deprecated features** — the change touches code of a feature that's no longer used. Ask whether to delete that code; if it's deleted, set the feature's status to `removed`.
- **Decisions this change must still follow** — read each record and confirm the change keeps it; if it breaks one, say which and propose a superseding record.
- **Major change without a decision record** — decide with the user whether it's major (the `tech-plan` skill's levels). If it is, write the record.
- **Decision records removed** — restore the file and mark it superseded instead.
- **Not tested yet** — step 4.

## 4. Link tests, and offer the missing ones

Find the tests: run `git ls-files` and read the test files (the `test` script in `package.json`, files named `*.test.*` or `*.spec.*`, and files under `test/`, `tests/`, `__tests__/` or `e2e/`). Note each test's exact name: `test('…')` or `it('…')`, joined with its `describe('…')` parents as `parent > name` when it has them.

- **Criteria** (in each feature's `spec.document.acceptanceCriteria`): unit and integration tests.
- **Journeys** (in `.agentforge/product-baseline.json`): end-to-end tests that walk the whole journey through the real app, usually browser tests that import `@playwright/test`. Every journey should have at least one.

Link a test the same way on either:

```json
"tests": [{ "path": "test/goals.test.js", "name": "goals: update_step refuses done without evidence" }]
```

- **Link a test only if reading it shows it checks the criterion's *then*** under its *given* and *when*, or, for a journey, that it walks the journey's steps to its outcome. A test that only touches the same code doesn't count. If unsure, leave it out.
- Copy names exactly. Don't rename tests to match.
- Don't write `qa` fields: the script sets them.

For what's still untested, say which kind of test would cover each one and offer to write them. If the user agrees, write them in the repository's existing test style and location, link them, and run `verify` again. Who writes tests: the engineer (here, whoever builds the feature) writes them with the code; you check that every criterion and journey is covered and the tests really prove it.

**Browser tests run against localhost only**, so verification never signs in to the live site from CI. If the Playwright config points at a deployed site, find the variable it reads for its base URL and point it at a local server in `.agentforge/config.json`, e.g. `{ "qa": { "browser": { "env": { "E2E_BASE_URL": "http://localhost:3000" } } } }`. If the config doesn't start the app itself (a `webServer` entry), say the app must be running. Only with the user's agreement, set `"allowRemote": true`.

## 5. Report

Lead with the verdict: ready to merge, or what must be fixed. Then what you changed, and what's left for the user. If GitHub isn't set up to verify pull requests yet (no `.github/workflows/agentforge.yml`), offer the `setup-github` skill once.
