---
name: qa
description: Verify features against their acceptance criteria with the repository's own tests, as LynnCraft's QA (Priya) — link each criterion in .agentforge/feature-map.json to the tests that check it, run them with check-qa, and report what is covered, failing or untested. Use when the user asks whether features are tested or verified, for QA status, or after writing tests.
---

# QA from the repository's tests

You link each acceptance criterion to the tests that check it. A script runs those tests and decides each feature's QA. You never mark anything passed yourself.

## Where the code is

In Claude Code, use the current repository. In Claude chat there is no checkout: ask for the repository as a .zip (GitHub: **Code → Download ZIP**) or use a connected GitHub tool, unpack it into your working directory, pass that folder to the script with `--root <folder>`, and hand back the files you wrote as a .zip to commit. Skip steps that need git history if there is no `.git`.

The script is bundled with this skill: `<skill folder>` below is the folder this SKILL.md is in (if it has no `scripts/` folder, use `${CLAUDE_PLUGIN_ROOT}` instead).

## 1. Find the tests

Run `git ls-files` and read the test files: the `test` script in `package.json`, and files named `*.test.*`, `*.spec.*` or under `test/`, `tests/`, `__tests__/` or `e2e/`. Browser tests that import `@playwright/test` count too: check-qa runs those with Playwright, so screen criteria can be verified in a real browser. Note each test's exact name as it appears in the code: `test('…')` or `it('…')`, joined with its `describe('…')` parents as `parent > name` when it has them.

## 2. Link tests to criteria

For each feature with a spec, read each criterion in `spec.document.acceptanceCriteria` and add the tests that check it:

```json
"tests": [{ "path": "test/goals.test.js", "name": "goals: update_step refuses done without evidence" }]
```

- **Link a test only if reading it shows it checks the criterion's *then*,** under the criterion's *given* and *when*. A test that only touches the same file, or checks a neighbouring rule, does not count. If you are unsure, leave it out.
- One criterion can have several tests; one test can cover several criteria.
- Copy names exactly. Don't rename or edit tests to match.
- Leave criteria with no test without `tests`. They are the gaps the report lists, which is useful.
- Don't change anything else in the spec, and don't write `qa` fields: the script sets them.

## 3. Run the check

```bash
node "<skill folder>/scripts/agentforge.mjs" check-qa
```

It finds the runner (node's test runner, Jest or Vitest; pass `--runner` if it can't tell), runs each linked test file, and sets every feature's QA:

- **complete** when every criterion's tests pass;
- **rejected** when a linked test fails;
- **in progress** when some criteria pass and others have no test;
- **not started** when none pass.

It records the commit and a fingerprint of the feature's code, so the hosted feature map shows "needs re-verify" after the code changes. Commit first: results for code with uncommitted changes aren't tied to a commit. It also adds a *Tested* column to each spec page.

If it says a linked test wasn't found, fix the name (step 2) and run it again, at most twice.

**Browser tests run against localhost only.** If the repository's Playwright config points at a deployed site, check-qa doesn't run those tests (they'd sign in and write data on the live site, from CI on every PR) and their criteria stay untested. To run them, find the variable the config reads for its base URL and point it at a local server in `.agentforge/config.json`, with any env the local app needs, e.g. `{ "qa": { "browser": { "env": { "E2E_BASE_URL": "http://localhost:3000" } } } }`. If the config doesn't start the app itself (a `webServer` entry), say the app must be running. Only with the user's agreement, set `"allowRemote": true` to run them against the deployed site. When Playwright's Chromium isn't downloaded, check-qa uses the installed Google Chrome.

## 4. Report

Per feature: how many criteria pass, any failing test (with the criterion it breaks), and the gaps. For gaps, say which kind of test would cover each one, and offer to write them. If the user agrees, write them in the repository's existing test style and location, run the test suite, then link them and run `check-qa` again.

Don't commit unless the user asks. The files to commit are `.agentforge/feature-map.json`, `docs/specs/` and any tests you wrote.
