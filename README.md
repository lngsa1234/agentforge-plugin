# LynnCraft

*Built by Lynn, a solo builder, for solo builders.*

You build fast with AI. LynnCraft keeps track of what you've actually built.

It gives your project a small AI team: **Maya** (product manager), **Alex** (technical lead) and **Priya** (QA). They read your code and write down what's there: a list of every feature, a spec for each one, how the app is put together, and which parts are really tested. Then LynnCraft checks their work against your code, so the docs say what the app does, not what someone hoped it does.

It's free, and it runs on the Claude or ChatGPT plan you already pay for. No new account, no API key.

## Install (about 2 minutes)

Pick the app you use.

### Claude on the web (claude.ai), desktop or phone

1. Open **Customize** in the left sidebar, then **Plugins**.
2. Next to **Personal plugins**, click **+** and choose **Add marketplace**.
3. Paste `lngsa1234/lynncraft-plugin` and confirm.
4. Find **LynnCraft** in the list and click **Add**.
5. Turn on **code execution** (in **Settings → Capabilities**), and connect your **GitHub** account so Claude can open your project.

That's it. LynnCraft is now saved to your account, so it also works on your phone and in Claude Code.

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
3. **"Which features are tested?"** Priya shows what's covered by tests and what isn't.

You don't need to remember any commands. When you want something built or fixed, say **"make a work item: …"** and Maya writes it up as a GitHub issue, ready for Alex to plan.

<details>
<summary>Good to know (a bit more technical)</summary>

- **Claude chat:** with GitHub connected, Claude opens your repository, writes the docs and pushes them, just as in Claude Code. The automatic checks (one before you push, one note when a session starts) run only in Claude Code.
- **Codex:** you can also call a skill by name with `$`, for example `$feature-spec`. The automatic checks don't run in Codex, so ask for `$pr-check` before you push.
- **GitHub workflow:** `/lynncraft:setup-github` adds checks and QA to every pull request. Refreshing the docs after each merge uses a Claude subscription; the checks and QA work without one.

</details>

## What it does

| Skill | Role | What you get |
|---|---|---|
| `/lynncraft:feature-map` | Maya | `.agentforge/feature-map.json`: every user-facing feature the code implements, with anchors saying where it lives |
| `/lynncraft:feature-spec` | Maya | `docs/specs/<feature>.md` written from the code; each acceptance criterion cites the lines it rests on, and the check verifies every quote |
| `/lynncraft:product-baseline` | Maya | `docs/product/baseline.md`: who the product is for, the journeys across features, and, if you have a PRD in any format, what it asks for against what's built |
| `/lynncraft:work-item` | Maya | A request turned into a typed work item (feature, bug or chore) with testable acceptance criteria, filed as a GitHub issue; questions only when it's unclear |
| `/lynncraft:qa` | Priya | Each acceptance criterion linked to the tests that check it, then run: every feature's QA status, failing tests and untested criteria |
| `/lynncraft:architecture` | Alex | `docs/architecture/README.md`: how the system is built and the rules the code must keep. Ask for "the architecture" and it runs the three below first |
| `/lynncraft:architecture-map` | Alex | The C4 container and component diagrams in `docs/architecture/`, every path checked |
| `/lynncraft:workflows` | Alex | The main runtime flows as sequence diagrams in `docs/architecture/workflows/`, every cited file checked |
| `/lynncraft:decision-records` | Alex | The decisions already in effect in `docs/adr/`, each naming the code it governs |
| `/lynncraft:tech-plan` | Alex | The smallest reversible plan for a work item or issue, impact rated none / minor / major, a decision record when major |
| `/lynncraft:pr-check` | Both | Spec drift and architecture checks on your branch before you open a PR |
| `/lynncraft:refresh-docs` | Both | The feature map, specs and architecture docs brought up to date in one unattended pass |
| `/lynncraft:setup-github` | — | A GitHub workflow: the checks and QA on every pull request, and the docs refreshed after each merge |

Commands are shown as in Claude Code; in Codex, use `$<skill>` (for example `$feature-map`). You don't have to type them. Claude and Codex pick them up when you ask for what they do: "what features does this app have?", "spec the checkout feature", "are the goals criteria tested?", "is this branch OK to PR?".

## It runs without you asking

In Claude Code:

- **Before every push or PR.** When Claude is about to run `git push` or `gh pr create`, the plugin runs the PR check first. If it finds something, Claude shows you the findings before anything leaves your machine. Say go ahead and it pushes; the same commit is never stopped twice.
- **At the start of a session.** If the repository has no feature map, or specs are missing, Claude knows and offers to fix it.
- **On GitHub.** `/lynncraft:setup-github` adds a workflow: every pull request gets a comment with the checks and a QA run (free, no model), and after each merge Claude Code refreshes the docs on your own Claude subscription.

Browser (Playwright) tests linked to criteria run only against localhost, so check-qa never signs in to your live site from CI. Point them at a local server with `{ "qa": { "browser": { "env": { "E2E_BASE_URL": "http://localhost:3000" } } } }` in `.agentforge/config.json` (use the variable your Playwright config reads), or opt in to a deployed site with `"allowRemote": true`. Without Playwright's own Chromium, check-qa uses the installed Google Chrome.

To turn the local hooks off, add `.agentforge/config.json` with `{ "hooks": { "prePush": false, "sessionStart": false } }`, or set `AGENTFORGE_HOOKS=off`.

## Code checks the work

The model writes; a bundled script decides (`scripts/agentforge.mjs`, Node 18+ and git, no dependencies):

- `check-specs` checks every acceptance criterion's quote against the file it cites, moves a citation to the line where its quote really is, and alone marks a spec complete.
- `check-qa` runs the tests each acceptance criterion names and sets each feature's QA from the results: complete only when every criterion's tests pass. It records the commit and a fingerprint of the feature's code, so a later change reads as "needs re-verify".
- `check-baseline` checks that every journey runs through real features and every PRD requirement cites the feature that builds it.
- `check-architecture` checks the C4 map: every cited file exists, the component view zooms into the container where the agent runs, and each feature has exactly one component holding only its own code.
- `check-workflows` checks every workflow step's code.
- `pr-check` compares your branch with its base.

## Files it keeps in your repository

- `.agentforge/feature-map.json`: the feature map, spec drafts and QA results. Commit it.
- `.agentforge/product-baseline.json` and `docs/product/baseline.md`: the product baseline and its journeys.
- `docs/specs/`: feature specs, each with its scenarios.
- `.agentforge/architecture-map.json`, `.agentforge/workflows.json` and the pages they produce in `docs/architecture/`.
- `docs/architecture/README.md`: the architecture overview.
- `docs/adr/NNNN-*.md`: decision records, with `paths:` naming the code each one governs.

## LynnCraft and AgentForge

LynnCraft is the free plugin. AgentForge, the hosted product from the same maker, reads the same files and keeps them true for a whole team: a live feature map and dashboard anyone can open, each feature's change log linked to the work that changed it, and Software Engineer and QA agents that build and verify on branches.

## Contributing

This repository is published automatically from AgentForge's main repository, so changes made here directly are overwritten. Issues and pull requests are welcome: accepted changes are applied upstream and published from there.

## License

MIT
