---
name: setup
description: Set up LynnCraft for this repository, once — the GitHub check that verifies every pull request (specs still match the code, every linked test passes) and blocks the merge until they agree. Free, no model, no secret. Use when the user wants to set up LynnCraft or have it check pull requests, after a LynnCraft update to refresh the repository's copy of the checks, and offer it once the first time the user works on code in a repository that doesn't have it.
---

# Set up LynnCraft for this repository

One workflow file and a copy of LynnCraft's checks. On every pull request, GitHub runs the same verification as the `verify` skill and comments with the result. Nothing runs after a merge: specs, code and tests change together in the pull request. No model, no secret, no cost.

## Where it runs

Work in a checkout of the user's repository: the current repository in Claude Code or Codex, or the repository cloned into the workspace of a Claude Project connected to GitHub. Commit what you write and push it on a branch with a pull request, unless the user asks you to push to the default branch. If you can't run commands here or there's no checkout (a plain chat), say that LynnCraft works in Claude Code, Codex, or a Claude Project connected to GitHub, and stop. If the repository isn't on GitHub, say so.

LynnCraft's checks are one script in the plugin's `scripts/` folder, two folders up from this SKILL.md. Run it as `${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs`; where that placeholder isn't filled in (Codex), use `../../scripts/agentforge.mjs` from this skill's folder.

## Steps

1. **Check the repository.** Confirm it's on GitHub (`git remote get-url origin`) and that you can use GitHub (`gh auth status`). Find the default branch: `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`. If `.github/workflows/agentforge.yml` already exists, compare it with the template and offer to update it instead.
2. **Say what it does, in two lines,** and ask to go ahead: every pull request gets a LynnCraft check and one comment; the check fails when a change breaks an acceptance criterion without updating its spec, or a linked test fails, and the merge waits until it passes.
3. **Add the workflow and the checks.** Copy `${CLAUDE_PLUGIN_ROOT}/templates/agentforge.yml` to `.github/workflows/agentforge.yml`. Then copy the checks into the repository (CI runs this copy):

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs" install-ci
   ```

   It writes `.agentforge/bin/`. Commit it with the workflow. Running this skill again replaces the copy with the current plugin's version.
4. **Open a pull request.** Create a branch `lynncraft/setup`, commit the workflow and `.agentforge/bin/`, push, and open a pull request titled "Verify every pull request with LynnCraft", saying what it does in the body. That pull request is the first one LynnCraft verifies. Give the user the link and ask them to merge it.
5. **Make the check required,** once the setup pull request is merged, so a failing check blocks the merge. With the user's go-ahead:

   ```bash
   gh api -X PUT "repos/{owner}/{repo}/branches/<default branch>/protection" --input - <<'JSON'
   { "required_status_checks": { "strict": false, "contexts": ["verify"] }, "enforce_admins": false, "required_pull_request_reviews": null, "restrictions": null }
   JSON
   ```

   If the branch already has protection rules, read them first (`gh api repos/{owner}/{repo}/branches/<default branch>/protection`) and add `verify` to the existing required checks instead of replacing them. If GitHub refuses (some private repositories on the free plan can't use branch protection, or the user isn't an admin), tell the user: the check still runs and comments on every pull request, it just can't block the merge by itself.

## Notes for the user

- A repository with no feature map yet passes the check with a note; verification starts working once the `feature-map` skill has run.
- Criteria and journeys with no test yet are listed, not failed. Only a failing or missing linked test, or a criterion the change breaks without updating its spec, fails the check.
- The browser tests linked to criteria or journeys run against the app started locally on GitHub's machine, never against the live site (see the `verify` skill).
- To turn off the note Claude Code gets at the start of a session, put `{ "hooks": { "sessionStart": false } }` in `.agentforge/config.json`.
