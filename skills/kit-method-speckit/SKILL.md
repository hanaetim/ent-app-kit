---
name: kit-method-speckit
description: "Orchestrate Enterprise App Kit implementation through Spec Kit. Use only when `kit-orchestrator` or `.kit-state/state.yaml` selects `method: speckit`, or when the user explicitly asks this adapter to turn requirements, HLD/LLD, architecture docs, wireframes, API/data contracts, backlogs, screenshots, or informal App Kit artifacts into a working application by creating `product-delivery-slices.md`, running one complete Spec Kit workflow per vertical slice, delegating concrete Spec Kit phases one at a time when workers are available, enforcing App Kit source fidelity and backend/UI/integration gates, and converging against the original artifacts."
---

# Kit Method Adapter: Spec Kit

Run the native Spec Kit workflow to turn an Enterprise App Kit package into a working application. This is a method adapter, not a general Spec Kit tutorial.

**Goal:** translate every requirement in `ent-app-kit/` into the final application, faithfully and completely, using Spec Kit as the method. Execute the Spec Kit workflow correctly and guarantee all App Kit specs land in the implementation with no silent deviation, substitution, or partial coverage. If a spec cannot be met precisely, stop and get explicit user approval before narrowing scope.

## Operating Contract

- **Method gate:** when this adapter is selected, use the Spec Kit workflow below for implementation. Do not substitute direct implementation, an imported task list, or a hand-written plan.
- **Orchestrator boundary:** do not ask a worker to run `kit-method-speckit`. You run this adapter and delegate concrete `speckit-*` phase commands.
- **Phase-skill boundary:** the orchestrator must not read or execute slice phase skills (`speckit-specify` through `speckit-converge`). Workers read and execute those phase skills one phase at a time. The orchestrator-owned exceptions are `speckit-constitution` and final all-slice convergence review. If workers are unavailable, stop and ask the user before collapsing this boundary; if the user approves in-session execution, preserve the same phase boundaries and record `worker: "main-no-workers"` in the ledger.
- **Source authority:** App Kit source artifacts outrank generated Spec Kit artifacts. On conflicts between source artifacts, stop, name the conflicting files and requirements, and get user direction before choosing one. On conflicts between source and generated artifacts, update or rerun the generated artifact unless the user explicitly changes source scope.
- **Repository edit gate:** no file under `repos/` may be created, modified, or deleted until the owning slice is in `speckit-implement` with an open ledger entry.
- **Existing-artifact gate:** pre-existing `spec.md`, `plan.md`, or `tasks.md` files are candidate inputs only. On resume, enter at the earliest incomplete or unreviewed phase; the matching Spec Kit phase must still be executed or explicitly revalidated and recorded before advancing.

Before delegating any phase, read:

- `references/quickstart.md` for the adapter's required Spec Kit phase sequence.
- `references/delegation.md` for handoff grammar, payload rules, and failure signatures.

Autopilot means advance through phases without user pauses after clean reviews. It never means skipping, merging, pre-authorizing, or implementing ahead of the required phase sequence.

## Phase ledger

Before starting any slice phase, write/update `.kit-state/methods/speckit/current-phase.json`:

```json
{
  "slice": "<slice-id>",
  "feature": "<NNN-slug>",
  "phase": "<speckit-phase>",
  "worker": "<worker-id-or-main-no-workers>",
  "inputs": ["specs/product-delivery-slices.md", "specs/NNN-slug/spec.md"],
  "status": "in_progress"
}
```

Set `status` to `complete` after you review the phase's output. This file is the
authority for the source-edit gate: `repos/` writes are permitted only while it
records `phase == "speckit-implement"`, `status == "in_progress"` for the owning slice.
No ledger entry means implementation must not proceed.

Only the orchestrator updates the ledger. Set `in_progress` before delegation or approved in-session execution, and set `complete` after review. Workers must never edit it. Constitution work does not open the `repos/` edit gate.

## Workflow

