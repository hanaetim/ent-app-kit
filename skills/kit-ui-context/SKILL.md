---
name: kit-ui-context
description: "Find what UI context exists for an App Kit interface and report it: binding UI systems, component libraries, brand/tokens, promoted screens, wireframes, screenshots, optional inspiration, existing frontend conventions, and UI-relevant stack constraints. Use before planning or building UI to understand available UI authority without inventing a full screen inventory. Reports status quo only: no decisions, recommendations, or questions."
---

# Kit UI Context

**Goal: answer "what UI context exists, where did it come from, and how should downstream work treat it?" with a report anyone downstream can trust.** Nothing more. The report is a description of the status quo — not a decision, not a recommendation, not a plan.

This matters because the decision that follows belongs to someone else. `kit-orchestrator`/user decides whether to run UI concept exploration or proceed on documented defaults. If this report also carried an opinion, two things would own the same decision and neither would — the exact confusion this skill was split out to end.

## What This Skill Does Not Do

- **Decide anything.** No selected path, no recommendation about whether to explore.
- **Ask anything.** It reads the filesystem and writes a report.
- **Invent a screen inventory.** Product slicing and the selected SDD method own exact screen discovery and ownership.
- **Track how files got there.** It scans locations and describes what is in them. A promoted concept and a hand-authored wireframe sitting in the same directory are both just UI input.
- **Restate the quality bar.** That is `kit-ui-design`. A copy here would drift from the original.

## 1. Scan

UI intent lives in more than one place. Search all of these — a stronger source does not make a weaker one irrelevant, because they often contribute different things (brand colors from one, layout from another):

- `ent-app-kit/payload/design/` — brand, UX, wireframes, screenshots, mockups, design-system artifacts, and anything under `payload/design/screens/`.
- UI-bearing files anywhere else under `ent-app-kit/payload/` — screen briefs, UX flows, HTML mocks, deck pages, screenshots, brand notes, component notes, prose UI requirements.
- Existing frontend conventions in the referenced frontends (e.g. `repos/frontend`) — tokens, theme, components, layout, accepted screen patterns, implementation constraints.
- External or user-provided design authorities made available to the workspace or conversation — Figma MCP servers, Figma/design URLs, screenshots, uploaded files, folders of mockups, exported design files, existing app URLs, design-system docs, CSS/themes, and brand assets. Record how they were provided and whether the user/source marks them binding or inspirational.

## 2. Label Each Source

Record sources by how downstream work should treat them. Downstream readers need the distinction: a promoted screen is accepted visual direction, whereas a loose reference may only be inspiration.

| Label | Means |
|---|---|
| `binding UI input` | a required design system, component library, brand/tokens, wireframe, screenshot, promoted screen, visual reference, or interaction pattern |
| `optional inspiration` | a source that may influence direction but is not required unless the user later promotes it |
| `existing frontend convention` | already implemented and in use in a referenced frontend |
| `promoted screen precedent` | anything under `payload/design/screens/` — an accepted direction for the explicit surface/scope it covers |

## 3. Extract UI Context

Do not infer or enumerate the full screen inventory. That belongs to product slicing and the selected SDD method.

Instead, record what is already true:

- binding UI inputs
- optional inspiration
- existing frontend conventions
- promoted screen precedents, if any
- external/user-provided design authorities and what they explicitly cover
- known frontend stack or component libraries
- known brand/tokens/typography
- known interaction patterns
- conflicts or gaps

Mention a specific surface only when a source explicitly names it or a promoted/wireframe artifact clearly covers it. Surface coverage is opportunistic, not exhaustive.

## 4. Write The Report

Write `.kit-state/ui-context.md` from `references/ui-context-template.md`.

Regenerate it whole on every run. The report is derived from a filesystem scan, so it has no history worth preserving and merging it with a previous version can only introduce contradictions. Two runs with no intervening file change should produce the same report.

Re-run whenever the picture may have moved: the payload changed, new UI material appeared, scope expanded, a frontend convention was established, or a concept was promoted. Treat it as a cache refreshed when someone needs current UI context, not as something that must be updated after every write elsewhere.

## 5. Report Back

Tell the caller, in a sentence or two: which binding UI inputs exist, whether an accepted visual direction or promoted precedent exists, and whether there are conflicts or major gaps. Do not summarize by total screen coverage unless explicit promoted/wireframe artifacts make that meaningful.
