# UI Context

Write `.kit-state/ui-context.md` to this shape. Regenerate it whole each run.

This report is a UI-context inventory, not a complete screen inventory. Product slicing and the selected SDD method own exact screen discovery.

## Earning a row

A source earns a row if it establishes UI direction, UI constraints, or useful inspiration: design systems, component libraries, brand/tokens, typography, wireframes, screenshots, promoted screens, visual references, interaction patterns, existing frontend conventions, UI-relevant stack constraints, or explicit visual/design constraints.

A file that only says what data a screen shows, which fields exist, or what a control is called does not become a visual-direction source. It may still establish a binding component/library or interaction constraint if it names one explicitly.

**"No sources found" is a valid, useful report.** Do not pad it to look diligent.

---

# UI Context

Scanned: <date>

## Scan Scope

What locations were scanned:

- Payload UI/design sources:
- UI-bearing payload files:
- Existing frontend repos:
- Prior UI concept lab outputs:
- External/user-provided authorities:

Do not use this report as a complete screen inventory. Product slicing / SDD owns exact screen discovery.

## Source Inventory

### Binding UI Inputs

| Source | Type | What it establishes | Evidence |
|---|---|---|---|
| `<path>` | design system / component library / brand / tokens / wireframe / screenshot / promoted screen / visual reference / interaction pattern / other | <truth> | <path, selector, section, frame, or note> |

### Optional Inspiration

| Source | Type | Useful quality | Evidence |
|---|---|---|---|
| `<path-or-url>` | screenshot / URL / product / deck / mockup / other | <quality to borrow> | <path, URL, or note> |

### External / User-Provided Authorities

| Source | How provided | Binding or inspirational | Explicit coverage | Evidence |
|---|---|---|---|---|
| `<figma-mcp | URL | folder | file | screenshot | existing app | other>` | <how it was supplied> | binding / inspiration / unclear | <explicit scope only> | <path, URL, MCP resource, screenshot, or note> |

### Existing Frontend Conventions

| Source | What exists | Notes |
|---|---|---|
| `<path>` | tokens / theme / components / layout / interaction pattern | <notes> |

### Promoted Screen Precedents

| Source | Surface / scope explicitly covered | Notes |
|---|---|---|
| `<path>` | <explicit surface/scope, not inferred inventory> | <notes> |

## Resolved UI Context

- Frontend stack:
- Component library / design system:
- Brand / tokens:
- Typography:
- Interaction model:
- Density / complexity:
- Accessibility / responsive constraints:
- Promoted screen precedents:
- External/user-provided design authorities:

## Unknowns And Gaps

- Missing accepted visual direction:
- Missing brand/token guidance:
- Missing layout precedent:
- Missing component guidance:
- External authority unclear or inaccessible:
- Conflicts:
- Left to product slicing / SDD:

## Downstream Handling

- Preserve as binding:
- Treat as optional inspiration:
- Requires user approval to substitute:
- UI concept lab should resolve:
- Product slicing / SDD should resolve:

## Conflicts

Sources that disagree, with paths and a one-line disagreement. Do not resolve them.