1. **Map the payload into delivery slices.** If `specs/product-delivery-slices.md` is missing, incomplete, stale, or outrun by a payload change, apply `kit-scope-mapping` skill to produce and validate it; don't start the phase loop without it. Treat it as stale when source artifacts under `ent-app-kit/`, UI context, architecture/API contracts, or user-approved scope changed after slicing, or when a source requirement cannot be traced to a slice. Each slice it returns is one Spec Kit feature. The slice ID uses `<slug>-sNNN`; derive the Spec Kit feature directory as `specs/NNN-<slug>/` when the Spec Kit phase skills require the numbered feature form. Too big to run as one feature? Send it back for a re-cut; don't split or merge slices yourself.

   For backend-bearing slices, apply `kit-backend-engineering` before implementation planning hardens. Planning must name the backend stack, concrete architecture map, runtime call paths, persistence/config/integration boundaries, and validation commands. A phrase like "production-shaped backend" is insufficient without packages/modules and call paths.

   For UI-bearing slices, four separate questions apply. *Is the direction settled?* — read `.kit-state/ui-context.md` and any `.kit-state/ui-concept-lab-decision.json`; the orchestrator's checkpoint owns that answer. *How is it supposed to look, and what does it owe?* — apply `kit-ui-design` for component-system fidelity, tokens, required states, accessibility expectations, responsive behavior, and interaction model. *How must the frontend repo be engineered and proven shippable?* — apply `kit-frontend-engineering` for build/test/lint/typecheck/browser/a11y execution, package scripts, env/API wiring, and production component-package usage. *Who makes the UI?* — the design engine, reached through `kit-ui-design`, owns craft routing. UI context may mature before slicing, after draft slicing, or per slice; the fixed gate is that source edits must not begin until the owning slice has sufficiently resolved product, UI design, frontend engineering, and backend engineering context.

2. **Create the project constitution.** Run `speckit-constitution`. Owned by you (orchestrator); do not delegate.

3. **Execute slices one at a time.**
   - You own slice sequencing, scope control, artifact review, cross-slice consistency, and final acceptance.
   - For each incomplete slice, use three worker contexts at natural boundaries to prove artifacts are self-sufficient and avoid context rot:
     - one persistent planning worker for `speckit-specify` -> `speckit-clarify` as needed -> `speckit-plan` -> `speckit-checklist` as needed -> `speckit-tasks` -> `speckit-analyze`;
     - one fresh worker for `speckit-implement`;
     - one fresh worker for `speckit-converge` and follow-ups.
   - If workers are unavailable and the user approves continuing in-session, execute the same phase sequence yourself, one phase at a time, with the same ledger gate and review checkpoint after every phase. Record `worker: "main-no-workers"` and do not treat in-session execution as permission to merge phases.
   - Delegate **one phase at a time**, worded per `references/delegation.md`. Send only the next phase command plus the context it needs by reference: current slice record, relevant source artifacts, prior Spec Kit artifacts, review feedback, and relevant App Kit skill names. Wait for the report, review it for scope, artifact fidelity, and validation quality, then send the next phase.
   - Never ask a worker to run multiple Spec Kit phases in one prompt. After each phase, review the output, update the ledger, and only then send the next phase.
   - In the `speckit-plan` step, always state the relevant tech stack explicitly, including the agentic framework to be leveraged when applicable.
   - **Reject a plan** whose Technical Context leaves the tech stack — or, for agentic products, the agent/LLM and MCP framework — unstated, hedged ("X-compatible"), or divergent from the App Kit source; send it back before advancing.
   - For backend-bearing changes, reject a plan whose implementation plan lacks the applicable backend engineering baseline from `kit-backend-engineering`: concrete architecture map, source tree/module plan, runtime call paths, persistence/config/integration/audit/error boundaries, repo-local build/test/lint/migration/seed commands, fake-client/error-path coverage, and production caller evidence.
   - Beyond the three boundaries above, spawn a replacement worker only when one is unavailable, stuck, or contaminated — record the reason.
   - Ask the worker to report: active feature directory, artifacts generated/updated, source files used, validation run, and assumptions/deviations. Never ask it to hand-write `spec.md`/`plan.md`/`tasks.md` as a substitute for invoking phase skills.
   - The orchestrator must not implement source changes for a delegated slice unless the user reassigns ownership or the worker is recorded as failed/stalled and replaced. A phase is complete only after the final report is reviewed, not because files exist.
   - Mark the slice complete in `product-delivery-slices.md` only after validation passes or deferrals are explicit.
   - Default execution is sequential. Run slices in parallel **only** with isolated workspaces (separate git worktrees), one slice per worktree, with distinct branch/worktree names recorded in the ledger and no shared writes to `.specify/feature.json`, `specs/`, source, dependency files, or validation outputs.

