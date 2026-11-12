---
name: kit-ui-design
description: "App Kit UI design quality and fidelity guidance. Use when deciding or reviewing how a user-facing interface should look, feel, behave, and match accepted UI context: component-library posture, tokens, visual language, interaction model, required UI states, accessibility expectations, responsive behavior, payload fidelity, design review, UI audit, critique, or polish. Does not define frontend repo build/test/tooling harnesses; use kit-frontend-engineering for implementation deliverability."
---

# Kit UI Design

**Goal: every user-facing surface ships at enterprise-grade visual quality — polished, consistent, accessible, and faithful to the App Kit payload — not a bare structural shell.** The method adapters define *what* a screen shows; this skill defines *how it should look and feel*, and rules on whether the built result got there.

This skill owns UI design quality. It does not define frontend repository engineering harnesses, package scripts, typecheck/lint setup, browser test orchestration, or production build gates. Use `kit-frontend-engineering` for those.

  ## Design Engine

  Use the **Impeccable** skill as the mandatory design engine for generated App Kit UI screens and UI-bearing implementation or review.
  App Kit screens must aim for beautiful, highly polished, production-grade product design, not merely contract-compliant layouts. This
  skill defines the App Kit UI contract; Impeccable provides the comprehensive design judgment and execution needed to satisfy it at
  that quality bar.

  When UI work or review is in scope:

  - load the narrowest relevant Impeccable command/reference for the task or defect, such as new-work, shape, layout, adapt, harden,
  critique, audit, or polish; follow the selected Impeccable playbook rather than doing a checklist-only pass
  - use Impeccable in planning to shape design direction, critique options, define acceptance criteria, and set up in-scope
  `PRODUCT.md` / `DESIGN.md` artifacts when applicable
  - use Impeccable in implementation, review, and approved remediation phases to evaluate the rendered UI and, when code changes are
  allowed in that phase, make or guide source changes that achieve the accepted design quality bar
  - require rendered evidence for meaningful implemented changes across layout, responsive behavior, state, and interaction, or state
  why evidence could not be captured
  - do not invoke `kit-ui-concept-lab`; new direction exploration is an orchestrator/user decision, not a side effect of UI design
  review

## Design Inputs

Read what already constrains the UI before advising or judging. `.kit-state/ui-context.md` records which direction the orchestrator and user accepted; treat it as the statement of what is settled, and do not rewrite it.

- `ent-app-kit/payload/design/` — human-authored brand, UX, wireframes, screenshots, mockups, design-system artifacts, and promoted UI concept output.
- Design-bearing files elsewhere under `ent-app-kit/payload/` — screen briefs, UX flows, HTML mocks, deck pages, brand notes, component notes, prose UI requirements.
- Existing frontend conventions in `repos/frontend` — tokens, theme, components, layout, accepted screen patterns.
- The Quality Bar and default UI posture below, when the above are absent.

Merge what each contributes rather than letting the strongest source silence the others, and say which sources drove the outcome. A component library, screen prose, or a named control constrains implementation but is not by itself an accepted visual direction.

## Binding UI Inputs

When a source artifact or accepted brief marks a UI input as required, treat it as binding UI direction, not optional inspiration. This includes named design systems, component libraries, brand systems, wireframes, screenshots, promoted screens, visual references, and interaction patterns.

Default to honoring the binding design language. A different visual direction, approximation, or substitution requires explicit user approval and must be recorded with scope and reason.

Evidence depends on the input type:

- named design system or component library: preserve the relevant component anatomy, interaction behavior, density, visual language, and runtime styling; verify required stylesheet/theme/provider/tokens are loaded and visible in rendered UI, because package imports alone are insufficient (for example, Carbon React requires `@carbon/styles` or equivalent Carbon theming); `kit-frontend-engineering` owns whether production code uses the actual package or records an approved substitution
- brand system: use its tokens, typography, color, spacing, and component rules
- wireframe, screenshot, or promoted screen: map relevant regions to implemented components or rendered evidence
- visual reference or interaction pattern: preserve the required pattern, not just its mood

"Inspired by" or "similar to" does not satisfy a binding UI input unless the user approved that substitution.

## App Kit Frontend Contract

For every UI-bearing slice, the design-engine review or implementation report should explicitly cover:

- applicable design artifacts under `ent-app-kit/payload/design/`, named product design artifacts such as `DESIGN.md`, and accepted frontend conventions
- binding UI inputs and evidence that each was honored or explicitly approved for substitution
- payload fidelity: required screens, workflows, data states, provenance, audit evidence, and user actions are preserved
- component-library fidelity for controls and primitives where a component system is binding
- token or documented design-system usage for color, typography, spacing, radius, and elevation
- loading, empty, error, populated, disabled, in-progress, and post-action states where applicable
- keyboard access, visible focus, labels, contrast, and screen-reader-sane structure
- responsive desktop and mobile behavior without clipped or overlapping controls
- rendered visual evidence for meaningful UI changes; `kit-frontend-engineering` skill owns the browser/test harness that may produce it

If the design engine cannot perform the review, say so and ask for direction rather than substituting a weaker check silently.

## Quality Bar (binding, stack-neutral)

