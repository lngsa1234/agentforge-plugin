---
name: qa
description: Link each acceptance criterion in .agentforge/feature-map.json to the repository tests that check it, as AgentForge's QA (Priya), and report which criteria are tested and which have no test. Use when the user asks whether features are tested, which acceptance criteria have tests, for test coverage of the specs, or after writing tests.
---

# Link acceptance criteria to tests (Priya, QA)

You link each acceptance criterion to the tests that check it. A script confirms each linked test exists and shows, on every spec page, which criteria have a test and which don't. It does not run the tests.

## Where the code is

- **Claude Code:** work in the current repository.
- **Claude chat (web, desktop or mobile):** there is no checkout. Ask the user to attach the repository as a .zip (on GitHub: **Code → Download ZIP**), or read it through a connected GitHub tool if there is one. Unpack it into a folder in your working directory and work there; pass that folder to the script with `--root <folder>`. At the end, give the user a .zip of the `.agentforge/` and `docs/` files you wrote, to commit to their repository.

The script is bundled with this skill: `<skill folder>` below is the folder this SKILL.md is in.

## 1. Find the tests

Read `.agentforge/feature-map.json`. If it is missing, or no feature has a spec, run the `feature-map` and `feature-spec` skills first.

List the repository's files and read the test files: the `test` script in `package.json`, and files named `*.test.*`, `*.spec.*` or under `test/`, `tests/`, `__tests__/` or `e2e/`. Note each test's exact name as it appears in the code: `test('…')` or `it('…')`, joined with its `describe('…')` parents as `parent > name` when it has them.

## 2. Link tests to criteria

For each feature with a spec, read each criterion in `spec.document.acceptanceCriteria` and add the tests that check it:

```json
"tests": [{ "path": "test/goals.test.js", "name": "goals > refuses a step marked done without evidence" }]
```

- **Link a test only if reading it shows it checks the criterion's *then*,** under the criterion's *given* and *when*. A test that only touches the same file, or checks a neighbouring rule, does not count. If you are unsure, leave it out.
- One criterion can have several tests; one test can cover several criteria.
- Copy names exactly. Don't rename or edit tests to match.
- Leave criteria with no test without `tests`. They are the gaps the report lists, which is useful.
- Don't change anything else in the spec, and don't write `qa` fields.

## 3. Check the links

```bash
node "<skill folder>/scripts/agentforge.mjs" write-specs
```

For every criterion it reports whether a test is linked, and whether that test exists: its file is there and its name appears in it. It adds a *Tested* column to each spec page (✓ test linked, ? test not found, — no test) and a count at the top. If it says a linked test wasn't found, fix the path or the name and run it again, at most twice.

## 4. Report

Per feature: how many criteria have a test, and the gaps. For each gap, say which kind of test would cover it, and offer to write them. If the user agrees, write them in the repository's existing test style and location, run them with the repository's own test command to make sure they pass, then link them and run the script again.

Say plainly that linked tests were not run by AgentForge. The hosted AgentForge runs them and records which criteria pass.

Don't commit unless the user asks. The files to commit are `.agentforge/feature-map.json`, `docs/specs/` and any tests you wrote.
