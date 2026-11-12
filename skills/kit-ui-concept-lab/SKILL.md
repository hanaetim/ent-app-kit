---
name: kit-ui-concept-lab
description: "Discover what an App Kit screen should look like, with the user, when that isn't settled yet. Use at the start of the workflow, and again any time a new surface appears or the direction is reopened — including plain asks like 'what could this screen look like,' 'give me some layout options,' 'mock this up,' or 'I want to compare a couple styles' before committing to implementation. Generates variants through the design engine, serves them side by side, iterates on the user's picks, and promotes the winner into ent-app-kit/payload/design/screens/. Prefer this over generic frontend-design help whenever the target is an App Kit screen and direction is still open — hand off to implementation only once a winner is promoted."
---

# Kit UI Concept Lab

**Goal: help the user choose the right UI direction, through conversation, before production frontend work begins.** This skill owns the App Kit exploration workflow and artifact placement. **Impeccable owns the actual design craft, screen generation, critique, and refinement.**

Keep exploration cheap and reversible:

- Work in `out/ui-concept-lab/screens/`.
- Promotion is the only write path into `ent-app-kit/payload/` — abandoned variants stay in `out/`, so a rejected direction never becomes something a later slice mistakes for accepted truth.
- Promote only the final accepted screen into `ent-app-kit/payload/design/screens/`.
- Production frontend code is not written here. Implementation belongs to the method adapter, which applies `kit-ui-design` for UI fidelity and `kit-frontend-engineering` for repo build/test/deliverability.
- Keep the main agent on orchestration. Generate each variant in a fresh worker subagent so disposable design code does not fill the main context.
- Ask the user structured questions and use the workflow status gate before continuing.

This skill helps choose UI direction; it **does not** quietly rewrite the app.

Do not treat artifact concepts as automatic screens, routes, tabs, panels, or other UI groupings. Concepts may explore surface structures, but promoted artifacts should state whether each visible surface represents a user journey, content context, system state, workflow state, or supporting context. Product slicing remains responsible for final surface ownership.

## Context Boundary

Main agent: discover, brief, delegate, validate, serve, promote. Worker subagents: generate/refine artifacts. Use one fresh worker per variant. Do not load full generated source in the main context unless debugging a concrete failure; prefer reports, paths, screenshots, and grep checks. If subagents are unavailable, ask before proceeding in degraded single-agent mode.

## Workflow Status

Read `.kit-state/ui-concept-lab-status.json` at the start when it exists. Maintain it as a tiny marker of the active artifact and whether the workflow is waiting on the user:

```json
{
  "current_artifact": "<scope|brief|variants|gallery|customizations|promotion|none>",
  "state": "<draft|waiting_for_user|active|accepted|stale|done>",
  "pending": "<short action needed, or none>"
}
```

The numbered sections below are the default path, not a required state machine. Users may jump between artifacts: revise scope, edit the brief, regenerate variants, customize the gallery, combine directions, or return from promotion to review. Keep `.kit-state/ui-concept-lab-status.json` current enough that another agent can tell what artifact is active and whether user input is required.

If `state` is `waiting_for_user`, ask for the pending action and stop. Do not generate variants while the brief is waiting for approval. Do not write to `ent-app-kit/payload/` unless the user has explicitly confirmed promotion.

## Workflow

Follow the sections below as the default path, but treat the outputs as revisitable artifacts, not one-way phases. The user may return to scope, brief, variants, gallery customizations, or promotion at any time. When that happens, update the affected artifact at the smallest useful scope, then continue from there.

### 1. Discover Before Asking

Read enough context to make the first user question concrete:

- `ent-app-kit/payload/` or equivalent source docs for personas, journeys, and named screens.
- `ent-app-kit/payload/design/` for brand, UX, wireframes, screenshots, inspiration, components, and previously promoted screens.
- `out/ui-concept-lab/screens/` for prior briefs, variants, `gallery.json`, and `customizations.json`.

Separate **binding UI inputs** from optional inspiration. Binding inputs can be named design systems, component libraries, brand systems, wireframes, screenshots, promoted screens, visual references, or interaction patterns. Default: honor the binding UI language. If it may be useful to explore alternatives, ask the user explicitly whether to keep the UI language fixed or include alternate directions; never silently downgrade a binding input to loose inspiration.

