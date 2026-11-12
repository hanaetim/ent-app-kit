---
name: kit-method-openspec
description: "Orchestrate Enterprise App Kit implementation through OpenSpec. Use only when `kit-orchestrator` or `.kit-state/state.yaml` selects `method: openspec`, or when the user explicitly asks this adapter to turn requirements, HLD/LLD, architecture docs, wireframes, API/data contracts, backlogs, screenshots, or informal App Kit artifacts into a working application by creating `product-delivery-slices.md`, running one tested core-simple OpenSpec workflow per vertical slice, delegating concrete OpenSpec operations one at a time to subagent workers when subagents are available, enforcing App Kit source fidelity and backend/UI/integration gates, and converging against the original artifacts."
---

# Kit Method Adapter: OpenSpec 2

Turn `ent-app-kit/` into working software using OpenSpec, one vertical slice per OpenSpec change. Preserve every App Kit source requirement unless the user explicitly approves a deviation.

## Authority

- This adapter owns orchestration: slice sequencing, ledger, delegation gates, artifact review, convergence, and acceptance.
- `references/workflow-simple.md` owns operation order. Read it before slice execution.
- `references/delegation.md` owns subagent-worker prompt shape. Read it before every subagent-worker prompt.
- OpenSpec operation skills own operation mechanics and path/artifact resolution.
- `openspec/config.yaml` owns standing context: repo routing, payload binding, design-source authority, integration fidelity, validation expectations, and per-artifact rules.

## Boundaries

- Use only the tested `core-simple` profile in `references/workflow-simple.md`.
- Do not use `expanded-controlled`, `simple-expanded`, `openspec-new-change`, `openspec-continue-change`, `openspec-ff-change`, or `openspec-verify-change`.
- When subagents are available, you MUST delegate OpenSpec operation skills one operation at a time to subagent workers; do not run an operation in-session merely because it is small or convenient. If no subagents are available, run the same operation boundaries in-session and record `worker: "main-no-subagents"`.
- App Kit source artifacts outrank generated OpenSpec artifacts. On conflicts between source artifacts, stop, name the conflicting files and requirements, and get user direction before choosing one. On conflicts between source and generated artifacts, update or rerun the generated artifact unless the user explicitly changes source scope.
- Source edits under `repos/` are allowed only during `phase == "apply"` with `status == "in_progress"` in the ledger.
- Existing OpenSpec artifacts are inputs, not shortcuts. On resume, enter at the earliest incomplete or unreviewed operation; review or update artifacts before apply, sync, or archive.

## Operation Surface

| Operation | Skill |
| --- | --- |
| Explore | `openspec-explore` |
| Propose | `openspec-propose` |
| Update | `openspec-update-change` |
| Apply | `openspec-apply-change` |
| Sync | `openspec-sync-specs` |
| Archive | `openspec-archive-change` |

Use equivalent installed OpenSpec skills if an agent exposes names differently; do not use chat aliases as the source of truth.

## Ledger

Before every operation, update `.kit-state/methods/openspec/current-phase.json`:

```json
{
  "slice": "<slice-id>",
  "change": "<change-name>",
  "profile": "core-simple",
  "phase": "propose",
  "worker": "<subagent-id-or-main-no-subagents>",
  "inputs": ["specs/product-delivery-slices.md"],
  "delegationOperation": "openspec-propose",
  "delegationPrompt": "openspec-propose <change-name> — <short intent>",
  "status": "in_progress"
}
```

Only the orchestrator edits this file. Set `status: "complete"` only after reviewing the subagent-worker output. Valid phases: `explore`, `propose`, `update`, `apply`, `sync`, `archive`.

## Required Setup

1. Confirm `specs/product-delivery-slices.md`; if missing, incomplete, stale, or outrun by a payload change, use `kit-scope-mapping`. Treat it as stale when source artifacts under `ent-app-kit/`, UI context, architecture/API contracts, or user-approved scope changed after slicing, or when a source requirement cannot be traced to a slice.
2. Resolve planning guidance before source edits:
   - backend-bearing slices: `kit-backend-engineering`
   - UI-bearing slices: `.kit-state/ui-context.md`, optional `.kit-state/ui-concept-lab-decision.json`, `kit-ui-design`, `kit-frontend-engineering`
   - startup/seeding/runnability: `kit-app-startup-seeding`
