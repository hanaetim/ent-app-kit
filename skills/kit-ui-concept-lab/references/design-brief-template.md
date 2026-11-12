# Design Brief Template

The structured brief that drives every variant-generation run. In Phase 1, fill it from
whatever the user provides plus your own gap-filling proposals; present the completed brief
for confirmation before spawning any generator subagents. In Phase 2, pass the confirmed
brief to every generator verbatim — it is the generator's entire design instruction, so a
vague brief produces generic variants and a sharp one produces distinctive ones.

Sections marked *(optional)* may be omitted when empty; everything else should carry a real
answer — either the user's or your explicitly-proposed default.

---

## Screen

- **Name**: <!-- e.g. "Story Workspace" -->
- **Source requirements**: <!-- payload sections that bind this screen, e.g. "Product_Spec.md §12.2 (CEAP stories US-CEAP-01..10), journey §14.1" — generators must honor these; list the specific information the screen MUST display (e.g. provenance + confidence on every suggestion) -->
- **Primary persona & job**: <!-- who uses it and for what decision, e.g. "journalist producing a draft; must judge whether AI output is safe to use" -->
- **Surface rationale**: <!-- why each visible route/tab/panel/grouping belongs here: user journey, content context, system state, workflow state, or supporting context; do not mirror artifact headings by default -->

## Shared Design Constraints

<!-- Constraints shared by every variant. Keep this section narrow: product truth, binding systems, accessibility, required states, and non-negotiable brand/component requirements. Do not use this section to force all variants into one aesthetic unless the user explicitly asked for that. -->

- **Product constants**: <!-- requirements every variant must preserve -->
- **Brand / component constants**: <!-- required systems, tokens, component styles, or visual patterns every variant must preserve -->
- **Accessibility / platform constants**: <!-- e.g. WCAG AA, responsive breakpoints, keyboard states -->

## Variant Directions

<!-- Define each variant independently. Variants may differ in structure, hierarchy, aesthetic, complexity, navigation model, density or pacing, visual ambition, interaction model, and feel unless the user explicitly narrows the range. In Explore mode, use the spread from SKILL.md: baseline, structural or interaction alternatives, and bold/showcase options. In Rollout mode, keep the established visual identity fixed and vary only production-aligned layout, hierarchy, content, state, or interaction choices. -->

- **Variant A**
  - **Direction name**: Use a short evocative name, such as "quiet product baseline", "editorial broadsheet", "immersive showcase", or "minimal writing-focused".
  - **Reference focus**: Name the specific references this variant should use and what to borrow from each. Use "none beyond shared constraints" if this variant is intentionally source-light.
  - **Aesthetic**: Use 3-6 words plus color/type intent when relevant.
  - **Complexity**: simple/focused | balanced | rich/deep
  - **Navigation model**: e.g. linear, hub-and-spoke, split view, immersive, tabbed, stepper, freeform
  - **Information density**: low | medium | high
  - **Visual ambition**: restrained/production-like | polished/demo-ready | bold/showcase
  - **Feel & intent**: State the experiential target and product reason.
  - **Binding stance**: strict visual/interaction preservation | approved alternate direction with named constraints held fixed
  - **What this tests**: State the specific design question this variant answers.

- **Variant B**
  - **Direction name**:
  - **Reference focus**:
  - **Aesthetic**:
  - **Complexity**:
  - **Navigation model**:
  - **Information density**:
  - **Visual ambition**:
  - **Feel & intent**:
  - **Binding stance**:
  - **What this tests**:

## Reference Library *(optional but high-leverage)*

<!-- List all available references here, then assign the relevant ones to specific variants using each variant's Reference focus. A reference may be global, variant-specific, or unused after review. Do not force every variant to use every reference. -->

- **Payload artifacts**: <!-- concrete files in ent-app-kit/payload/ to draw from: design/inspiration/*.png, design/brand.md, an existing wireframe in design/screens/ that sets precedent -->
- **Screenshots / images**: <!-- paths the user supplied; say WHICH aspect to take from each — "match the header density of shot-1.png, ignore its colors" beats a bare file list -->
- **URLs / products**: <!-- e.g. "the triage feel of Linear's inbox", "Bloomberg terminal density" — name the specific quality being borrowed, not just the product -->
- **External design sources**: <!-- accessible Figma, Framer, design-system, Storybook, or prototype links/exports; state whether to use frames/screens, component anatomy, interaction patterns, spacing/type tokens, or motion cues. If live access is not available, ask for an export/screenshot or treat the source as unavailable. -->
- **Other files / artifacts**: <!-- decks, PDFs, design exports, prior app screens, CSS/themes, or brand files; say which quality or constraint matters -->

For every inspiration source, state whether it is optional inspiration or a binding UI input. If it is binding, also list it under Binding UI Inputs.

## Binding Design Inputs

<!-- Required design systems, component libraries, brand systems, wireframes, screenshots, promoted screens, visual references, or interaction patterns. Keep optional inspiration in References, not here. Default is to honor these; user-approved alternatives belong in Variant Plan. -->

For every binding input, specify whether the requirement is **visual-exact**, **interaction-exact**, **visual-and-interaction-exact**, or **conceptual**:

- **visual-exact** means the artifact must match the visible system, screenshot, or brand treatment closely, but does not require using a specific package.
- **interaction-exact** means the artifact must preserve a behavior, journey, or workflow pattern even if the visual treatment varies.
- **visual-and-interaction-exact** means the artifact must closely match both the visible system and the relevant interaction patterns.
- **conceptual** means the source informs direction only; prefer keeping this in References unless the user made it binding.

For a named library such as `@carbon/react`, static HTML/CSS should closely match Carbon layout, spacing, typography, component anatomy, states, and interaction patterns. Do not claim the artifact imports or uses Carbon React.

- **Source**:
  - **Type**:
  - **Binding mode**: <!-- visual-exact | interaction-exact | visual-and-interaction-exact | conceptual -->
  - **Required constraint**:
  - **Acceptable evidence**:

## Guardrails

- **Always**: <!-- non-negotiables, e.g. "provenance and confidence visible on every AI output", "explicit accept/edit/reject on every suggestion", "WCAG AA contrast" -->
- **Never**: <!-- hard exclusions, e.g. "never hide gated/sensitive states behind hover", "no lorem ipsum — realistic domain content only", "no auto-applied suggestions shown as fait accompli" -->
- Source these from binding payload requirements first (a spec'd behavior is a guardrail, not a preference), then the user's stated rules, then brand constraints.

## Variant Plan

- **Count**: <!-- how many variants this run generates -->
- **Angle per variant**: <!-- summarize what makes each one genuinely different across aesthetic, complexity, navigation, density, ambition, or feel -->
- **UI-language policy**: <!-- honor binding UI inputs for all variants by default; name any user-approved alternate directions/substitutions and which constraints remain fixed -->
- **Open exploration options**: <!-- what the user may reasonably refine after seeing variants: targeted edits, hybridization, new inspiration, or new directions -->
- **Coverage rule**: <!-- at least one variant optimizes for strict clarity and at least one for demo-ready or bolder visual impact, unless the user explicitly narrows the range -->