Then present a short candidate list: screen or surface name, audience/use, and why it matters. If a prior visual identity exists, say whether this is:

- **Explore mode**: broad visual exploration before choosing a direction.
  - Generate 4-6 meaningfully different directions unless the user narrows the count. The set should look and behave meaningfully different at thumbnail scale, not like cosmetic reskins of one layout.
- **Rollout mode**: visual identity already locked and the user wants production-aligned options only. Generate 1-2 layout/information-hierarchy variants in the established look.

Prefer starting with the screen or surface that settles the most reusable design questions: overall structure, wayfinding, density or pacing, content components, state/feedback patterns, and primary interaction.

### 2. Ask scoping questions (user input required)

Ask one compact scoping question, not a rigid intake form. Treat the Explore/Rollout posture from Step 1 as editable defaults, not fixed rules. Keep the interaction lightweight: summarize the default plan in one sentence, expose only the knobs the user may want to change, and do not list or pre-design every variant. If the user does not override the defaults, proceed with them.

The question should gather only decisions that change the default variant search:

- target screen or surface, if more than one candidate is plausible
- variant count or breadth, if the default may not fit
- binding UI inputs the variants must preserve exactly, including any named component library or design system that must be visually mimicked in static HTML/CSS
- optional inspiration and the quality to borrow from each source
- desired feel, ambition, or variant mix
- guardrails or never-rules
- range boundaries for bold/showcase variants when binding inputs or strong user constraints exist

Default detail level: enough to complete the brief without a second round, but no exhaustive questionnaire. Prefer one short paragraph plus at most 3-5 bullets. Ask for broad preferences, not per-variant specifications. If the user already provided strong direction, ask only for the missing high-impact choices. If a choice is useful but not essential, propose a default instead of blocking.

Classify every UI input in the question:

- **Binding UI input:** must be followed exactly by default. Named libraries or design systems should be visually mimicked in static HTML/CSS without claiming real framework usage. Any alternate interpretation needs explicit user approval and must be recorded in the brief.
- **Inspiration:** borrow selectively. Ask what to borrow if unclear: density, navigation, typography, color, component behavior, interaction pattern, tone, or polish.
- **Open latitude:** unconstrained space for meaningful variation.

When binding inputs exist, ask a range-boundary question instead of treating bold variants as off by default: "For the bold/showcase variants, which constraints must remain fixed, and which parts of the visual language can stretch?" Record fixed constraints, allowed departures, and any variants that must stay strictly inside the binding design language.

For greenfield exploration, cover two levers: complexity (`simple/focused`, `balanced`, `rich/deep`) and visual ambition (`restrained/production-like`, `polished/demo-ready`, `bold/showcase`).

If the user does not choose, use the default:
- one baseline variant optimized for clarity and any specified/binding design language
- one or more variants that explore a different structure, hierarchy, density, pace, interaction model
- Include one or two bold/showcase variants which show beautiful UIs and depart from the binding visual language for exploration, but must preserve product truth, required content, behavior, accessibility.
- Meaningful difference can come from layout structure, information hierarchy, density, pacing, interaction model, media/motion treatment, brand posture, or visual language; color/spacing changes alone do not count.

Do not ask for decisions that the payload can answer. Read product truth first, fill likely defaults yourself, then expose those defaults in the brief for confirmation. Mark `.kit-state/ui-concept-lab-status.json` with the scope artifact waiting for approval, ask the scoping question, and stop.

### 3. Create A Brief (user input required)

Fill missing pieces yourself from payload truth and product context, then write a concise design brief using `references/design-brief-template.md`. Save it to:

```text
out/ui-concept-lab/screens/<screen-slug>-brief.md
```

Before generating variants, present the completed brief for confirmation. The brief is the contract passed to Impeccable. Mark `.kit-state/ui-concept-lab-status.json` with the brief artifact waiting for approval and stop. Continue to Step 4 only after the user confirms the brief, changes it, or explicitly says to use the brief and proceed.

### 4. Worker delegation

The main agent delegates craft to worker subagents rather than producing the artifact itself. Impeccable is this skill's engine: it generates and refines variants. 

