# Product Delivery Slices Template

Use this template to create or update `specs/product-delivery-slices.md`. Fill each field at **spec-seed altitude**: route source obligations to delivery slices, preserve boundary/intent/evidence direction, and avoid implementation choices. Keep entries compact; if an entry is detailed enough to implement from, it has drifted into a spec or plan.

```markdown
# Product Delivery Slices

## Source Artifact Inventory
| Artifact | Tier | Binding role | Used by slices |
|---|---|---|---|
| [path/name] | [BINDING|INFORMATIVE] | [exact obligation or informative role] | [declared slice-id(s)] |

## Product / Boundary Model
<!-- Stable PM-* IDs are the source of truth for coverage. Include only boundary drivers that affect decomposition: workflows, contracts, UI actions, game loops, migration parity, report/metric contracts, quality risks, agent/tool capabilities, states, and done scenarios. Never renumber or reuse IDs after downstream work may reference them. -->
| Product Model ID | Type | Item | Source refs | Boundary driver? |
|---|---|---|---|---|
| PM-[CAT]-001 | [workflow|entity|state|integration|ui|design|agent|fidelity|constraint|nfr|done|migration|report|quality] | [concise item] | [artifact refs] | [yes/no - why if yes] |

## Source Identifier Translation
<!-- Always record the decision. Use `not-needed`, an inline small map, or an external map path when IDs affect code, UI, config, audit, traces, docs, or conformance. -->
- Decision: [not-needed|inline-map|external-map]
- Reason or path: [reason if not-needed, or `specs/source-identifier-map.md` if external-map]

<!-- Optional inline map for small cases only. -->
| Source ID | Meaning | Classification | Implementation/config naming | UI guidance | Raw ID remains in |
|---|---|---|---|---|---|
| [ID] | [meaning] | [external-contract|source-traceability|domain|regulatory-legal] | [guidance] | [guidance] | [boundary/audit/docs/none] |

## Decomposition Decision
- Delivery pattern: [capability-led | runway+capability | migration/strangler | contract/integration-led | discovery-first | data/reporting-led | quality/remediation-led | single-slice fast path]
- Why this pattern:
- Invalid split risks: <!-- e.g. backend runtime first + UI later; screen slicing; engine/assets/UI layers; broad modernization layer -->
- Sizing basis: <!-- method and sizing file, e.g. "Spec Kit; references/sizing-speckit.md" -->
- Ordering rationale:

## Assumptions, Deferrals, And Pitfalls
### Assumptions / Open Questions / Deferrals
| Item | Type | Decision | Source / approval | Affected slice |
|---|---|---|---|---|
| [gap or deferral] | [assumption|open question|deferral|deviation] | [decision or OPEN] | [source or approval] | [slice-id/TBD] |

### Pitfall Placement Ledger
<!-- One row per pitfall registry entry. The validator derives marker presence; do not self-report it. Applicable rows must name a placement target that contains the `(PIT-0XX)` marker. -->
| PIT ID | Applicable | Placement type | Placement target | Reason if N/A |
|---|---|---|---|---|
| PIT-0XX | [yes|no] | [coverage|slice-acceptance|final-convergence|none] | [PM ID / slice-id / final-convergence / —] | [short reason if no] |

## Coverage Map
<!-- Every Product Model ID appears exactly once as an accountable row. Use PM IDs only; prose-keyed coverage rows fail validation. Cross-cutting items list enforcement touchpoints separately. -->
| Product Model ID | Accountable slice | Enforcement touchpoints | Evidence expectation |
|---|---|---|---|
| PM-[CAT]-001 | [slice-id] | [slice-id, slice-id or —] | [product/contract/browser/audit/conformance evidence] |

## Delivery Slices
<!-- Keep slice fields as single-line `- Field: value` entries so the structural validator can parse them. Use semicolons for multiple acceptance checks instead of nested bullets. -->
### [feature-slug-sNNN] — [Feature Name]
- Slice class: [Experience / Capability | Enterprise Walking Skeleton / Runway Enabler | Integration | Operations / Control | Quality / Compliance / Remediation | Migration / Modernization | Exploration / Spike]
- Class validity evidence: <!-- Name the gate this could otherwise violate and why this class makes it independently valid. Capability slices can say "default capability; vertical outcome across needed layers." -->
- Method framing: <!-- How the selected method should express this slice, especially for maintainer/operator/system-facing or non-UI work. Example: "Spec Kit feature focused on executable provider contract, not a user-facing workflow." -->
- Business outcome: <!-- 2-4 sentences: stakeholder/downstream value, capability or risk retired, independent testability, and what becomes true. No implementation mechanics unless source-mandated. -->
- Included behavior: <!-- Owned capabilities and observable responsibilities. Name workflow boundaries, state changes, integration obligations, command capabilities, and evidence direction; avoid files/commands/classes/ports unless source-mandated. -->
- Out of scope:
- Source references: <!-- payload artifacts and tiers this slice owns -->
- Constraints and fidelity notes: <!-- artifact fidelity, agentic/tool proof, naming, structural quality, source-mandated stack constraints; include only relevant labels -->
- Relevant skills: <!-- current-runtime skill names only -->
- Dependencies: <!-- earlier slices; "none" for the first -->
- Target method artifact: <!-- method-specific target, e.g. Spec Kit feature directory or OpenSpec change -->
- Split/merge trigger: <!-- trigger from active sizing file, or "none" -->
- Acceptance checks: <!-- 3-5 product-observable or contract-observable checks in one line, separated by semicolons. Include PIT markers where placed. Avoid validation command strings unless source-mandated. -->

## Gate Record
- [x] Validator run result or exact execution error recorded: [ok output or execution error]
- [x] Every payload artifact is inventoried and tiered: [artifact count and tiers]
- [x] Every Product / Boundary Model ID appears exactly once as an accountable Coverage Map row: [PM count]
- [x] Every slice owns at least one Product Model ID: [slice IDs]
- [x] Source Identifier Translation records not-needed, inline-map, or external-map: [selected mode]
- [x] Every applicable PIT placement target contains its `(PIT-0XX)` marker: [applicable PIT IDs or none]
- [x] Semantic gates were reviewed separately from validator output: [review note]
- [x] No do-not-proceed gate remains open: [none open or exact resolution]

## Final Convergence (not a slice)
<!-- After all slices are implemented and validated, run the method's converge/verification pass against every source artifact and this file. This is verification, not a slice. -->
- Convergence/verification pitfall instructions: <!-- Required when any PIT disposition is placed here; otherwise "none beyond selected method verification". -->
```

