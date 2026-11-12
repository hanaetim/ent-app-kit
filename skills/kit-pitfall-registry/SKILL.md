---
name: kit-pitfall-registry
description: Use for all software planning, implementation, review, MVP, mock, prototype, Spec Kit, frontend, backend, API, workflow, agentic, or enterprise application work. Prevents simplistic architecture, shallow mocks, weak validation, and implementations that satisfy tasks but miss the user's quality bar.
---

# Common Pitfalls

## Core Rule

Do not confuse limited scope with low quality.

A mock, MVP, or prototype may use fake data and fake integrations, but it should still use production-shaped architecture when the user wants a serious or enterprise-grade application.

## Always Check

Before implementing, ask whether the plan is underpowered for the user's stated goal. If it is, say so and propose a stronger approach.

Prefer:
- Fake adapters behind real boundaries
- Clear domain/application/infrastructure separation
- Mocked identity, roles, and permissions when relevant
- Real workflow states, ownership, and blocked paths
- Explicit audit/event and API error contracts
- Operational UI, not placeholder or validation-console UI
- Tests for permissions, blocked actions, audit evidence, and deferred scope

Avoid:
- Treating fixtures as architecture
- Ad hoc JSON as the main state model
- Passing generated tasks while missing the real quality bar
- Deferring enterprise concerns just because integrations are mocked

## Review Bias

Judge the result against the user's target quality level, not just whether tests pass.

## Pitfall Registry

The canonical list of concrete, checkable failure patterns lives in
`references/pitfall-registry.md`. Each entry carries a stable ID and a `Check:` line stating
how to verify it and what counts as evidence.

Use it in two ways:
- **Ad hoc:** during planning or review of any substantial work, load it and run the
  applicable checks.
- **Workflow-driven:** structured workflows (e.g. Enterprise App Kit slicing) classify every
  entry against their scope, place applicable ones where the workflow enforces things, and
  record not-applicable ones with a reason. Follow the consuming workflow's instructions.

When a build surfaces a defect no entry covers, propose a new entry (ID, pattern, check) —
additions are deliberate, registry stays small and sharp.