4. **Converge after all slices completed.** Perform final all-slice convergence against all original artifacts, including `product-delivery-slices.md` so decomposition gaps are caught too. Use a delegated `speckit-converge` pass or an equivalent orchestrator comparison. Identify missing, partial, conflicting, or untested requirements. Add remaining work as tasks and implement it, or document explicit deferrals with user approval. This is a verification pass, not a slice — no specify/plan/checklist ceremony around it.

**New scope mid-build:** when the user requests a feature not in the payload, don't hand-append a slice here — route it back through `kit-scope-mapping` so it passes the same coverage map and gates, then run it through the normal phase loop. Never skip, merge, or compress phases because the request seems small.

The same applies when UI concept exploration or screen clarification discovers new product scope. Update product slicing before affected future Spec Kit features implement.

## Scope Control

Throughout the slice loop: don't let later features leak into earlier ones except reusable baseline work needed now. Don't defer cross-cutting requirements (auditability, security, accessibility, lifecycle integrity) if the current feature depends on them. Keep mocked vs real integrations explicit in user-visible behavior and audit records. Establish a reusable boundary/convention/primitive in the earliest slice that needs it.

## Token Discipline

Aim for token efficiency and good context engineering. Cut everything in the slice loop that isn't a quality gate — duplicate verification, verbose reports, restated context, idle round-trips.

- **Workers test; the orchestrator doesn't re-test.** Don't re-run suites a worker already ran successfully.
- **Reports are schemas, not prose.** Short, pragmatic, templated.
- **Clean reports auto-advance.** After reviewing a clean report and updating the ledger, send the next phase without a separate user pause. Do not include the next phase in the previous worker prompt.
- **Keep generated artifacts lean.** Subagents should cap spec/checklist/task verbosity — every artifact is re-read by every later phase.

## Integration Gate

Reject any Spec Kit artifact that weakens a source-required integration.

For every source-required provider/SDK/MCP/API, tasks must include runtime implementation, fake-client invocation tests, response parsing tests, error-path tests, and fallback-equivalence tests. Config, imports, adapters, and status endpoints alone never satisfy integration scope.

## Delegation Reference

Use `references/delegation.md` for every delegated Spec Kit phase. It contains the shared handoff grammar, the required `Relevant skills:` line, and the phase payload rules for `speckit-specify`, `speckit-plan`, implementation, and convergence. The `product-delivery-slices.md` template remains in `kit-scope-mapping`, which owns scope mapping and slice decomposition.

## Completion Criteria

The full workflow is not complete until:
- every slice in `product-delivery-slices.md` has its own completed Spec Kit implementation, unless explicitly deferred by the user;
- validation commands pass or failures are documented with cause;
- the final convergence pass has checked the implementation against all source artifacts and `product-delivery-slices.md`;
- any remaining gaps are implemented or explicitly deferred by the user.

## Orchestrator Self-Check

Before reporting completion, verify:
- `product-delivery-slices.md` exists, is current with the source payload, and every non-deferred slice has a completed phase record.
- Any conflict among source artifacts was resolved by the user, and any generated artifact that diverged from source was rerun or updated.
- Every slice ran the required phase sequence from `references/quickstart.md`; any skipped optional phase has an explicit reason tied to lack of ambiguity or checklist need.
- No `repos/` edit occurred outside a `speckit-implement` ledger window for the owning slice.
- Plans name concrete tech stack, repo routing, validation commands, and required agent/LLM/MCP or provider SDKs when applicable.
- Tasks and tests prove runtime behavior for each source-required integration, not just configuration or imports.
- Final convergence checked original source artifacts and slice decomposition, and all gaps are implemented or user-deferred.
