# Slice Sizing: OpenSpec

The decomposition rules live in `SKILL.md`; this file supplies only the OpenSpec-specific calibration.

## What One Slice Maps To

**One delivery slice = exactly one OpenSpec change** = one `openspec/changes/<change-name>/` directory containing `proposal.md`, delta `specs/`, `design.md`, and `tasks.md`, then implemented, synced, or archived into `openspec/specs/`.

Never collapse multiple slices into one change or split one coherent slice across two changes unless the user approves after seeing the map.

## Capability Slice Sizing

For `Experience / Capability` slices:

**One capability slice = one primary outcome/workflow, taken end to end, in as few repos as it needs.**

A primary workflow is one actor pursuing one goal to a stakeholder-meaningful outcome. Branches of the same goal are still one workflow. Two candidates are separate only when each has its own trigger and standalone outcome.

OpenSpec is lighter than Spec Kit, but each change still needs to be reviewable and implementable by one worker with the change artifacts, source context, and diff in memory. Right-sized capability slices usually become 2-5 coherent requirement/task groups. Clearly above 5, or too many bounded contexts/surfaces/integrations/agents, means split.

Games are capability slices: size by playable loop, mechanic, progression, input/feedback, or win/fail increment. Do not slice by engine setup, assets, or UI layer.

Data/reporting capability slices size by decision/report pack, metric contract, data freshness/lineage outcome, export, or operational decision, not by chart/query/table.

## Non-Capability Slice Sizing

Non-capability slices are valid only under a named class in `SKILL.md` and size by **one evidence-producing change outcome**:

- **Runway:** one thin executable product-domain path plus runtime/startup/seed/state/audit/integration conventions needed by near-term slices. It must not own the full primary workflow unless the valid single-slice fast path applies.
- **Integration:** one executable provider/consumer boundary or contract harness, including success/error evidence.
- **Migration / Modernization:** one characterization, contract-wrapper, replacement/parity, shadow-run, data migration, or retirement unit around named preserved/replaced behavior.
- **Quality / Remediation:** one named risk with measurable evidence; attach to the protected capability unless too broad or risky.
- **Exploration / Spike:** one durable decision or artifact set, such as characterization tests, decision record, contract draft, prototype evidence, revised slice map, or approved follow-up slices. Otherwise use pre-change exploration, not an OpenSpec change.

Each non-capability slice must still fit one reviewable OpenSpec change. If the proposed unit cannot be expressed as a durable delta, design decision, task set, or verification outcome, it is not an OpenSpec delivery slice.

## Split Triggers

Split a candidate when any trigger fires, and record the trigger. These triggers create smaller valid slices; they do not permit technical-layer cuts.

- **More than one primary workflow/outcome.**
- **Two independently valuable outcomes.** Split between outcomes, not technical layers.
- **Hard dependency order.** Part A is independently valuable and must be built/validated before Part B can be meaningfully specified.
- **Size gate.** The candidate will not fit one coherent OpenSpec change.
- **Cross-slice remediation.** A fix to an earlier slice is its own scope.

## Hard Rejection Gates

Reject the map and recut before starting OpenSpec if either gate appears:

- **Runway overreach.** A runway owns the primary workflow, terminal-state matrix, or reviewer/action workflow that later slices should own.
- **Backend-first/UI-later split.** A backend/runtime slice owns behavior and a later slice mostly renders it.

## Merge Triggers

Fold a candidate back into a neighbor when:

- It delivers no standalone method-executable evidence.
- It is a fragment of a workflow.
- It is a technical layer with no independently valuable named slice class.
- It exists only because the template had a slot to fill.

## OpenSpec Discipline

OpenSpec delta specs should describe what changes, not restate the whole system. Keep slice entries at spec-seed altitude and let the OpenSpec change own proposal, design, delta requirements, and tasks. Do not bulk-convert source artifacts into giant specs.

## If A Slice Proves Oversized Later

Do not power through. Reopen `product-delivery-slices.md`, split the slice with user approval, and restart or update affected OpenSpec changes. Record the trigger and any approved deferral.
