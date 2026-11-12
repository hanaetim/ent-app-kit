# Slice Sizing: Spec Kit

The decomposition rules live in `SKILL.md`; this file supplies only the Spec-Kit-specific calibration.

## What One Slice Maps To

**One delivery slice = exactly one Spec Kit feature** = one branch = one numbered `specs/NNN-<slug>/` directory running the full phase sequence (specify -> clarify? -> plan -> checklist? -> tasks -> analyze -> implement -> converge). Product slice IDs use `<slug>-sNNN`; derive the Spec Kit feature directory by moving the suffix number to the front (`invoice-intake-runtime-s001` -> `specs/001-invoice-intake-runtime/`).

Never collapse multiple slices into one feature or split one coherent slice across two features unless the user approves after seeing the map.

## Capability Slice Sizing

For `Experience / Capability` slices:

**One capability slice = one primary outcome/workflow, taken end to end, in as few repos as it needs.**

A primary workflow is one actor pursuing one goal to a stakeholder-meaningful outcome. Branches of the same goal are still one workflow: "review a flagged invoice" that ends in approve or reject is one workflow. Two candidates are separate only when each has its own trigger and standalone outcome.

Use product-model signals:

- **Primary workflows/outcomes** - aim for one.
- **Repos** - span only what the outcome needs; never split a workflow from its own UI.
- **Surfaces/integrations/agents** - bounded is fine; sprawling means split.

A right-sized Spec Kit feature usually forecasts 2-5 user stories once specified. Above 5 usually means several workflows or capability groups; split before downstream work. One story is a merge candidate unless a real split trigger fired.

Games are capability slices: size by playable loop, mechanic, progression, input/feedback, or win/fail increment. Do not slice by engine setup, assets, or UI layer.

Data/reporting capability slices size by decision/report pack, metric contract, data freshness/lineage outcome, export, or operational decision, not by chart/query/table.

## Non-Capability Slice Sizing

Non-capability slices are valid only under a named class in `SKILL.md` and size by **one evidence-producing outcome**:

- **Runway:** one thin executable product-domain path plus runtime/startup/seed/state/audit/integration conventions needed by near-term slices. It must not own the full primary workflow unless the valid single-slice fast path applies.
- **Integration:** one executable provider/consumer boundary or contract harness, including success/error evidence.
- **Migration / Modernization:** one characterization, contract-wrapper, replacement/parity, shadow-run, data migration, or retirement unit around named preserved/replaced behavior.
- **Quality / Remediation:** one named risk with measurable evidence; attach to the protected capability unless too broad or risky.
- **Exploration / Spike:** one durable decision or artifact set, such as characterization tests, decision record, contract draft, prototype evidence, revised slice map, or approved follow-up slices.

Each non-capability slice must still fit one Spec Kit feature and produce coherent stories/task groups around the evidence outcome. If it cannot, it is pre-method discovery or must be merged into the owning capability.

## Split Triggers

Split a candidate when any trigger fires, and record the trigger. These triggers create smaller valid slices; they do not permit technical-layer cuts.

- **More than one primary workflow/outcome.**
- **Two independently valuable outcomes.** Split between outcomes, not technical layers.
- **Hard dependency order.** Part A is independently valuable and must be built/validated before Part B can be meaningfully specified.
- **Size gate.** The candidate will not fit one coherent Spec Kit feature.
- **Cross-slice remediation.** A fix to an earlier slice is its own scope.

Independently shippable is only a tiebreaker for where to cut once another trigger fires.

## Hard Rejection Gates

Reject the map and recut before starting Spec Kit if either gate appears:

- **Runway overreach.** A runway owns the primary workflow, terminal-state matrix, or reviewer/action workflow that later slices should own.
- **Backend-first/UI-later split.** A backend/runtime slice owns behavior and a later slice mostly renders it.

## Merge Triggers

Fold a candidate back into a neighbor when:

- It delivers no standalone method-executable evidence.
- It is a fragment of a workflow.
- It is a technical layer with no independently valuable named slice class.
- It exists only because the template had a slot to fill.

## Spec Kit Discipline

Spec Kit templates can invite padding. Add a story only when it partitions distinct implementation work. Fold UI-state variants and repeated requirement matrices into acceptance scenarios or plan detail. Keep concrete implementation mechanics out of the slice map.

## If A Slice Proves Oversized Later

Do not power through. Reopen `product-delivery-slices.md`, split the slice with user approval, record the trigger, and restart the affected feature phases on the resulting slices.