For each variant, spawn one fresh worker and precisely follow this prompt template `references/variant-worker-prompt-template.md` when invoking them. 

Add a short functional persona at the beginning of the delegation prompt as described in the prompt template.

Each worker report must include Binding UI Input Coverage. Regenerate or reject a variant when it omits a binding UI input, substitutes an approximation without approval, or treats a required UI source as optional inspiration.

When refining, read `out/ui-concept-lab/screens/customizations.json` first. If the user adjusted a variant in the gallery, ask Impeccable to bake those values into the variant CSS and remove that variant's override entry so the same customization is not double-applied.

### 5. Maintain The Gallery (user input required)

The gallery is deterministic. Do not hand-edit `index.html`.

After adding, removing, renaming, or promoting variants:

1. Update `out/ui-concept-lab/screens/gallery.json`.
2. Run:

   ```bash
   python3 <skill-dir>/scripts/build_gallery.py out/ui-concept-lab/screens
   ```

3. Serve the gallery with:

   ```bash
   python3 <skill-dir>/scripts/serve_gallery.py out/ui-concept-lab/screens <port>
   ```

Reuse an existing server when one is already running. Give the user the gallery URL and let them compare variants in the browser. Before presenting the gallery, run a compact validation pass: files exist, gallery builds, served URL returns 200, representative desktop/mobile screenshots are nonblank, and binding UI inputs have evidence in worker reports or deterministic checks.

When presenting the gallery, keep the exploration open. Tell the user they can pick a winner, request targeted changes to one or more variants, combine parts of different variants, add new inspiration sources, or ask for a fresh direction. Do not frame the gallery as a forced final choice.

### 6. Promote Only Decisions

When the user chooses a design to promote:

1. Treat explicit selection language such as "go with option 1", "promote option 1", or "use variant B" as approval to promote that variant. If the user's wording is only a preference, such as "I like option 1", ask whether to promote it or keep exploring.
2. Mark `.kit-state/ui-concept-lab-status.json` with the promotion artifact active.
3. Bake any saved customizations into the HTML.
4. Copy the accepted wireframe to `ent-app-kit/payload/design/screens/<screen-slug>.html`.
5. Copy the brief beside it so future implementation understands the reasoning.
6. If a coherent product-wide identity emerged, draft it as `out/ui-concept-lab/proposed/brand.md` or `components.md` and tell the user it is waiting for review. These files become standing design law once they reach `payload/design/`, which is a bigger commitment than picking one screen's direction — so propose them rather than promoting them alongside the wireframe.
7. Mark the winning entry as `"final": true` in `gallery.json` and rebuild the gallery.
8. Record the promotion decision in `.kit-state/ui-concept-lab-decision.json`, including the promoted screen path and brief path so downstream frontend work treats the promoted screen as accepted design direction.
9. Run `kit-ui-context` so `.kit-state/ui-context.md` reflects the promoted screen.
10. Mark `.kit-state/ui-concept-lab-status.json` as done.

Report the promoted path back to the orchestrator. `.kit-state/ui-concept-lab-decision.json` records the decision.

If the user asks for changes or new directions instead of promotion, return to the brief or worker step at the smallest useful scope: update the brief for new design intent, delegate refinements to workers, rebuild the gallery, and ask again.

Do not create root-level Impeccable `PRODUCT.md` or `DESIGN.md` as a promotion side effect.

## Boundaries

- Exploration variants are decision aids, not frontend scaffolds.
- `out/ui-concept-lab/` is disposable working state.
- `.kit-state/ui-concept-lab-status.json` and `.kit-state/ui-concept-lab-decision.json` are durable workflow state; do not store resume or opt-out decisions only under `out/ui-concept-lab/`.
- `ent-app-kit/payload/design/screens/` is binding UI direction.
- Impeccable workers perform the design work; this skill coordinates the conversation with the user, App Kit placement, review flow, gallery mechanics, validation, and promotion.
- The standing UI design bar — component library fidelity, tokens, states, accessibility expectations, responsive behavior, and interaction model — belongs to `kit-ui-design`. Frontend repo build/test/browser/a11y execution belongs to `kit-frontend-engineering`.
