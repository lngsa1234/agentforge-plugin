# LynnCraft

*Built by Lynn, a solo builder, for solo builders.*

You build fast with AI. LynnCraft keeps your vibe coding high quality, and lets your AI do more on its own.

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

In Codex, skills start with `$` instead of `/lynncraft:`, for example `$feature-map`. Either way, you don't have to type them: just ask for what you want.

## Vibe code with quality, on autopilot

Vibe coding is fast, but it's easy to lose track: features that half work, docs that drift from the code, tests nobody runs. LynnCraft adds the checks a careful team would do, and runs them for you, so your AI can keep building without you watching every step.

**Quality you can trust**

- **Code checks the AI's work.** Maya and Alex write the docs, but a small script that comes with the plugin checks them. It confirms that every quote in a spec really is in your code, runs the tests linked to each acceptance criterion, and checks that every file in the architecture diagrams exists. Only the script can mark a spec "complete" or a feature "tested".
- **You always know what's really built.** Every feature shows whether it's specced and tested. Change a feature's code later and it's marked "needs re-verify", so nothing quietly breaks.

**Less babysitting**

- **Checks before every push.** When your AI is about to push code or open a pull request, LynnCraft checks the changes first and shows you only what needs your attention. Say "go ahead" and it pushes. It never stops the same change twice.
- **It notices what's missing.** When you open a project with no feature map or specs, Claude offers to create them.
- **It keeps going after you merge (optional).** Ask Claude to "set up LynnCraft on GitHub". Every pull request then gets a comment with the checks and a test run (free, no AI involved), and after each merge the docs update themselves on your own Claude subscription.

The checks before a push and at the start of a session run automatically in Claude Code. In Claude chat and Codex, ask "is this branch OK to PR?" before you push.

<details>
<summary>For developers: the checks and settings</summary>

The bundled script is `scripts/agentforge.mjs` (Node 18+ and git, no dependencies):

- `check-specs`: each acceptance criterion's quote against the file it cites; fixes line numbers that moved; the only thing that marks a spec complete.
- `check-qa`: runs each criterion's tests and sets the feature's QA status; records the commit and a fingerprint of the feature's code, so later changes read as "needs re-verify".
- `check-baseline`: every journey runs through real features, and every PRD requirement cites the feature that builds it.
- `check-architecture`: every file the C4 map cites exists, and each feature has exactly one component holding only its own code.
- `check-workflows`: every workflow step's code exists.
- `pr-check`: compares your branch with its base (the check before a push).

**Browser tests.** Playwright tests linked to criteria run only against localhost, so CI never signs in to your live site. Set the local server in `.agentforge/config.json`, using the variable your Playwright config reads: `{ "qa": { "browser": { "env": { "E2E_BASE_URL": "http://localhost:3000" } } } }`. Add `"allowRemote": true` to test a deployed site. Without Playwright's own Chromium, the installed Google Chrome is used.

**Turning the automatic checks off.** Put `{ "hooks": { "prePush": false, "sessionStart": false } }` in `.agentforge/config.json`, or set `AGENTFORGE_HOOKS=off`.

</details>

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
