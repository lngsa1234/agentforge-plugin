---
name: decision-records
description: Record the architecture decisions already in effect in the code as decision records (docs/adr/NNNN-*.md), each naming the code it governs — as LynnCraft's Technical Lead (Alex). Use when the user asks for ADRs or decision records, why the system uses a technology, or when a plan makes a major architecture change.
---

# Decision records (Alex, Technical Lead)

A decision record says what was chosen, why, and which code would change if the choice changed. Reviewers use the `paths` to see which decisions a change touches.

## Where the code is

In Claude Code, use the current repository. In Claude chat there is no checkout: ask for the repository as a .zip (GitHub: **Code → Download ZIP**) or use a connected GitHub tool, unpack it into your working directory, and hand back the files you wrote as a .zip to commit.

## 1. Find the decisions

Read existing records in `docs/adr/`. Then look for choices that would be expensive to reverse, usually 3–10:
- the data store and how the schema changes (migrations),
- the framework and hosting,
- authentication and where secrets live,
- how outside services and models are called,
- where the agent runs and what needs the user's approval.

A choice that is a library default or easy to swap is not a decision record.

## 2. Write each record

`docs/adr/NNNN-<slug>.md`, numbered after the highest existing number. Never reuse a number.

```markdown
---
title: "ADR-0003: Store goals in Postgres"
type: Decision
status: accepted
paths:
  - src/lib/db.js
  - supabase/migrations
date: 2026-11-21
---

# ADR-0003: Store goals in Postgres

**Status:** accepted · **Deciders:** recorded by Alex from the code

## Context
2–5 sentences: the situation and the forces.

## Decision
We use … (present tense, 1–3 sentences).

## Alternatives considered
- **Option** — why not.

## Consequences
- Positive, negative, and risks with their mitigation.
```

- `paths` lists the files or directories that implement the decision. They must exist.
- `status` is `proposed`, `accepted`, `deprecated` or `superseded by ADR-NNNN`. Decisions found in the code are `accepted`. A planned change (from `tech-plan`) is `proposed`.
- **Existing records** keep their text and number. If one has no frontmatter or no `paths`, add them.
- A record is history: supersede it, never delete it.
- Alternatives only if the code or docs show them, or they are the obvious ones; don't invent a debate.

## 3. Report

A table: number, decision, status, paths. If `docs/architecture/README.md` exists, update its Decisions table.
