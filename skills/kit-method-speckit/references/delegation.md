# Spec Kit Delegation Shape

```text
<speckit-phase> <feature-id> -- <short intent>
Relevant skills: <skill names only>.
```

Use the installed Spec Kit phase skill or slash-command equivalent for
`speckit-phase`. The worker resolves the phase skill. The orchestrator owns
slice sequencing, ledger updates, artifact review, and advancement.

Delegate one phase at a time. Keep the intent at slice altitude: name the
capability and point to the slice record, source artifacts, and prior Spec Kit
artifacts by reference. Source artifacts remain authoritative. Do not include
the next phase command in the current delegation prompt.

Add `Relevant skills:` whenever App Kit guidance must affect the phase. Name
skills only; keep their instructions in the referenced skills. Common examples:
`kit-backend-engineering`, `kit-ui-design`, `kit-frontend-engineering`,
`kit-app-startup-seeding`, `kit-pitfall-registry`.

```text
speckit-specify 002-human-review-workbench -- create the Human Review Workbench
feature from specs/product-delivery-slices.md and the referenced UI artifacts
Relevant skills: kit-ui-design, kit-frontend-engineering.

speckit-plan 002-human-review-workbench -- plan the approved feature spec using
the source architecture, repo routing, and validation constraints
Relevant skills: kit-ui-design, kit-frontend-engineering, kit-backend-engineering.

speckit-tasks 002-human-review-workbench
speckit-analyze 002-human-review-workbench
speckit-implement 002-human-review-workbench
speckit-converge 002-human-review-workbench
```

## Required Worker Report

Require this short report from every phase:

```text
Phase:
Feature directory:
Artifacts changed:
Source artifacts consulted:
Validation run:
Assumptions:
Deviations or blockers:
Next recommended phase:
```

The orchestrator reviews this report before marking the ledger complete. A
clean `Next recommended phase` is advisory only; it does not authorize the
worker to run the next phase.

## Phase Payloads

### `speckit-specify`

Pass product truth: what to build, why it matters, users, workflows, surfaces,
states, roles, acceptance, product-observable constraints, and observable
agentic capabilities. If a technical source artifact matters here, translate it
into observable behavior or acceptance. Keep languages, frameworks, SDKs,
schemas, repo paths, API shapes, and implementation planning for
`speckit-plan`.

Use this shape when detail is needed:

```text
Business outcome: <stakeholder value>
Source requirements: <source artifact references>
Scope: <included behavior>
Out of scope: <deferred behavior, with source or user approval>
Acceptance: <observable success criteria>
Artifact fidelity constraints: <observable UI/workflow/state/trust/audit obligations>
Agentic fidelity constraints: <observable tool use, handoffs, traces, or validation>
Technical-source translation: <observable requirements derived from technical sources>
```

### `speckit-clarify`

Use when ambiguity remains after `speckit-specify`, or when orchestrator review
identifies a specific missing decision. Provide the focus area and source
references. Keep this phase product-observable.

### `speckit-plan`

Pass technical truth: source-defined architecture, stack, integrations, data,
security, NFRs, design-system constraints, existing-code constraints, repo
routing, and validation. Use source values where present and established
defaults where the source names only a category. Name concrete choices for
language/version, framework, package manager, storage, UI library, integration
SDKs, and agent/LLM/MCP framework when applicable.

Use this shape when detail is needed:

```text
Spec: <feature spec.md path>
Source authority: <relevant App Kit artifacts and precedence notes>
Technical Context: <concrete choices for every required layer>
Implementation constraints: <architecture/data/API/security/observability/a11y/NFR/design/integration/test constraints>
Repository routing: <declared repos and paths>
Conflict rule: App Kit source artifacts outrank generated Spec Kit artifacts. Stop on conflict.
Validation: <required build, test, conformance, integration, accessibility, audit, and agentic checks>
Integration checklist:
- Does every source-required integration have executable runtime behavior?
- Do tests prove provider/client invocation and response parsing into domain contracts?
- Are mocks and fallbacks alternate adapters, not replacements for the real path?
```

### `speckit-checklist`, `speckit-tasks`, `speckit-analyze`

Pass the phase command, feature ID, relevant prior artifacts, and review
feedback. The phase skill owns artifact shape. Use `Relevant skills:` when the
phase must preserve backend, frontend, UI, startup, integration, or pitfall
obligations. For `speckit-analyze`, require a clean cross-artifact consistency
result or explicit follow-up before implementation opens.

### `speckit-implement`

Pass tasks, plan, spec, constitution summary, active feature directory, and
validation expectations by reference. This is the phase that writes `repos/`,
under the orchestrator-owned ledger gate for the owning slice. Include
`Relevant skills:` for every implementation domain the slice touches. The
worker must report commands run and changed files.

### `speckit-converge`

Pass the feature spec, plan, tasks, implementation diff or changed-file list,
source artifacts, `product-delivery-slices.md`, and cross-cutting invariants by
reference. If convergence appends tasks, run `speckit-implement` again and then
repeat `speckit-converge` until the feature converges or a user-approved
deferral is recorded.

## Three-Class Test

Classify each sentence before including it. Only class 3 belongs in a
delegation.

1. Tool owns it -- leave it to Spec Kit phase skills. Phase command mechanics,
   generated artifact schemas, task mark-off loops, and report format live in
   the phase skills.
2. Project owns it -- keep it in constitution, source artifacts, or standing App
   Kit context. Repo routing, payload-is-binding rules, integration fidelity,
   validation policy, and design-source authority should stay stable by phase.
3. This slice, this phase -- keep it. Feature ID, current phase, one-line
   intent, source/artifact references, review feedback, and relevant skill
   names.

## Failure Signatures

- Delegation restates detailed source requirements instead of pointing to source
  artifacts.
- `speckit-specify` includes stack, repo paths, schemas, SDKs, or API shape.
- `speckit-plan` leaves stack, agent/LLM framework, MCP framework, or integration
  SDKs implicit when the slice depends on them.
- UI or frontend work omits `kit-ui-design` or `kit-frontend-engineering` from
  `Relevant skills:`.
- Backend or integration work omits `kit-backend-engineering` from `Relevant
  skills:`.
- Implementation starts before `speckit-analyze` has passed and the ledger has
  opened the implement phase.
- The same phase delegation differs materially across slices because standing
  obligations were pasted into prompts instead of kept in shared context.
- A worker report lacks validation, source artifacts consulted, or deviations.
