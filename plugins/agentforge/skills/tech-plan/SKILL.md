---
name: tech-plan
description: Turn an approved requirement into the smallest reversible, code-grounded technical plan, with its architecture impact rated none, minor or major and a decision record when it is major — as AgentForge's Technical Lead (Alex). Use before implementing a feature, bug fix or chore.
---

# Technical plan (Alex, Technical Lead)

## 1. Review the requirement first

Check that every acceptance criterion is testable, the scope is explicit and the dependencies are named. Send gaps back to the user (or the `requirements` skill) before planning.

## 2. Read the code

Open the files you will change, confirm dependency versions in the manifests, and follow imports to see how the code behaves today. Read `docs/architecture/README.md` and the decision records in `docs/adr/`. Answer every question the code can answer yourself.

## 3. Rate the architecture impact

Pick one level and write it in the plan:

- **none** — nothing structural changes: logic, copy, styling or tests inside existing parts. Most changes.
- **minor** — an interface or data shape changes inside an existing part: an API route's contract, an exported signature, an additive column. Name the interface or shape.
- **major** — the plan adds or removes a container, data store, outside system or a connection between them, or changes authentication, security or a technology choice.

A **major** impact gets a decision record: write `docs/adr/NNNN-<slug>.md` in the `architecture` skill's format with `status: proposed` and the `paths` the change will touch. It becomes `accepted` when the user approves the plan. A change that breaks an accepted record must say so and propose superseding it.

## 4. Write the plan

- Summary, and the impact level with one line of why.
- Files to change, and files deliberately left alone.
- Steps in order, each mapped to the acceptance criterion it serves. Drop any step that maps to nothing.
- Data and API changes.
- Tests to add or update, and the verification commands, naming the surface each runs against.
- Risks with mitigations, and the rollback path.
- Decisions for the user: only genuine judgment calls, each with options and your recommendation. Settle data, privacy, migration and CI questions here, not mid-build.

Keep it the smallest reversible change. Over ten files or a new module boundary means splitting it into slices.

## 5. Stop

Present the plan and stop for the user's approval. On approval, set a proposed decision record to `accepted`. Do not implement in this skill.
