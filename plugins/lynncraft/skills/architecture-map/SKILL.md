---
name: architecture-map
description: Map the system's C4 containers and the components inside the container where the agent runs (.agentforge/architecture-map.json), and write the container and component diagrams in docs/architecture/ — as LynnCraft's Technical Lead (Alex). Use when the user asks what the system is made of, for a C4 or component diagram, or after a container or data store is added, removed or moved.
---

# Architecture map (Alex, Technical Lead)

## Where the code is

Work in a checkout of the user's repository: the current repository in Claude Code or Codex, or the repository cloned into the workspace of a Claude Project connected to GitHub. Commit what you write and push it on a branch with a pull request, unless the user asks you to push to the default branch. **Verify before every push or merge:** run LynnCraft's `verify` (as the `verify` skill describes) and don't push, open a pull request or merge while it reports *Must fix*; fix it, or tell the user what blocks it. Pushes that change only `docs/`, `.agentforge/` or Markdown files are exempt. In Claude Code a hook enforces this; in Codex and Claude Projects, you do. If you can't run commands here or there's no checkout (a plain chat), say that LynnCraft works in Claude Code, Codex, or a Claude Project connected to GitHub, and stop.

LynnCraft's checks are one script in the plugin's `scripts/` folder, two folders up from this SKILL.md. Run it as `${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs`; where that placeholder isn't filled in (Codex), use `../../scripts/agentforge.mjs` from this skill's folder.

## 1. Read

Read `.agentforge/architecture-map.json` if it exists: you are updating it. Read `.agentforge/feature-map.json` for feature ids. Then the manifests, deploy and environment files, entry points and data access code. Find where the agent loop runs (browser or server): check the code, not an older map.

## 2. Write `.agentforge/architecture-map.json`

```json
{
  "systemName": "Mini Muse",
  "summary": "Two or three plain sentences: what runs where. No file paths.",
  "people": [{ "id": "user", "name": "User", "uses": "Chats with Muse, approves actions" }],
  "components": [
    { "id": "browser-app", "name": "Browser app", "layer": "client", "tech": "ES modules", "summary": "…", "paths": ["public/js"] },
    { "id": "db", "name": "Database", "layer": "data", "tech": "Postgres", "summary": "…", "paths": ["supabase/migrations"] }
  ],
  "connections": [{ "from": "browser-app", "to": "db", "label": "Reads and writes goals", "technology": "HTTPS" }],
  "componentView": {
    "container": "browser-app",
    "components": [
      { "id": "agent-loop", "name": "Agent loop", "kind": "agent", "tech": "JS", "summary": "…", "paths": ["public/js/agent/loop.js"] },
      { "id": "goals-ui", "name": "Goals", "kind": "feature", "feature": "goals", "tech": "JS", "summary": "…", "paths": ["public/js/features/goals"] }
    ],
    "relationships": [{ "from": "agent-loop", "to": "goals-ui", "label": "Calls goal tools", "technology": "function call" }]
  },
  "limitations": ["What you could not confirm."]
}
```

**Containers** (`components`, 4–8): the deployable parts, data stores and outside services. `layer` is `client`, `server`, `data` or `external`. A container groups many files; it is never a single module.

**Component view** (6–14): zoom into the container where the agent loop runs. `kind` is one of:
- `feature` — one feature's UI module (browser) or tools (server), with `feature` set to its id in the feature map. **One component per feature, never two features in one**, however small.
- `agent` — the loop, prompt building, model calls, approvals.
- `tools` — the registry or bridge that collects tools.
- `state` — state or data access.
- `shell` — bootstrap, routing or endpoints.

Rules:
- `paths` exactly as `git ls-files` shows them, and they must exist.
- Connections and relationships only where you saw the call in the code.
- If a feature's code here isn't among its `anchors` in the feature map, add it there.

## 3. Check and write the pages

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/agentforge.mjs" check-architecture
```

It checks every path against the repository, that the component view zooms into a real container, and that each feature has one component holding only its own code. It sets the map's status and writes `docs/architecture/c4-containers.md` and the components page with Mermaid diagrams, removing a components page for a container the view no longer zooms into. Fix what it reports, at most two rounds.

## 4. Report

The containers, where the agent runs, the components, and anything in `limitations`. If `docs/architecture/README.md` exists, check its container links still hold.
