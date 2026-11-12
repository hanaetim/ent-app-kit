---
name: kit-scope-mapping
description: Map an Enterprise App Kit payload into ordered, traceable, method-executable delivery slices, producing specs/product-delivery-slices.md as a compact spec seed and ownership ledger. Use this BEFORE running any method workflow (Spec Kit, OpenSpec, BMAD) whenever a build starts, resumes without a scope map, has a stale/incomplete slice map, has coverage gaps, or gains new scope; BMAD stops until its sizing reference exists. Defines delivery-slice classes, greenfield runway scope, requirement ownership, PM-ID coverage accountability, decomposition decisions, assumptions/deferrals, pitfall placement, method sizing, structural validation, and naming-leak gates. It does not create product scope, design system architecture, or the detailed implementation plan.
---

# Kit Scope Mapping

Turn an Enterprise App Kit payload into `specs/product-delivery-slices.md`: an ordered set of **delivery slices** with a coverage map proving every payload obligation is owned by exactly one slice. This is the single most consequential decision in the build; every downstream phase inherits the cut.

This skill is **method-agnostic**: slice definition, coverage, ordering, and gates are shared across methods. Only slice sizing varies by method; load exactly one `references/sizing-<method>.md` file after reading `.kit-state/state.yaml`.

UI context discovery may move alongside slicing. Do not require all UI artifacts before writing the slices doc, and do not freeze slices against later UI discoveries. If new UI/product scope appears later, update the slices doc before affected future slices implement.

## The Artifact

`product-delivery-slices.md` is a compact decomposition ledger, spec seed, and ownership map. It routes source-artifact obligations into future method artifacts and preserves enough intent, boundaries, constraints, and evidence direction for Spec Kit, OpenSpec, BMAD, or another method to generate coherent work. It is not a downstream spec, plan, task list, or implementation design.

The layers are: source artifacts -> slices doc -> each slice's method artifact (`spec.md`, OpenSpec change, etc.) -> implementation plan/tasks/code.

Altitude rules:

1. **Scope belongs here.** State what each slice owns, why it matters, which sources constrain it, and what evidence should prove it.
2. **Requirements stay with sources and downstream specs.** Reference binding artifacts; do not restate them as a parallel requirements source.
3. **Implementation stays downstream.** If someone can implement straight from a slice entry, it has drifted into a spec or plan and must be raised or trimmed.

## Core Concepts

**Delivery slice.** A bounded, method-executable, evidence-producing delivery unit suitable for one downstream method run. A slice must have clear ownership, dependencies, method framing, acceptance evidence, and at least one Product / Boundary Model item accountable to it.

**Closed class rule.** `Experience / Capability` is the default class. If a candidate is not a valid instance of one of the named non-capability classes below, it is a capability slice and verticality applies. There is no `other` class.

**Non-slices outrank the superclass.** Frontend setup, backend setup, database schema, API scaffolding, framework wiring, package installation, raw readiness page, seed/admin/debug screen, final verification pass, generic scaffold, isolated model/entity creation, and tests-only work with no protected capability remain invalid regardless of how much evidence they produce, unless a named slice class below explicitly makes the unit independently valuable.

**Slice ID.** Use a method-safe, suffix-numbered identifier: `<slug>-sNNN`, for example `invoice-intake-runtime-s001`, `case-review-s002`, `audit-export-s010`. Document order remains the ordering authority; the suffix preserves traceability without forcing IDs to start with digits.

**PM-ID lifecycle.** Never renumber, reuse, or silently change a Product / Boundary Model ID once downstream work may reference it. If an item is removed, mark it deferred/superseded with a reason. If its meaning changes materially, create a new ID and record the relationship.

**Agentic capabilities are product capabilities.** Source-defined agents, MCP tools, tool-calling, handoffs, runtime state, and audit traces are product capabilities. Slices must make them explicit and verifiable; do not hide a source-defined agent as an ordinary service or reduce an MCP tool to a private adapter.

## Slice Classes

Classify every slice. Use the class to decide whether the unit is valid; do not use it to justify horizontal technical work. `Class validity evidence` must name the gate the slice would otherwise appear to violate and why the selected class makes it valid.

