# OpenSpec Workflow: Simple

Use this profile for ordinary slices where the scope is clear enough to generate all planning artifacts in one pass.

Flow:

```text
explore? -> propose -> artifact review -> update-change? -> apply-change -> sync-specs -> archive-change
```

## Steps

Word every delegation per `delegation.md`: `<openspec-skill-name> <change-name> — <short intent>`, operation first — intent never enumerates the work. Each step below is a separate delegation and review boundary. `openspec/config.yaml` must already be populated by the adapter's Required Setup before these steps begin, or the standing obligations these steps rely on will not reach any artifact.

1. Run `openspec-explore` only when the codebase shape, integration path, requirements, or implementation approach is unclear. Exploration creates no artifacts and does not authorize source edits.
2. Run `openspec-propose` using the slice ID as the OpenSpec change name. This creates the change and all planning artifacts in one step: `proposal.md`, delta `specs/`, `design.md`, and `tasks.md`.
3. Review generated artifacts against the slice, payload source artifacts, repo routing, design constraints, integration fidelity, and enterprise quality gates.
4. If review finds drift, gaps, contradictions, or weak source fidelity, run `openspec-update-change` with the review findings and re-review before applying.
5. Run `openspec-apply-change` to implement incomplete tasks. This is the only operation that may modify `repos/`. If tasks remain incomplete, validation fails, or implementation reveals a planning gap, stop advancement and run the next required `apply` or `update-change` operation after orchestrator review.
6. Run `openspec-sync-specs` to merge delta specs into `openspec/specs/` only after implementation and validation are acceptable or explicit user-approved deferrals exist.
7. Run `openspec-archive-change` after sync, implementation, and validation are complete.

## Review Gate

Before `apply-change`, verify:

- the slice business outcome and source references are preserved;
- delta requirements and scenarios are testable;
- architecture, stack, integrations, design, and repo routing match source artifacts;
- for any screen with a wireframe, `tasks.md` carries an explicit fidelity check against the *rendered* baseline including computed typography — not merely a reference to the wireframe file;
- enterprise constraints are covered: auditability, access control, observability, startup/seeding, accessibility, and validation;
- deferrals or deviations have explicit user approval.