These hold on every project regardless of framework, brand, or which input source was used:

- **Component-library-faithful.** Use the established accessible component system where one is binding. Hand-rolled buttons, inputs, dialogs, tables, and menus drift quickly from accessibility and consistency expectations; any substitution needs explicit approval and engineering validation.
- **Token-driven.** Color, typography, spacing, radius, and shadow come from a defined token set — no scattered magic values. Use tokens from the resolved design source; when none exists, define a restrained default UI token posture.
- **Every stateful surface handles all states.** Loading (skeletons, not spinners-only), empty, error, and populated — plus disabled and in-progress for actions. A screen that only renders the happy path is incomplete.
- **Populated data stays contained.** Tables, tiles, cards, timelines, and detail panels must still fit the layout with realistic data. Long values or many rows should scroll, wrap, truncate, paginate, or virtualize instead of stretching containers off-screen or hiding key actions.
- **Accessible to WCAG 2.1 AA.** Keyboard navigable, visible focus, labelled controls, sufficient contrast, semantic landmarks, screen-reader-sane. Accessibility is a requirement, not polish.
- **Responsive and adaptive.** Usable from narrow to wide viewports; no fixed-width layouts that break, and no narrow centered shells that underuse large laptop or desktop screens. Operational apps should use available space deliberately across mobile, standard desktop, and large desktop sizes.
- **Layered UI is intentional and recoverable.** Fixed, sticky, absolute, overlay, or z-indexed elements may cover content only as an intentional interaction state. Persistent layout elements must reserve or offset space for primary content; for example, a fixed top bar must not clip the page title. Required headings, controls, focus outlines, messages, and actions must not be clipped or unrecoverably hidden at any supported viewport.
- **Consistent.** Shared layout shell, spacing scale, and interaction patterns across screens. Later slices reuse the primitives the foundation slice establishes.
- **Non-duplicative navigation.** Use one clear primary navigation model. E.g. do not duplicate the same destinations in both a header nav and a left icon rail.
- **Subtle operational transparency.** Required disclosures about mocks, deferred scope, readiness, runtime state, limitations, or environment must remain truthful and discoverable without overpowering the primary user experience. Use the lightest fitting pattern; do not promote them to
  primary navigation or dominant workspace content unless they represent a real operator/audit workflow.

## Missing Design Language

If no binding design artifact, promoted concept, or existing frontend convention defines the visual language, stop and route back through `kit-design-language`. Do not proceed from generic "clean enterprise UI" defaults for UI-bearing work.

## Design Review Checklist

Apply before marking any UI-bearing slice complete (agent self-review; no script required):

1. Does it match the direction recorded in `.kit-state/ui-context.md` or the method artifact?
2. Does it match product design language artifacts such as `DESIGN.md`, `brand.md`, `components.md`,
   promoted UI concept examples, or accepted frontend conventions?
3. Does it match screen-specific artifacts such as exact HTML wireframes, Figma frames, screenshots, URLs, screen briefs, or sibling-pattern notes?
4. Are all binding UI inputs honored, or are substitutions explicitly approved and recorded?
5. Faithful to the binding component library or design system — no unapproved hand-rolled substitutes for primitives?
6. Colors/type/spacing/radius/elevation from tokens, not ad-hoc values?
7. Loading, empty, error, populated, disabled, and in-progress states all present where applicable?
8. Keyboard + focus + labels + contrast meet AA?
9. Responsive and adaptive across mobile, standard desktop, and large desktop widths, without underfilled large-screen layouts?
10. Populated data surfaces remain bounded with realistic rows and long values, without runaway cards, clipped content, or hidden actions?
11. Navigation is non-duplicative, with one primary model and safe mobile behavior?
12. Browser screenshot or equivalent rendered evidence captured where meaningful?
13. Payload fidelity preserved: no required screen, workflow, state, provenance, audit, or action semantics dropped?
14. Consistent with the foundation slice's shell, spacing, and patterns?
15. Reads as enterprise-grade software, not an unstyled scaffold?

Record the outcome in the slice's report, including which input source(s) drove the UI and — when defaults were used — that no UI source was found.

## Design / Code Conflicts

When design artifacts and implemented frontend code disagree, pick one explicit resolution and record it:

- update the code to match the authoritative design artifact
- update the design artifact because accepted code is now the better authority
- record an approved deviation with its scope and reason

The failure mode to avoid is leaving it implicit: a stale artifact quietly overriding accepted code, or implementation drifting from design while the report still claims conformance. Either way the next slice inherits a contradiction it cannot see.

## Interaction Model Fit

For agentic applications, do not default blindly to dashboards or chat. Choose the primary interaction model from the product workflow, user role, and source artifacts.

- Use dashboard/cockpit patterns when the user primarily monitors state, compares records, triages queues, or acts on structured operational data.
- Use chat/workbench patterns when the user primarily delegates work, iterates with an agent, reviews plans, asks follow-up questions, or collaborates with agent outputs.
- Use hybrid patterns when the workflow needs both structured state visibility and conversational agent control.
- Record the chosen interaction model and why it fits the workflow in the slice planning or implementation report.

A polished dashboard that hides the agentic workflow is a design failure. A chat interface that obscures required operational state is also a design failure.