**Experience / Capability Slice.** Default class. A vertical user-, player-, operator-, agent-, or stakeholder-visible outcome such as invoice review, onboarding, report export, matchmaking, player combat loop, decision dashboard, or agent-assisted triage. It must produce observable behavior and executable evidence across every layer it needs. Games remain capability slices and are sized by playable loop, mechanic, progression, input/feedback, or win/fail increments, not by engine/assets/UI layers.

**Enterprise Walking Skeleton / Runway Enabler.** Greenfield or major replatforming only. Proves the thinnest end-to-end path through the real runtime shape before feature expansion while setting project structure, naming, boundaries, command capabilities, validation, documentation, and runtime honesty. It is thin in feature breadth, not engineering quality. It must not absorb the full primary workflow, full terminal-state matrix, or later UI-bearing capability.

**Integration Slice.** Adds or changes executable behavior across an external API, bounded context, SDK/provider, MCP/tool server, payment/storage/queue/event system, game platform service, telemetry pipeline, or similar boundary. It must execute the runtime path, map responses into domain contracts, handle error paths, and include contract evidence. Schema/config/import/status scaffolding alone is not enough.

**Operations / Control Slice.** Provides a real workflow for people or systems that control, monitor, moderate, audit, replay, deploy, or recover the product. Valid examples include audit review, queue replay, incident console, policy approval, feature-flag administration, game moderation, and replay diagnostics. It is valid only when the payload defines an operator/system need or acceptance criterion.

**Quality / Compliance / Remediation Slice.** Security, accessibility, performance, compliance, conformance, correctness, or hardening work. Prefer attaching it to the capability it protects. Standalone form is valid only when it names the protected risk/capability and has measurable evidence too broad or risky for a single capability slice.

**Migration / Modernization Slice.** Brownfield or replatforming work that preserves, wraps, replaces, parity-tests, shadows, or retires named existing behavior. Valid forms include characterization, contract wrapper, replacement/parity, shadow-run, data migration, and retirement slices. It must name the preserved/replaced behavior or boundary and the characterization, contract, parity, or retirement evidence.

**Exploration / Spike.** Time-boxed uncertainty reduction. It is a delivery slice only when the downstream method can produce durable artifacts such as characterization tests, decision records, contract drafts, prototypes, revised slice maps, or approved follow-up slices. Otherwise it is pre-slice discovery, not product implementation scope.

## Decomposition Rules

- **Cover, then cut.** Every Product / Boundary Model item has exactly one accountable owning slice. Cross-cutting obligations list enforcement touchpoints, but accountability still lands on one slice.
- **Default capability sizing.** Default to one capability slice per primary outcome/workflow. Split only when a method sizing trigger fires.
- **Non-capability sizing.** Non-capability slices size by one evidence-producing outcome: one contract boundary, one migration/parity unit, one quality risk, one discovery decision, one report/metric contract, or one runway proof.
- **Single-slice fast path.** Valid only when the payload has one outcome/persona/player task, no unresolved load-bearing gaps, no agentic scope, no migration scope, and no external integration complexity. Coverage map and acceptance evidence remain required. For valid greenfield fast-path work, startup/seed/health/runway obligations fold into the single capability slice; the runway-overreach gate does not apply because there is no separate runway slice.
- **No backend-first/UI-later cut.** Reject any map where an earlier runtime/backend slice owns the business workflow and a later slice mostly adds UI over that behavior.

Case calibration:

| Case | Valid slice unit | Invalid split |
|---|---|---|
| Game | Playable loop, mechanic, progression, input/feedback, or win/fail increment | engine setup, asset folder, UI-only screen |
| Modernization | characterization, contract wrapper, replacement/parity, shadow-run, retirement | broad rewrite, backend modernization layer |
| Data/reporting | decision/report pack, metric contract, data freshness/lineage, export outcome | chart, query, table, whole dashboard by default |
| Integration/platform | executable boundary with real consumer path or contract harness | SDK install, schema/config/status scaffold |
| Tiny app | single fast-path capability with coverage and evidence | artificial runway/setup slice |

For greenfield or major replatforming work, the first slice may be a runway enabler when later slices need one. Where every repo in `.kit-state/state.yaml` is `source: brownfield`, a standalone runway slice does not apply; the running app is the baseline.

Naming rule: delivery terminology must not leak into app-owned names. Do not expose "Foundation", "Bootstrap", "Setup", "Scaffold", "Readiness Center", "Seed Console", or similar delivery/runway wording as a route, tab, page title, primary UI area, service label, API resource name, environment variable, config key, test name, or domain type unless the source defines that term as a real domain workflow or operator task.

