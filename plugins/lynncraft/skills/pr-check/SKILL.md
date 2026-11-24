---
name: pr-check
description: Check the current branch against its base before opening a pull request — spec drift (features whose specs don't move with the code, features with no spec, new code no feature owns) and architecture (decision records the change touches, major-looking changes without a record). Use when the user is about to open or update a PR, or asks whether a change is safe for the specs or the architecture.
---

# Pre-PR check (Maya and Alex)

The same two checks LynnCraft posts on pull requests, run locally against your branch. They are advisory: they tell you what to look at, not whether you may merge.

## Where it runs

It compares your branch with its base, so it needs a git checkout: the current repository in Claude Code or Codex, or a clone of the connected GitHub repository in Claude chat.

The script is bundled with this skill: `<skill folder>` below is the folder this SKILL.md is in (if it has no `scripts/` folder, use the plugin's root folder instead: `${CLAUDE_PLUGIN_ROOT}` in Claude Code, `${PLUGIN_ROOT}` in Codex).

## Steps

1. Run the check (add `--base <branch>` when the branch is not cut from the default branch):

   ```bash
   node "<skill folder>/scripts/agentforge.mjs" pr-check
   ```

2. If it says there is no feature map, or no decision records, offer the `feature-map` or `architecture` skill; the check gets useful once they exist.
3. Go through each finding and act on it with the user:
   - **Spec may no longer match** — read the feature's spec in `docs/specs/` and the changed code. If behavior changed, update the spec's criteria and evidence in `.agentforge/feature-map.json` and run `<skill folder>/scripts/agentforge.mjs check-specs`; if it did not, say so.
   - **No complete spec** — offer the `feature-spec` skill for that feature.
   - **Deprecated features** — the change touches code of a feature that is no longer used. Ask whether to delete that code instead; if it's deleted, set the feature's status to `removed`.
   - **New code in no feature** — add it to the right feature's anchors (or a new feature) with the `feature-map` skill.
   - **Decisions this PR must still follow** — read each record and confirm the change keeps it; if it breaks one, say which and propose a superseding record.
   - **Major change without a decision record** — decide with the user whether it is major (see the `tech-plan` skill's levels). If it is, write the record; if not, note why.
   - **Decision records removed** — restore the file and mark it superseded instead.
4. Summarize what you changed and what is left for the user, then offer to run the check again.
