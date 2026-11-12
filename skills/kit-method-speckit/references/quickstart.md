# Spec Kit Phase Sequence

Source basis: Spec Kit's standard workflow, adapted for Enterprise App Kit slice orchestration.

## Required Sequence

For each delivery slice, run phases in this order:

```text
speckit-specify
speckit-clarify      # run when ambiguity remains or review asks for it
speckit-plan
speckit-checklist    # run when requirements quality, completeness, or consistency needs a gate
speckit-tasks
speckit-analyze
speckit-implement
speckit-converge
```

Run `speckit-constitution` once before the slice loop. The orchestrator owns constitution creation; workers own slice phases.

## Phase Responsibilities

- `speckit-specify`: capture what and why at product altitude. Exclude stack, repo paths, SDKs, schemas, and API shapes unless translated into observable behavior.
- `speckit-clarify`: resolve ambiguity before planning. Use when the source artifacts, generated spec, or orchestrator review leave a meaningful decision open.
- `speckit-plan`: name concrete technical choices: stack, architecture, repo routing, data, integrations, security, NFRs, validation, and agent/LLM/MCP framework when applicable.
- `speckit-checklist`: validate requirements completeness, clarity, and consistency after the plan exists. Skip only when the slice is unambiguous and review records why.
- `speckit-tasks`: produce actionable implementation tasks from the approved spec and plan.
- `speckit-analyze`: check spec/plan/task consistency before implementation. Do not enter implementation until analysis is clean or follow-up fixes are complete.
- `speckit-implement`: write source files under `repos/`, execute tasks, and run required validation under an open implement ledger entry.
- `speckit-converge`: compare implementation against the feature artifacts and source requirements. If it appends tasks, run `speckit-implement` again, then repeat `speckit-converge`.

## Advancement Rules

- Advance only after the orchestrator reviews the worker report and marks the ledger entry complete.
- Existing artifacts do not replace their phase; execute or explicitly revalidate the phase.
- Do not compress small changes into direct edits. New scope returns to `kit-scope-mapping`, then through this phase sequence.
- The final all-slice convergence pass is separate from per-slice convergence and must include `product-delivery-slices.md` so decomposition gaps are caught.