## Workflow

### 1. Discover and triage the payload

List every payload artifact and classify it:

- **Binding contract** - exact, checkable obligations: agent I/O, MCP schemas, business rules with values, data models, UI contracts, design tokens, acceptance gates.
- **Informative source** - HLDs, decks, wireframes, backlogs, prose requirements. These feed the Product / Boundary Model; gaps become assumptions or questions, not silent invention.

**Triage gate.** Surface load-bearing underspecification centrally before slicing. Examples: vague agent contracts, missing business thresholds, unstated workflow end states, unclear UI authority. Record assumptions, open questions, approved deferrals, and deviations in `## Assumptions, Deferrals, And Pitfalls`.

### 2. Extract the Product / Boundary Model

Identify only the drivers needed to decide delivery boundaries: goals, personas/actors, workflows/outcomes, entities, lifecycle states, integrations, contracts, UI actions, game loops, migration parity, data/reporting obligations, quality risks, artifact fidelity, NFRs, agent/MCP/tool capabilities, runtime state, trace/audit obligations, and done scenarios.

Assign each coverable item a stable `PM-*` ID in the template table (`PM-WF-001`, `PM-ENT-001`, `PM-LC-001`, `PM-INT-001`, `PM-UI-001`, `PM-DES-001`, `PM-AG-001`, `PM-STATE-001`, `PM-FID-001`, `PM-CON-001`, `PM-NFR-001`, `PM-DONE-001`, extending the prefix set only when needed). Preserve source references in each Product / Boundary Model row.

If an existing slices doc uses prose-keyed coverage rows, re-run this extraction from the original payload to derive stable `PM-*` IDs, then remap existing slices to those IDs. Do not simply assign IDs to old prose rows without re-validating coverage against the payload.

### 3. Handle source identifiers

Always record a source-identifier decision. If opaque source identifiers affect code names, routes, tests, environment variables, config keys, UI copy, audit, traces, docs, or conformance, create or update `specs/source-identifier-map.md` for high-risk or reused identifiers, or inline a small map in the slices doc. Otherwise record `not-needed` with a reason.

Classifications: `external-contract`, `source-traceability`, `domain`, `regulatory-legal`.

### 4. Classify the pitfall registry

Read `kit-pitfall-registry` and its canonical `references/pitfall-registry.md`. If unavailable, stop and ask for the registry source.

Classify every registry entry against the Product / Boundary Model. Record the compact table in `## Assumptions, Deferrals, And Pitfalls`:

`PIT ID | Applicable | Placement type | Placement target | Reason if N/A`

For applicable entries, place the `(PIT-0XX)` marker in the named coverage row, slice acceptance check, or final convergence instruction. Declaring a placement without the marker is the same failure class as an unmapped Product Model item. Keep N/A reasons terse; tiny apps still need disposition, but not prose.

### 5. Load method sizing

From the workspace root, read `.kit-state/state.yaml`. Use `selected.method`; if missing, fall back to `method.engine`. Stop if both are missing or conflict. Then load exactly one sizing reference:

- `speckit` -> `references/sizing-speckit.md`
- `openspec` -> `references/sizing-openspec.md`
- `bmad` -> stop: no BMAD sizing reference file (`sizing-bmad.md`) is bundled yet

Record the method and sizing file in `Decomposition Decision` -> `Sizing basis`.

### 6. Decompose into slices

Apply the closed class list and sizing reference. Write `## Decomposition Decision` before slice entries: `Delivery pattern`, `Why this pattern`, `Invalid split risks`, `Sizing basis`, and `Ordering rationale`.

Fold lifecycle, entities, data, startup/seed/health, and integrations into the valid runway or the first slice that needs them unless they are independently valid under a named non-capability class. Final convergence/verification is not a slice.

For each slice, write spec-seed fields only. `Method framing` states how the selected method should express the slice, especially when the "user" is a maintainer/operator/system or when no UI-facing workflow exists.

### 7. Fill coverage and validate

Complete `## Coverage Map`: one stable Product Model ID per accountable row, with enforcement touchpoints for cross-cutting items. Prose-keyed coverage rows do not pass.

From this skill's directory, run the validator:

```bash
python scripts/validate_slices.py specs/product-delivery-slices.md
```