## Worked Example

Good spec-seed slice entry:

```markdown
### invoice-intake-runtime-s001 — Invoice Intake Runway
- Slice class: Enterprise Walking Skeleton / Runway Enabler
- Class validity evidence: This would otherwise look like setup work, but it is valid because it proves startup, seed, persistence, audit, one provider boundary, a UI/API shell, and one thin invoice-domain path; it does not own matching, review, or payment decisions.
- Method framing: Spec Kit feature that establishes executable runtime conventions and one domain path for later invoice workflow slices.
- Business outcome: Maintainers and downstream slices can rely on a clean runnable invoice app shape with real seed data, persistence, audit, and one provider call. Completion retires runtime uncertainty without implementing the full invoice workflow.
- Included behavior: Clean app startup capability, idempotent seed through the real write path, one invoice intake path, audit trace, provider boundary smoke path, and shell surface needed by the next named slice.
- Out of scope: Invoice matching, exception review, payment approval, and final dashboard fidelity.
- Source references: implementation-brief.md [BINDING], integration-decisions.md [BINDING]
- Constraints and fidelity notes: Agentic/tool proof: one provider call must be observable; naming: no setup/foundation/readiness terms in app-owned surfaces.
- Relevant skills: kit-app-startup-seeding, kit-backend-engineering, kit-frontend-engineering
- Dependencies: none
- Target method artifact: specs/001-invoice-intake-runtime/
- Split/merge trigger: runway exception
- Acceptance checks: App can start from clean checkout; seed creates invoice data through the real path; provider boundary call is observable; audit record includes runtime path.
```

Drifted entry to reject:

```markdown
### invoice-runtime-s001 — Backend Runtime
- Slice class: Enterprise Walking Skeleton / Runway Enabler
- Class validity evidence: Provides backend runtime and APIs for the app.
- Included behavior: Implement invoice matching, exception proposal, reviewer approval, write-back endpoints, database schema, FastAPI routes, service classes, and later the frontend will display the results.
```

Reject this because the runway absorbs the primary workflow, splits backend before UI, and names implementation mechanics at slice altitude.
