---
name: workflows
description: Map the product's main runtime flows step by step (.agentforge/workflows.json) and write a sequence diagram and step table for each in docs/architecture/workflows/ — as LynnCraft's Technical Lead (Alex). Use when the user asks how a flow works end to end (a request, sign-in, a scheduled run, sending or paying), for sequence diagrams, or after a flow's code changes.
---

# Workflows (Alex, Technical Lead)

## Where the code is

In Claude Code, use the current repository. In Claude chat, use the user's connected GitHub repository: clone it into your working directory, pass that folder to the script with `--root <folder>`, and commit the files you wrote and push them (on a new branch with a pull request, unless the user asks you to push to the default branch). If no repository is connected, ask the user to connect GitHub and give you access to it; don't ask for a .zip.

The script is bundled with this skill: `<skill folder>` below is the folder this SKILL.md is in (if it has no `scripts/` folder, use `${CLAUDE_PLUGIN_ROOT}` instead).

## 1. Pick the flows

Read `.agentforge/workflows.json` if it exists (keep each workflow's `id`; re-check its steps) and `.agentforge/feature-map.json` for feature ids.

Choose 4–8 flows a new engineer most needs, in this order:
1. How a user request is handled end to end.
2. How the core feature moves forward.
3. **Anything that acts without the user watching or on their behalf outside the app**: scheduled runs, browser automation, sending, submitting, paying.
4. How integrations sign in and are called.
5. Where user data is stored and read back.

Not internal utilities. If the user named a flow, map only that one.

## 2. Write `.agentforge/workflows.json`

```json
{
  "workflows": [
    {
      "id": "chat-turn",
      "name": "How a chat turn runs",
      "summary": "One or two plain sentences: what this flow achieves. No file paths.",
      "trigger": "The user presses Send in chat",
      "features": ["agent-chat"],
      "steps": [
        { "actor": "user", "to": "client", "action": "Types a message and presses Send", "paths": [] },
        { "actor": "agent", "to": "server", "actorName": "Agent loop", "toName": "LLM proxy", "action": "Sends the conversation and tool definitions", "call": "POST /api/llm", "paths": ["public/js/agent/loop.js"] },
        { "actor": "user", "to": "agent", "action": "Approves the card", "paths": [], "approval": true }
      ],
      "blocks": [{ "kind": "loop", "label": "up to 12 steps", "fromStep": 2, "toStep": 3 }],
      "errorPaths": ["What happens when it goes wrong, as the code handles it."]
    }
  ],
  "limitations": ["Flows or steps you could not confirm."]
}
```

- 4–10 steps per workflow, each a meaningful hand-off, not one function call.
- `actor` and `to`: `user`, `agent` (the model or loop deciding), `client`, `server`, `data` or `external`. `to` is empty when the step stays inside the actor.
- Every step that runs in code cites 1–3 files in `paths` exactly as `git ls-files` shows them (`:line` allowed). Only `user` and `external` steps may have none. Never cite a file you did not read.
- `approval: true` on a step that waits for the user. `actorName`/`toName` name the real part, the same way every time. `call` is short: `POST /api/goals`, `update_step`.
- `features` are ids from the feature map. `blocks` (optional) box repeated (`loop`) or conditional (`alt`, `opt`) steps.

## 3. Check and write the pages

```bash
node "<skill folder>/scripts/agentforge.mjs" check-workflows
```

It checks every cited path against the repository, sets each workflow's status, and writes `docs/architecture/workflows/` (an index and one page per workflow, with a sequence diagram and a step table). It also lists features no workflow serves. Fix what it reports, at most two rounds.

## 4. Report

One line per workflow. Name any risky feature (it acts for the user, or stores their data) that no workflow covers.
