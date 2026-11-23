---
name: setup-github
description: Set up AgentForge on GitHub for this repository — a workflow that posts the Spec drift and Architecture checks and runs QA (each acceptance criterion's tests) on every pull request, re-records QA after each merge, and refreshes the feature map, specs and architecture docs on the user's own Claude subscription. Use when the user wants AgentForge to run automatically, on GitHub, or on every PR.
---

# Set up AgentForge on GitHub

One workflow file and a copy of AgentForge's checks do it. The pull-request checks and QA need nothing else. The docs refresh needs one secret: a token for the user's Claude subscription.

## Where it runs

Claude Code only: it writes a workflow into the repository and opens a pull request with `gh`. In Claude chat, explain what it sets up and ask the user to run it in Claude Code.

The script is bundled with this skill: `<skill folder>` below is the folder this SKILL.md is in (if it has no `scripts/` folder, use `${CLAUDE_PLUGIN_ROOT}` instead).

## Steps

1. **Check the repository.** Confirm it is on GitHub (`git remote get-url origin`) and that the GitHub CLI is signed in (`gh auth status`). Find the default branch: `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`. If `.github/workflows/agentforge.yml` already exists, compare it with the template and offer to update it instead.
2. **Explain before changing anything.** In a few lines, tell the user what the workflow does — a comment on every PR with the checks, a QA check that runs each acceptance criterion's tests and fails the PR's QA check when one fails (both free, no model), QA re-recorded on the default branch after each merge, and a docs refresh after each merge that uses their Claude subscription and commits to the default branch — and ask to go ahead.
3. **Add the workflow and the checks.** Copy `<skill folder>/templates/agentforge.yml` to `.github/workflows/agentforge.yml`. If the default branch is not `main`, change the `branches: [main]` line to it. Then copy the checks into the repo — CI runs this copy, because the plugin's own repository is private:

   ```bash
   node "<skill folder>/scripts/agentforge.mjs" install-ci
   ```

   It writes `.agentforge/bin/`. Commit it with the workflow. Running this skill again replaces the copy with the current plugin's version.
4. **The Claude token.** The user runs this in their own terminal (it opens a browser to sign in, so you can't run it for them):

   ```bash
   claude setup-token
   ```

   Then they store what it prints as a repository secret — they can paste it when prompted:

   ```bash
   gh secret set CLAUDE_CODE_OAUTH_TOKEN
   ```

   This needs a Pro, Max, Team or Enterprise plan. Without the secret, the PR check still runs and the docs refresh is skipped with a note. To use an API key instead, they set `ANTHROPIC_API_KEY` and you change the workflow's `claude_code_oauth_token` line to `anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}`.
5. **Open a pull request.** With the user's go-ahead: create a branch `agentforge/setup`, commit the workflow and `.agentforge/bin/`, push, and run `gh pr create --title "Add AgentForge checks and docs refresh" --body "..."`, saying what it does in the body. The PR itself is the first one AgentForge checks.
6. **After merging,** suggest running the docs refresh once by hand (`gh workflow run AgentForge`) so the feature map exists before the next PR.

## Notes for the user

- If the default branch is protected against direct pushes, the docs job's commit fails; allow GitHub Actions to push, or ask to change the job to open a pull request instead.
- The Spec drift and Architecture checks are advisory. The QA check fails when a criterion's test fails or a linked test can't be found (criteria with no test yet are only listed); it blocks merges only if the user makes it a required check in branch protection — suggest trying it on a few PRs first.
- The qa-record job pushes to the default branch, like the docs refresh.
- To turn the local Claude Code hooks off, put `{ "hooks": { "prePush": false, "sessionStart": false } }` in `.agentforge/config.json`.
