---
name: kit-orchestrator
description: Entry point for Enterprise App Kit delivery orchestration. Use when asked to build, validate, implement, emit, test, deploy, resume, or troubleshoot an App Kit workflow from a workspace containing ent-app-kit/. Reads setup state, routes to the selected method adapter, and drives enterprise verification after the method returns.
---

# Enterprise App Kit Orchestrator

**Goal: translate every requirement and instruction present in `ent-app-kit/payload/` into a working application — faithfully and completely.** The orchestrator drives the method adapter and enterprise gates to get there; no provided spec is dropped, narrowed, or substituted without explicit user approval.

## Core Rules

- Treat `ent-app-kit/` as package input. Write solution artifacts to `repos/`, `out/`, and `.kit-state/`.
- Payload presence is binding scope. Everything under `ent-app-kit/payload/` — every requirement, screen, workflow, data state, interface, and acceptance criterion it contains — must reach the final application; deviation, substitution, or partial implementation requires explicit user approval. The absence of a domain never narrows scope for requirements named in content that is present.
- `.kit-state/state.yaml` `payload:` records the detected inventory: `domains` (recognized workstream inputs such as `design`, `air`, `deploy`) and `content` (everything else — source material for the method). A domain absent from the inventory has no inputs; do not invent them.
- The App Kit orchestrator owns enterprise workstreams: workspace state, repo routing, gates, conformance, and observability.
- Method adapters produce build intent; they do not own deployment or repo topology.
- UI-bearing work must not enter the selected method while its UI authority is unresolved and the user has not chosen to proceed on documented defaults. `kit-ui-context` reports available UI inputs, accepted visual direction, promoted precedents, and UI-relevant stack/component constraints; it does not own full screen inventory.
- A binding UI screen is a screen-level visual/layout artifact: promoted concept, wireframe, screenshot, mockup, Figma/exported frame, HTML screen comp, or equivalent source-marked screen design. Component libraries, stack choices, UI data contracts, named controls, and prose descriptions are binding UI inputs, not binding UI screens.
- **In `mode: autopilot`** (`.kit-state/state.yaml`), don't pause for sign-off on routine judgment calls (slicing, grouping, ordering) — stop only for a STOP condition the selected method adapter declares (e.g. imprecise spec, scope narrowing/deviation). UI concept and design-language decisions are declared exceptions: choosing visual direction is never a routine judgment call, so ask when the gate requires it.

## Application Delivery Routing Skills

- `kit-llm-wiki` generates the payload wiki used to keep downstream implementation grounded in source artifacts.
- `kit-ui-context` records what UI sources, component libraries, stack constraints, and promoted precedents exist.
- `kit-ui-concept-lab` creates disposable UI concepts and promotes accepted static artifacts.
- `kit-design-language` settles durable product/design language before method implementation, using Impeccable behind an adapter contract.
- `kit-ui-design` defines and reviews UI fidelity, visual quality, states, accessibility expectations, responsive behavior, and interaction fit.
- `kit-frontend-engineering` defines and reviews the frontend repo's implementation harness and deliverability proof.
- `kit-backend-engineering` defines and reviews backend architecture, runtime boundaries, persistence, integrations, configuration, and backend deliverability proof.
- `kit-app-startup-seeding` defines and reviews clean-checkout startup, repo-local commands, root full-app startup, environment preparation, migrations, seeding, local dependencies, and cross-platform operability.
- `kit-conformance` performs the method-independent final sweep and reports remaining gaps before completion.

## Orchestration Procedure

From the workspace that contains `ent-app-kit/`:

