---
name: product-baseline
description: Write the product baseline — what the product is, who it is for, the end-to-end journeys across features with the end-to-end test cases that prove each one, and (when the user has a PRD, in any format) what the PRD asks for against what is built — as LynnCraft's Product Manager (Maya). Use when the user asks what the product does as a whole, for user journeys or their end-to-end test cases, to compare a PRD with the code, or after the feature map changes.
---

# Product baseline (Maya, Product Manager)

The baseline is the one product-level document. Feature specs say what each feature does; the baseline says what the product is, who uses it, and how they move through several features to get something done. When the user has a PRD, the baseline also lines it up against the code — so a PRD written any way at all becomes one comparable shape.

## Where the code is

Work in a checkout of the user's repository: the current repository in Claude Code or Codex, or the repository cloned into the workspace of a Claude Project connected to GitHub. Commit what you write and push it on a branch with a pull request, unless the user asks you to push to the default branch. If you can't run commands here or there's no checkout (a plain chat), say that LynnCraft works in Claude Code, Codex, or a Claude Project connected to GitHub, and stop.

LynnCraft's checks are one script in the plugin's `scripts/` folder, two folders up from this SKILL.md. Run it as `${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs`; where that placeholder isn't filled in (Codex), use `../../scripts/agentforge.mjs` from this skill's folder.

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
        "failures": ["A connector is not linked: Muse asks the user to link it and pauses the step."],
        "testCases": [
          {
            "title": "Goal to sent application",
            "kind": "main",
            "given": "A signed-in job seeker with Gmail linked and one matching job email in the inbox.",
            "steps": [
              "In chat, type \"Get me one interview in 30 days for PM roles\"",
              "Open the goal Muse creates",
              "Approve the application Muse drafts"
            ],
            "expected": [
              "The goal shows 3–6 steps and a deadline 30 days out",
              "The application is marked sent, and nothing was sent before the approval"
            ]
          },
          {
            "title": "Mail not linked",
            "kind": "failure",
            "given": "A signed-in job seeker with no mail account linked.",
            "steps": ["Set the same goal in chat", "Open the goal's step for finding openings"],
            "expected": ["Muse asks the user to link mail", "The step shows as paused, not failed"]
          }
        ]
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
- **End-to-end test cases** (`testCases`, for every journey): how QA proves the journey works in the real app, written so a person could follow them by hand and an engineer could turn each one into one browser test.
  - **One `main` case** that walks the journey's steps to its outcome. **One `failure` case for each item in `failures`**, and an `alternative` case for another start or branch that matters. Usually two to four cases per journey.
  - `given`: what must be true first: who is signed in, which accounts are linked, what data exists. Concrete enough to set up as test data.
  - `steps`: at least two, each one thing a user does through the UI or chat, in the user's words ("Approve the drafted application"), not code or selectors. The product's own actions show up as what the user sees in `expected`.
  - `expected`: what must be seen at the end, each item something a test can check: text on screen, a status, a record saved, a message sent or **not** sent. For approval steps, say that nothing happens before the approval.
  - Write cases the code supports today; ids (J1-T1…) are added by the check. Leave `tests` and `qa` off: the `verify` skill links each case to the automated test that performs it, and the script sets `qa`.
- **PRD** (omit the whole `prd` object when there is none): one entry per requirement the PRD states, in your words, with `source` saying where in the PRD it is (section, heading or page). `status` is `built`, `partial` or `not_built`, judged from the feature map and specs, and `features` lists the feature ids that build it. Never mark a requirement built without naming the feature.
- **Open questions:** gaps and conflicts the user should decide — PRD and code disagreeing, a journey that stops halfway.

Write only the `document` object; the check adds the rest.

## 3. Check

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs" check-baseline
```

It checks that every journey step names a feature in the map, that each journey crosses at least two features and has a main-path test case, that every test case has steps and an expected result, and that PRD requirements cite real features; it sets the baseline's status and writes `docs/product/baseline.md`, with each feature linked to its spec. Fix what it reports and run it again — at most two rounds.

## 4. Report

Summarize: the journeys (one line each), how many features they cover, how many end-to-end test cases they have, and with a PRD, how much of it is built and what is built but not in the PRD. Offer the `feature-spec` skill for features on a P1 journey whose spec isn't complete, and the `verify` skill to automate the test cases (it links an existing test to each case, or writes the missing ones).

When you update the baseline, keep each test case's `tests` and `qa`, and each journey's own `tests` and `qa` from older baselines: `tests` are linked end-to-end tests and `qa` is set by the script. If a journey's steps change, update its test cases to match and tell the user which linked tests may need changing too.