If the script fails to execute, report the actual error and complete the manual `## Gate Record`. A green validator run proves only structural checks; it does **not** prove semantic gates such as layer splits, runway overreach, backend-first/UI-later cuts, altitude drift, or implementation mechanics leakage.

## Anti-Padding Rules

- State each requirement once, at its natural altitude.
- Do not restate contract facts in the slice doc; reference binding sources.
- Do not create sections or boundary-driver sketches that do not affect decomposition.
- Keep slice entries short enough that they cannot be implemented from directly.
- Concrete files, commands, ports, package scripts, classes, module paths, process managers, and orchestration tools belong downstream unless source-mandated.

## Do-Not-Proceed Gates

Do not finalize `product-delivery-slices.md` if any hold:

- A Product Model ID is absent from the Coverage Map, appears more than once as an accountable row, or a slice has no accountable Product Model ID.
- A slice is a technical layer rather than a valid named delivery slice class.
- A non-capability slice lacks class validity evidence naming the gate it would otherwise violate.
- A candidate relies on an unnamed class or `other` class.
- A runway slice owns the full primary workflow, full terminal-state matrix, or business behavior that leaves a later slice mostly UI.
- A later slice mostly adds UI over workflow behavior already owned by an earlier backend/runtime slice.
- A slice is too big for one method run by the active method's sizing triggers, with no split trigger named.
- Source-defined agents are hidden as ordinary services, MCP tools are reduced to private adapters, or fixtures bypass the tool/provider boundary.
- Autonomous behavior is accepted only by final state, without proving tool call, branch, handoff, or trace evidence.
- All-brownfield work includes a standalone runway slice.
- Delivery terminology leaks into app-owned product surfaces, API resources, services, environment variables, config keys, domain types, tests, or navigation without source authorization.
- A slice restates requirements a payload contract already owns instead of referencing it.
- A slice names concrete implementation mechanics in outcome, owned behavior, constraints, or acceptance checks without binding source authority.
- UI-bearing scope implements while load-bearing source-authority questions remain unresolved or undeferred.
- UI surfaces are justified by artifact concepts rather than user/operator/player workflow or meaningful state.
- Opaque source identifiers affect implementation or presentation, but no source identifier decision exists.
- A slice omits `Relevant skills` or names skills that do not materially apply.
- A pitfall entry has no disposition, an applicable entry has no placement target, or the named target lacks the `(PIT-0XX)` marker.

If a gate cannot be satisfied without narrowing payload scope, stop and get explicit user approval. Record the approval in `Assumptions, Deferrals, And Pitfalls`.

## Gate Record

The generated artifact keeps a compact `## Gate Record`. Before finalizing, record:

- `[x] Validator run result or exact execution error recorded: ...`
- `[x] Every payload artifact is inventoried and tiered: ...`
- `[x] Every Product / Boundary Model ID appears exactly once as an accountable Coverage Map row: ...`
- `[x] Every slice owns at least one Product Model ID: ...`
- `[x] Source Identifier Translation records not-needed, inline-map, or external-map: ...`
- `[x] Every applicable PIT placement target contains its `(PIT-0XX)` marker: ...`
- `[x] Semantic gates were reviewed separately from validator output: ...`
- `[x] No do-not-proceed gate remains open: ...`

Unchecked or placeholder Gate Record rows fail structural validation.

## New Scope After The Doc Exists

A request not in the payload is new traceable scope. Re-run this skill so it passes the same coverage and gates, recorded as a new slice or explicit addition to an active slice. Do not hand-append entries that skip the gates.

Execution state lives in the selected method artifacts, not in `product-delivery-slices.md`. New scope is distinguished by source references, assumptions/deferrals, and new or updated slice IDs.

The same rule applies to product scope discovered during UI concept exploration or screen clarification. If UI work reveals a real product surface, workflow, role, navigation branch, state, or acceptance obligation that the slices doc does not own, update the slices doc before future implementation proceeds.

## References

Paths are relative to this skill's directory.

- `references/product-delivery-slices-template.md` - output structure. Load when writing the doc.
- `references/sizing-<method>.md` - per-method granularity and split/merge triggers. Load only the active method file after reading `.kit-state/state.yaml`.
- `scripts/validate_slices.py` - structural validator for generated slice docs. Run after writing or updating the doc.
- `kit-pitfall-registry` and its `references/pitfall-registry.md` - mandatory external registry for pitfall disposition.
