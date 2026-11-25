---
name: refresh-docs
description: Bring the feature map, feature specs and architecture docs up to date with the code in one pass, without stopping to ask — when the user starts using LynnCraft on an existing project, or asks to refresh or update all the LynnCraft docs.
allowed-tools: Read, Glob, Grep, Write, Edit, Bash(git log *), Bash(git diff *), Bash(git ls-files *), Bash(git show *), Bash(node *)
---

# Refresh the LynnCraft docs (Maya and Alex)

Use it to catch the docs up with the code in one go: when a project starts using LynnCraft, or when code reached the default branch without its docs. Day to day, specs change in each pull request, with the code, and verification before every push and on GitHub keeps them aligned. This pass changes only docs, so its push doesn't wait for `verify`; if you change code, run `verify` and fix any *Must fix* before pushing. Do the whole pass without asking questions; put anything you could not confirm in the documents' limitations, not in a question. Do the work on a branch and open a pull request, so the refreshed docs are verified like any other change; don't push to the default branch unless the user asks.

LynnCraft's checks are one script in the plugin's `scripts/` folder, two folders up from this SKILL.md. Run it as `${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs`; where that placeholder isn't filled in (Codex), use `../../scripts/agentforge.mjs` from this skill's folder.

1. **What changed.** Run `git log --oneline -30` and, when `.agentforge/feature-map.json` exists, `git log -1 --format=%H -- .agentforge/feature-map.json` and `git diff --stat <that commit>..HEAD` to see what changed since the docs were last refreshed. Focus on those paths; don't re-read the whole repository when little changed.
2. **Feature map.** Follow the `feature-map` skill: add features for new code, update anchors for moved code, mark features whose code is gone as `removed` (including `deprecated` ones whose code has now been deleted). Never mark a feature `deprecated` unattended: only the user knows a feature is out of use. Keep every existing `id`.
3. **Specs.** Follow the `feature-spec` skill for features whose code changed and for features without a complete spec — at most 8 features per run, changed ones first. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs" check-specs` and fix what it reports, at most two rounds.
4. **Architecture.** Otherwise leave the architecture docs alone.
   **Architecture map.** If `.agentforge/architecture-map.json` is missing, or the changes add, remove or move a container, move code between containers (for example the agent loop from the browser to the server), or add or remove a feature's tools, follow the `architecture-map` skill and run `node "${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs" check-architecture`.
   **Workflows.** If `.agentforge/workflows.json` is missing, or the changes touch files that a workflow step cites, follow the `workflows` skill for those workflows only, and run `node "${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs" check-workflows`.
   **Decision records.** If the changes add or remove a dependency, data store, outside service, deploy file or auth code, follow the `decision-records` skill. A record that changes the architecture always comes with an updated map.
   **Overview.** If `docs/architecture/README.md` is missing, or any of the above changed, follow the `architecture` skill to update the overview last.
5. **Product baseline.** If features were added or removed, or `.agentforge/product-baseline.json` is missing, follow the `product-baseline` skill: keep journeys that still hold, fix ones that run through changed features (and their end-to-end test cases with them), and run `${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs check-baseline`. Use the PRD the baseline already names; don't go looking for a new one unattended.
6. **Summary.** End with a short summary: features added, changed or removed; specs completed or still in progress; architecture records added; workflows updated; journeys added or changed. Put it in the pull request's description.
