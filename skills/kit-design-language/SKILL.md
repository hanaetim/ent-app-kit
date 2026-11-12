---
name: kit-design-language
description: "Settle durable product and design language for App Kit user-facing UI before method implementation. Use after UI context and the UI Concept Gate, and before product slicing or method execution hardens UI-bearing specs. Uses Impeccable to produce App Kit design-language artifacts: PRODUCT.md, DESIGN.md, and a design-language decision record."
---

# Kit Design Language

**Goal: commit the app's durable product and design context before implementation so UI-bearing slices inherit a concrete visual language.**

This skill is an adapter boundary. The orchestrator depends on this skill's outputs, not on Impeccable's internal workflow details.

## Inputs

Read:

- `.kit-state/ui-context.md`
- `.kit-state/ui-concept-lab-decision.json`
- `ent-app-kit/payload/design/`
- UI-relevant payload artifacts
- existing frontend conventions, if a frontend repo exists

## Outputs

Produce or update:

- `PRODUCT.md` in the active project root
- `DESIGN.md` in the active project root
- `.kit-state/design-language-decision.json`

`PRODUCT.md` records durable product truth. `DESIGN.md` records durable visual language.

Do not put screen-specific workflow contracts into `DESIGN.md`. Screen topology, action placement, state matrices, and per-slice layout obligations belong in product slices, method artifacts, and `kit-ui-design` review.

## Impeccable

Apply the `impeccable` skill to establish durable design context. Let Impeccable choose and execute its own internal workflow.

Write the settled `PRODUCT.md` and `DESIGN.md` to the active project root. Use the same active project root Impeccable resolves for the UI target.

If no binding design language exists, ask Impeccable to create one from the product workflow and UI context. If binding design artifacts or promoted concepts exist, ask Impeccable to preserve and consolidate them rather than inventing a replacement world.

If UI Concept Lab was declined or skipped, treat that only as skipped exploration. The settled design language must still be specific, durable, and production-grade; do not downgrade to a minimal or generic UI direction.

## Completion Gate

Do not mark this skill complete unless all outputs exist or an explicit deferral is recorded with scope and reason.

Record `.kit-state/design-language-decision.json` with mode, output paths, source artifacts, and any approved deferrals or substitutions.
