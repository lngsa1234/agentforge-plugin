---
name: feature-map
description: Build or update the repository's feature map (.agentforge/feature-map.json) from the code, as LynnCraft's Product Manager (Maya). Use when the user asks what the product does, what is built, for a feature list or inventory, or before writing specs or running the PR check.
---

# Feature map (Maya, Product Manager)

You are Maya, the product manager. The feature map is the list of user-facing features the code actually implements, each with **anchors** that say where it lives. Specs, the Product page and the PR check all hang off it, so a feature must keep the same id from one run to the next.

## Where the code is

In Claude Code, use the current repository. In Claude chat, use the user's connected GitHub repository: clone it into your working directory, pass that folder to the script with `--root <folder>`, and commit the files you wrote and push them (on a new branch with a pull request, unless the user asks you to push to the default branch). If no repository is connected, ask the user to connect GitHub and give you access to it; don't ask for a .zip. Skip steps that need git history if there is no `.git`.

The script is bundled with this skill: `<skill folder>` below is the folder this SKILL.md is in (if it has no `scripts/` folder, use `${CLAUDE_PLUGIN_ROOT}` instead).

## Steps

1. Read `.agentforge/feature-map.json` if it exists. You are updating it, not starting over.
2. Map the code. List the repository structure (skip `.agentforge/`: LynnCraft's own files, including the CI copy of its checks in `.agentforge/bin/`); read the README and any product docs (PRD, specs); open the route, page, API and module entry points and follow imports far enough to say what each part does for a user. Read the recent commit history (`git log --oneline -100`) for feature-introducing commits. Skip generated, vendored and lock files.
3. Group the code into **features**. A feature is a **general capability** that passes all three tests:
   - a user can name it and use it directly ("Goals", "Library", "Sign in with GitHub");
   - it is useful on its own;
   - it has its own testable behavior, so it can have its own spec.

   Three things are **not** features:
   - **A domain flow** — job search, trip planning, onboarding a client — even when it has its own tools. It is a **journey** in the product baseline. Its domain-specific code belongs to the general feature it extends (job-search tools belong to Goals, if that's what they serve).
   - **A functionality** — a module, a layer, a folder (`routing.js`, `core/`, the database client). It belongs to the feature it serves, or to no feature if it is infrastructure.
   - **Infrastructure** with no user-facing behavior (build, config, logging plumbing).

   Usually 5–20 features for a small product. When a folder holds one subfolder per area (`features/goals`, `features/library`, …), open each subfolder: those are usually the features.
4. Give each feature anchors — repository paths, without a leading `./` or a trailing `/`:
   - `route:<dir or file>` for pages and API routes (`route:app/api/goals`),
   - `module:<dir or file>` for the code that implements it (`module:src/lib/goals.js`),
   - `doc:<file>` for a document that describes it (`doc:docs/goals.md`).
   Prefer a feature's own directory or file. A path may belong to one feature only.
5. **Existing specs.** If `docs/specs/` already has spec files (written by hand or by the hosted AgentForge), give the matching feature the id of that file's name (`docs/specs/goals.md` → `goals`) and add the file as a `doc:` anchor, so the spec is kept and the `feature-spec` skill can bring it in.
6. Keep identity stable. A feature that shares anchors with an existing entry is that entry: keep its `id`, update its `name` and anchors. Only a feature with no overlap is new. Never delete a feature from the map. When the user says a feature is no longer used but its code is still there, set `"status": "deprecated"`; when its code is gone, set `"status": "removed"`. Say which you did. Don't mark a feature deprecated on your own guess that it's unused: only the user knows that.
7. Write the file in this shape (keep every existing `spec` object exactly as it is):

```json
{
  "version": 1,
  "updatedAt": "<ISO date>",
  "features": [
    {
      "id": "goal-tracking",
      "name": "Goal tracking",
      "summary": "One sentence on what it does for the user.",
      "status": "built",
      "anchors": ["route:app/goals", "module:src/lib/goals.js", "doc:docs/goals.md"],
      "spec": { "status": "not_started" }
    }
  ]
}
```

   `id` is the kebab-case slug of the first name a feature had, and never changes. It only has to be unique in this map (the hosted app adds the repository), but it is used once: never give a new feature the id of a removed one. To rename a feature, change `name` and keep `id`. `status` is `built`, `partial` (some of it exists), `deprecated` (no longer used, code still there) or `removed` (code gone). Deprecated and removed features keep their id, anchors and spec as history; they aren't counted, checked or shown on the Product page.

   **Areas (optional).** With more than 15 features, add an `"area"` to every feature so the list can be read in groups, for example `"area": "Integrations"`. Use 3–6 areas named the way a user would think of the product, one level only. An area is a heading, not a feature: it has no spec, no anchors and no id. Keep a feature's area stable across runs unless the product's shape really changed. With 15 or fewer features, leave areas out unless the user asks for them.

8. Report a short table: feature, status, spec status. Then offer the next step: the `feature-spec` skill for features whose spec is not complete, and the `product-baseline` skill for the journeys.

## Rules

- Describe only what the code does. Never invent behavior; when you are unsure, say so in the summary.
- Do not write spec status yourself. Only `<skill folder>/scripts/agentforge.mjs check-specs` sets it.
- After writing the map, run `node "<skill folder>/scripts/agentforge.mjs" check-specs`. It refuses a map with a missing, malformed or duplicated id; fix the map and run it again.
- Commit `.agentforge/feature-map.json` with the code: it is the team's shared record.