1. Read `.kit-state/state.yaml` for selected agent/method/mode, workspace paths, detected payload inventory, and repo topology. If it does not exist, block and ask the user to run `npx --yes --package ./ent-app-kit ent-app-kit setup` from the workspace root.
2. Apply `kit-llm-wiki` to generate an LLM Wiki from the payload. Prefer delegating this to a fresh subagent and wait for it before moving on; if subagents are unavailable, apply `kit-llm-wiki` in the main context, follow its App Kit profile outputs, and record any constrained-read gaps. Do not skip this step silently.
3. Apply `kit-ui-context` if user-facing UI is in scope or uncertain; it reports available UI truth for the concept gate and decides nothing. Do not pre-read `kit-backend-engineering`, `kit-ui-design`, or `kit-frontend-engineering` here; method adapters and review gates need to apply them when a relevant slice needs them.
4. Resolve the UI Concept Gate before method implementation.
   - The gate applies only when the implementation includes user-facing UI, no binding UI screens already define the in-scope surfaces precisely, and `.kit-state/ui-concept-lab-decision.json` has no current promotion or explicit opt-out for those surfaces.
   - If the gate does not apply, record the reason in `.kit-state/ui-concept-lab-decision.json` and continue to step 5.
   - If the gate applies, ask the user whether to use UI Concept Lab for pre-implementation screen concepts, flows, layouts, and interaction direction. Do not invoke it automatically.
   - If the user accepts, read and execute `kit-ui-concept-lab` and wait until accepted screen artifacts are promoted.
   - If the user declines, record an explicit opt-out in `.kit-state/ui-concept-lab-decision.json`.
   - Continue to step 5 only after a promotion, explicit opt-out, or non-applicable decision is recorded.
   - This checkpoint is always interactive, even in `mode: autopilot`. Declining or skipping UI Concept Lab is only a shortcut past exploration; it is never approval for weak, minimal, generic, or scaffold-like UI.
5. Apply `kit-design-language` for every user-facing application before method implementation. This step is mandatory whether UI Concept Lab was accepted, declined, or skipped because binding UI screens already exist. The orchestrator must depend only on the adapter outputs, not on Impeccable's internal workflow.
6. Delegate application delivery to the selected method adapter skill from setup state:
   - `speckit` -> read `kit-method-speckit`
   - `openspec` -> read `kit-method-openspec`
7. Execute the specified method precisely. The selected method owns implementation mechanics. The orchestrator enforces package boundaries and enterprise verification after the method returns.
   - As part of the method's final convergence pass, every pitfall disposition recorded in `product-delivery-slices.md` (`### Pitfall applicability`) must be verified: execute each applicable entry's `Check:` recipe and capture its evidence — never accept a prior report's word; independently reproduce any "flake/pre-existing/unrelated" claim; skim the N/A lines for reasons the built system now contradicts.
8. Run `kit-conformance` as an independent final sweep, preferably in a fresh subagent. It produces a report only. Review the report, then fix `must-fix` findings, ask the user about `needs-user-decision` findings, and record any approved deferrals before declaring completion.

## Resuming A Run

Reconstruct position from state; never restart. Read `state.yaml`, then the method's progress records (`speckit`: `.kit-state/methods/speckit/current-phase.json`; `openspec`: `.kit-state/methods/openspec/current-phase.json`; plus `specs/product-delivery-slices.md`). Re-enter the adapter at the recorded slice/phase, verifying that phase's outputs before advancing. If all method slices are complete, verify prerequisite gate outputs from steps 2-5 still exist and cover the current payload, then resume at the earliest incomplete post-method gate, starting with step 8. Never re-run completed gates or phases unless outputs are missing, stale, or fail review, and never skip past the recorded position.

## Context Management And Subagents

Keep the main agent on coordination: state, routing, gates, review. Follow the selected adapter's delegation rules exactly; invent no extra subagent structure. Never delegate orchestrator-owned duties: state files, the phase ledger, gate decisions, and final acceptance.

**Delegate by reference, not by paraphrase.** A worker prompt names the operation, the unit of work, and where the scope is written — it does not restate what a payload artifact already says. Restating makes the paraphrase the operative spec and quietly demotes the artifact to a citation the worker never has to read: a requirement the orchestrator failed to enumerate then reaches no spec, no task, and no implementation.

When delegating to subagents, name the relevant skills in the handoff. Do not assume workers will discover applicable skills on their own; cite skill names, not pasted or paraphrased instructions.
