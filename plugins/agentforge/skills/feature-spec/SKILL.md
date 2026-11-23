---
name: feature-spec
description: Write feature specs from the code for features in the feature map, with acceptance criteria that cite the lines they rest on — as AgentForge's Product Manager (Maya). Use when the user asks to spec, document or finish specs for existing features.
---

# Feature spec from the code (Maya, Product Manager)

A spec here describes a feature **as built**: what it does today, in acceptance criteria a QA engineer can verify. You write it; a script checks that it has every part and writes the page. Pages are marked **Draft, not verified**: the script does not check citations against the code, so you must get them right yourself. You never set a spec's status.

## Steps

1. Read `.agentforge/feature-map.json`. If it is missing, run the `feature-map` skill first. Pick the features the user named, or every feature whose `spec.status` is not `draft`.
2. If the feature's spec file already exists (`docs/specs/<feature>.md`, or `spec.existingDoc` in the map), read it first: keep what is right, re-cite each criterion against the code as it is now, and fill the gaps. The script rewrites the file, so carry over anything worth keeping.
3. For each feature, read its anchors' code — open whole files, and follow imports into the code that implements the behavior.
4. Write the spec into the feature's `spec.document` in the map, in this shape:

```json
{
  "objective": "One or two sentences: what the feature does for the user.",
  "summary": "Two to four plain sentences for anyone on the team: what the user can do, the rules that shape it, its limits.",
  "howItWorks": "A short paragraph for engineers: which files and functions do what.",
  "userStories": ["As a …, I can …"],
  "inScope": ["…"],
  "outOfScope": ["…"],
  "functionalRequirements": ["The system …"],
  "acceptanceCriteria": [
    {
      "given": "a signed-in user with no goals",
      "when": "they submit the new-goal form with a title",
      "then": "the goal appears at the top of their list",
      "surface": "web",
      "evidence": [{ "path": "src/lib/goals.js", "startLine": 42, "endLine": 48, "quote": "goals.unshift(goal)" }]
    }
  ],
  "scenarios": [
    {
      "title": "Add a goal from the form",
      "kind": "main",
      "steps": [
        { "actor": "user", "action": "Fills in the goal form and submits it", "approval": false },
        { "actor": "agent", "action": "Creates the goal with create_goal", "approval": false }
      ]
    }
  ],
  "risks": [],
  "openQuestions": [],
  "limitations": ["What you could not confirm from the code."]
}
```

   - **Write the summary for a reader who never opens the code**: a PM, a designer, a new teammate. `objective` is under 40 words; `summary` is under 90 and says what the user can do, the rules that shape it (limits, approvals, when it runs), and what it doesn't do. No file names, function names, paths or endpoints. Those go in `howItWorks`, a short paragraph for engineers.
   - 3 to 15 acceptance criteria, each a full given / when / then. Write each part as a clause that continues the sentence ("the user presses Enter"), not a sentence of its own.
   - Every criterion cites at least one piece of evidence: the file, the line range you read it at, and a short **verbatim** quote from those lines (one line or a distinctive fragment). Never cite a line you did not read; never paraphrase a quote.
   - `surface` names where QA checks it (web, mobile, API, CLI) when the product has more than one.
   - Put anything you could not confirm in `limitations`, not in a criterion.
   - `scenarios`: one to four flows through the feature, step by step — the main flow first, then the alternatives and failures that matter. Each step names its actor (`user`, `agent` or `system`); set `approval: true` on an agent step that sends, submits, spends, deletes or contacts someone when the code waits for the user first. Only flows the code shows; leave it empty for a feature with no multi-step flow. A flow across several features is a journey in the product baseline (`product-baseline` skill), not a scenario.
5. **Check your own citations.** For every criterion, open the cited file again and confirm the quote appears verbatim at the lines you gave. Fix the line numbers or the quote if not. Nothing else will catch a wrong citation.
6. Write the pages:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs" write-specs
   ```

   It checks each spec has an objective, at least 3 criteria, and a given / when / then with a cited file and quote on each; sets each spec's status to `draft` (all parts there) or `in_progress`; and writes `docs/specs/<feature>.md`.
7. If it lists gaps, fix them and run it again. Stop after two rounds and report what is still open.
8. Report each feature's result: draft, or in progress with its gaps.

## Rules

- Describe behavior the code shows, not behavior you expect. A spec that looks finished but is wrong is worse than one in progress.
- Keep each feature's `id`, `name` and anchors as they are; only the `spec` changes.
