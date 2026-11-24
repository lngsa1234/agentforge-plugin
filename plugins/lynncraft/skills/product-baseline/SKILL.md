---
name: product-baseline
description: Write the product baseline — what the product is, who it is for, the end-to-end journeys across features, and (when the user has a PRD, in any format) what the PRD asks for against what is built — as LynnCraft's Product Manager (Maya). Use when the user asks what the product does as a whole, for user journeys, to compare a PRD with the code, or after the feature map changes.
---

# Product baseline (Maya, Product Manager)

The baseline is the one product-level document. Feature specs say what each feature does; the baseline says what the product is, who uses it, and how they move through several features to get something done. When the user has a PRD, the baseline also lines it up against the code — so a PRD written any way at all becomes one comparable shape.

## Where the code is

In Claude Code, use the current repository. In Claude chat, use the user's connected GitHub repository: clone it into your working directory, pass that folder to the script with `--root <folder>`, and commit the files you wrote and push them (on a new branch with a pull request, unless the user asks you to push to the default branch). If no repository is connected, ask the user to connect GitHub and give you access to it; don't ask for a .zip. Skip steps that need git history if there is no `.git`.

The script is bundled with this skill: `<skill folder>` below is the folder this SKILL.md is in (if it has no `scripts/` folder, use `${CLAUDE_PLUGIN_ROOT}` instead).

## 1. Gather

1. Read `.agentforge/feature-map.json`. If it is missing, run the `feature-map` skill first: journeys are built from its features.
2. Read the specs in `docs/specs/` for the features you will use, and the README.
3. **The PRD, if there is one.** Use the file the user names. Otherwise look for one — `docs/PRD*.md`, `docs/prd/`, `PRD.md`, `docs/product/`, a `requirements` or `spec` document at the top level — and ask the user which one only if you find several. No PRD is fine: write the baseline from the code alone. A PRD can be in any shape — narrative, user stories, a feature list, a table, a slide outline. Don't copy its structure; pull out the requirements it actually states.
4. If `.agentforge/product-baseline.json` exists, you are updating it: keep journeys that still hold, in the same order, and change only what the code or PRD changed.

## 2. Write `.agentforge/product-baseline.json`

```json
{
  "document": {
    "product": {
      "name": "Mini Muse",
      "summary": "Two or three sentences: what the product is and who it is for.",
      "users": [{ "name": "Job seeker", "needs": "Wants an agent to work through a job search with them." }]
    },
    "journeys": [
      {
        "title": "Land one interview in 30 days",
        "user": "Job seeker",
        "goal": "Get an interview within a month, without doing every step alone.",
        "trigger": "The user tells Muse their goal in chat.",
        "priority": "P1",
        "steps": [
          { "actor": "user", "action": "States the goal and target roles in chat", "short": "States the goal", "feature": "agent-chat", "approval": false },
          { "actor": "agent", "action": "Creates the goal with a plan of steps and a deadline", "feature": "goals", "approval": false },
          { "actor": "agent", "action": "Finds openings in the user's mail and drafts an application", "feature": "connectors", "approval": false },
          { "actor": "agent", "action": "Sends the application", "short": "Sends it", "feature": "connectors", "approval": true }
        ],
        "outcome": "An interview is logged against the goal.",
        "failures": ["A connector is not linked: Muse asks the user to link it and pauses the step."]
      }
    ],
    "prd": {
      "path": "docs/PRD.md",
      "requirements": [
        { "requirement": "Users can set a goal with a deadline", "source": "§2.1", "status": "built", "features": ["goals"], "note": "" }
      ]
    },
    "openQuestions": []
  }
}
```

- **Users:** the kinds of people the product serves, from the PRD or what the code shows.
- **Journeys:** 3 to 6 end-to-end journeys — what a user actually sets out to do — ordered by importance (P1 first). Domain flows are journeys, not features: job search, trip planning, onboarding a client. When one can start in more than one way (from a goal, or from a chat request), write each start that matters as its own journey. Each runs through **at least two features**; a flow inside one feature belongs in that feature's spec as a scenario instead. Every step has an `action` (the full sentence) and a `short` label of 2–5 words for the journey's diagram ("Finds and scores jobs"), and names its actor (`user`, `agent` or `system`), the feature id from the feature map it happens in, and, for an agent step that sends, submits, spends, deletes or contacts someone, `approval: true` when the product waits for the user. Write journeys the code supports today; a journey the PRD wants but the code can't do goes in `openQuestions`.
- **PRD** (omit the whole `prd` object when there is none): one entry per requirement the PRD states, in your words, with `source` saying where in the PRD it is (section, heading or page). `status` is `built`, `partial` or `not_built`, judged from the feature map and specs, and `features` lists the feature ids that build it. Never mark a requirement built without naming the feature.
- **Open questions:** gaps and conflicts the user should decide — PRD and code disagreeing, a journey that stops halfway.

Write only the `document` object; the check adds the rest.

## 3. Check

```bash
node "<skill folder>/scripts/agentforge.mjs" check-baseline
```

It checks that every journey step names a feature in the map, that each journey crosses at least two features, and that PRD requirements cite real features; it sets the baseline's status and writes `docs/product/baseline.md`, with each feature linked to its spec. Fix what it reports and run it again — at most two rounds.

## 4. Report

Summarize: the journeys (one line each), how many features they cover, and with a PRD, how much of it is built and what is built but not in the PRD. Offer the `feature-spec` skill for features on a P1 journey whose spec isn't complete.
