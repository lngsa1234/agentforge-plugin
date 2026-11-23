---
name: architecture
description: Write or refresh the architecture overview (docs/architecture/README.md) that explains how the system is built and links its C4 map, workflows and decision records — as AgentForge's Technical Lead (Alex). Use when the user asks how the system is built, for an architecture doc, or for a full architecture refresh.
---

# Architecture overview (Alex, Technical Lead)

The overview is the one page a new engineer reads first. It explains the system in prose and links the detail, which lives in three other skills:

| Detail | Skill | Writes |
|---|---|---|
| Containers and components (C4) | `architecture-map` | `docs/architecture/c4-*.md` |
| Runtime flows | `workflows` | `docs/architecture/workflows/` |
| Decisions in effect | `decision-records` | `docs/adr/NNNN-*.md` |

**Full refresh** (the user asks for "the architecture" with no narrower ask, or nothing exists yet): run `architecture-map`, then `workflows`, then `decision-records`, then write this overview last so its links are real. Otherwise do only what was asked.

## Where the code is

In Claude Code, use the current repository. In Claude chat there is no checkout: ask for the repository as a .zip (GitHub: **Code → Download ZIP**) or use a connected GitHub tool, unpack it into your working directory, and hand back the files you wrote as a .zip to commit.

## 1. Read the system

Skip `.agentforge/`. Read the README, the package manifests, configuration (environment templates, deploy files, CI), the entry points, the data access layer and migrations, and anything about authentication or security. Follow imports until you can say how a request flows through the system. If the other three skills just ran, reuse what they read.

## 2. Write `docs/architecture/README.md`

```markdown
---
title: Architecture — <system name>
type: Architecture
owner: Alex (Technical Lead)
---

# Architecture — <system name>

<What the system is and what runs where: one paragraph, no file paths.>

## Containers and components
<One line each, linking c4-containers.md and the components page.>

## Workflows
<One line per workflow, linking its page in workflows/.>

## Decisions
| ADR | Decision | Status |
|---|---|---|

## Rules
- <An invariant the code must keep, e.g. "API keys never reach the browser", with the file that enforces it.>
```

- **Rules** are the most useful part: 3–8 invariants a change could break, each citing where it is enforced. Only rules the code actually keeps.
- Link, don't repeat. Diagrams and flow steps live on their own pages; two copies drift apart. If a linked page doesn't exist yet, leave the section out rather than linking nowhere.
- No folder or file map: it goes stale and says nothing about design.
- Keep it under two screens.

## 3. Report

Say what the system is in two sentences, list the rules, and name any of the three detail skills not yet run.