3. Confirm `openspec/` exists and OpenSpec skills are installed. If absent, stop and ask the user to rerun setup.
4. Populate and re-check `openspec/config.yaml` before the first delegation and on resume. Put standing obligations there, not in subagent-worker prompts. Do not delegate if required repo routing, payload binding, design-source authority, integration fidelity, validation expectations, or per-artifact rules are missing.

## Delegation Gate

Before spawning a subagent worker or sending the next operation to an existing planning subagent worker, read `references/delegation.md` and verify:

- exactly one OpenSpec operation;
- prompt starts with `<openspec-skill-name> <change-name>`;
- no propose -> apply -> archive chaining;
- no file tree, task list, artifact contents, validation checklist, payload paraphrase, report template, or absolute path;
- standing context is in `openspec/config.yaml`;
- every sentence passes the three-class test;
- extra App Kit guidance is only `Relevant skills: ...`.

If any item fails, rewrite the prompt before delegation.

## Slice Loop

For each incomplete slice:

1. Read `references/workflow-simple.md`.
2. Use one planning subagent worker for `explore`/`propose`/`update`, a fresh implementation subagent worker for each `apply`, and a fresh closeout subagent worker for `sync`/`archive`. Use in-session execution only when no subagent is available, and record that fallback in the ledger.
3. Before each operation, update the ledger and run the Delegation Gate.
4. Delegate the next operation exactly per `references/delegation.md`.
5. Review the subagent-worker report before advancing; files existing is not enough.
6. Mark the ledger complete after review passes.
7. If apply leaves incomplete tasks, failed validation, or source drift, keep the slice open and delegate the next needed `apply` or `update` operation. Do not sync or archive until the implementation and validation are acceptable.
8. Mark the slice complete only after validation passes or user-approved deferrals are explicit.
9. Run slices in parallel only with isolated workspaces. A shared worktree is unsafe because OpenSpec changes, specs, source, dependencies, and validation outputs can conflict.

Reject or replace a subagent worker that runs the wrong operation, chains operations, edits `repos/` outside apply, edits the ledger, invents review findings, or treats prompt text as source-of-truth over payload/config.

## Review Gates

Before apply, review artifacts against slice scope, payload sources, repo routing, `PRODUCT.md`, `DESIGN.md`, UI context, design-source authority, integration fidelity, and enterprise constraints.

Backend-bearing artifacts must include stack, module plan, runtime paths, persistence/config/integration/audit/error boundaries, repo-local commands, fake-client/error-path coverage, and production caller evidence.

UI-bearing artifacts must include UI context, screen artifacts, frontend conventions, visual verification criteria, component-package commitments or approved substitutions, validation commands, and frontend/backend API/env contract.

If review fails, delegate `openspec-update-change` with the finding. Do not apply until review passes.

## Scope, Integration, Convergence

- Do not let later features leak into earlier slices except reusable baseline work needed now.
- Route new scope through `kit-scope-mapping`, then `core-simple`.
- Reject artifacts that weaken source-required integrations. Required integrations need runtime implementation plus fake-client invocation, response parsing, error-path, and fallback-equivalence tests; config/import/status scaffolding is insufficient.
- After all slices complete, compare implementation, `openspec/specs/`, archived changes, `product-delivery-slices.md`, and original payload artifacts. Implement gaps or document user-approved deferrals.

Completion requires every non-deferred slice to have a completed OpenSpec change, required artifacts, completed tasks, passing or explained validation, synced/archived specs, and final convergence against the original payload.

## Orchestrator Self-Check

Before reporting completion, verify:
- `product-delivery-slices.md` exists, is current with the source payload, and every non-deferred slice has a completed OpenSpec change record.
- Any conflict among source artifacts was resolved by the user, and any generated artifact that diverged from source was updated or rerun.
- Every slice ran the required `core-simple` operation sequence from `references/workflow-simple.md`; any skipped optional `explore` has an explicit reason tied to lack of ambiguity.
- No `repos/` edit occurred outside an `apply` ledger window for the owning slice.
- Planning artifacts name concrete stack, repo routing, validation commands, and required agent/LLM/MCP or provider SDKs when applicable.
- Tasks and tests prove runtime behavior for each source-required integration, not just configuration or imports.
- Final convergence checked implementation, OpenSpec specs/archive, original source artifacts, and slice decomposition, and all gaps are implemented or user-deferred.
