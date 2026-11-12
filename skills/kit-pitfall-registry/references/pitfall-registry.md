# Pitfall Registry

Canonical list of checkable failure patterns. Each entry is a defect class observed in real
builds, written so it can be *verified*, not just agreed with.

Each entry carries an `Applies to:` facet naming the product traits that make it relevant (`always | web-ui | integrations | multi-repo | agentic | auth | greenfield | method-workflow`).

---

### PIT-001: Integration depth

Applies to: integrations.
Do not confuse "installed SDK" with "implemented integration". A source-required provider is
incomplete unless application control flow can call it, parse its response, handle failures,
and prove that path with tests. Generated tasks may not downgrade real integration to config,
status flags, stubs, or deterministic fallback.
Check: for each source-required integration, name the production call site (file:line) and the
tests covering invocation, response parsing, and error paths. Evidence: file:line + test names.

### PIT-002: Source fidelity

Applies to: always.
Do not let generated specs, plans, or tasks narrow or erase explicit source requirements.
Before implementation, compare the current plan against the original user-provided artifacts.
If a source artifact requires a dependency, architecture pattern, runtime, model, integration
boundary, or quality bar, preserve it unless the user explicitly changes scope. Generated task
lists are not the authority when they conflict with source artifacts.
Check: compare the current plan against the original source artifacts; list every source
obligation the plan drops or weakens. Evidence: the comparison list (empty is a valid result).

### PIT-003: Method shortcuts

Applies to: method-workflow.
Do not shortcut the selected `kit-method-*` workflow.
Do not implement directly in the main session, skip subagents, merge phases, or treat existing
`spec.md`, `plan.md`, or `tasks.md` files as proof of completion unless the method explicitly
allows it.
Check: the method's progress record (ledger, phase log) shows every prescribed phase executed
for every unit of work. Evidence: the progress record itself.

### PIT-004: README drift

Applies to: always.
Editing `README.md` once per task degrades it into a delivery log. Revise it as a coherent
product doc each time, never append a slice-dated section. No phase names, delivery notes, or
task evidence.
Check: at final convergence, re-read every README whole and rewrite if it reads as a log, not
documentation. Evidence: reviewer's verdict per README.

### PIT-005: Browser runtime validation

Applies to: web-ui.
For frontend-to-backend apps, do not rely on `curl` alone. Verify the browser path: correct
API base URL, CORS headers, and rendered data/error state.
Check: drive the app with a real (headless) browser from a clean start; confirm cross-origin
requests succeed and real data renders. Evidence: script output or screenshot.

### PIT-006: Startup and seeding

Applies to: greenfield.
Do not treat an app as complete unless it can be started from a clean checkout with explicit,
idempotent demo data. Startup and seed behavior must follow `kit-app-startup-seeding`; the
pitfall is claiming completion from docs, partial commands, or services that only work in the
builder's current shell.
Check: apply `kit-app-startup-seeding` and run its completion checklist for the app's selected
runtime profile. Evidence: command transcripts plus rendered or exercised seeded data.


### PIT-007: Unowned cross-cutting scope

Applies to: always.
A requirement spanning multiple units of work (slices, features, teams) ends up built by no
one because each part assumes another owns it — or one unit silently drops scope assigned to
it without recording a deviation. Mutual disclaim ("owned by X" ↔ "owned by Y") is the
tell-tale signature.
Check: every cross-cutting requirement names exactly one accountable owner, and any "owned
elsewhere" claim is verified against the named owner's actual scope. Evidence: the ownership
map with no orphaned or doubly-disclaimed rows.

### PIT-008: Design fidelity

Applies to: web-ui.
UI screens get built from a spec's *description* of a design and never compared against the
actual source design artifacts (wireframes, mockups, brand files). Each screen nominally
exists but drifts from what the artifacts specify; tokens and accessibility checks alone do
not catch layout/structure/interaction drift.
Check: for each screen with a source design artifact, produce a region-by-region mapping
(artifact region → implemented component) with side-by-side screenshots; deviations need a
recorded reason. Evidence: the mapping table + screenshots.

### PIT-009: Cold-start user journey

Applies to: web-ui, auth.
A capability (most often auth) is built as infrastructure — token issuance, helpers, session
plumbing — with no user-reachable entry point. Tests pass because they inject credentials
directly; a real first-time user hits a dead end.
Check: as an unauthenticated first-time visitor, reach real data using only the UI and
documented steps — no devtools, no manual token injection. Evidence: the click path or a
scripted browser run.

### PIT-010: Unwired code

Applies to: always.
A function or service is fully implemented and unit-tested but nothing in the production code
path ever invokes it — a dead end that looks done by every test metric.
Check: for every new function/service, name the production caller (file:line). Tests do not
count as callers. Evidence: file:line, or the gap.

### PIT-011: Unverified failure claims

Applies to: always.
A test failure gets dismissed as "flake", "pre-existing", or "passes in isolation" and
accepted on the claimant's word. Such claims are frequently wrong — the failure is masked by
a mock, or newly exposed by the very change under review.
Check: independently reproduce the claim before accepting it — rerun the suite, run the test
in isolation, bisect against the change if needed. Evidence: the reproduction transcript.

### PIT-012: Prescribed-skill bypass

Applies to: method-workflow.
Do not let a required skill/workstream become a prose claim. If a workflow mandates a skill,
it must leave checkable evidence, not just say it was applied.
Check: each mandated skill produces a named artifact or transcript, and at least one claim is
spot-checked against independent evidence such as rendered output, command logs, or computed
values. Evidence: artifact paths plus the reproduced spot-check.

### PIT-013: Stale placeholders

Applies to: web-ui, method-workflow.
Do not leave placeholder, stub, or deferred-scope UI/copy in place after the workflow it
describes has been implemented. Earlier-slice placeholders must be replaced or removed when
later slices make the capability real.
Check: for every implemented slice, search routed UI, tests, docs, and HTML comments for
placeholder/deferred language tied to that slice's domain, then open the relevant routes in a
browser. Evidence: reviewed search hits plus route verdicts showing real data/actions or a
truthful current-data empty state.

 ### PIT-014: Duplicated primary navigation

Applies to: web-ui.
Do not expose the same primary destinations through multiple persistent navigation models,
such as both a header nav and sidebar. Secondary header actions are fine, but primary routing
must have one clear owner. Also do not expose multiple primary nav items that resolve to the
same route, component, or main view unless they intentionally deep-link to distinct focused
sections.
Check: inspect the rendered shell and route code; each primary destination appears in one
persistent nav model, and every nav control changes the active view or a distinct focused
section. Evidence: route/nav map plus browser verdict.

### PIT-015: Delivery artifact and diagnostics UI leakage

Applies to: web-ui.
Do not expose source headings, slice names, setup/scaffold terms, diagnostics, readiness,
mock/deferred status, or audit proof as product routes, tabs, page titles, or nav labels
unless they are real user/operator workflows. Truthful mock/deferred/service status must be
available, but keep it proportionate: use the lightest fitting UI pattern, such as a badge,
popover, drawer, inline state, collapsible detail, contextual evidence panel, or role-gated
operations/audit page.
Check: inspect the surface map and rendered shell. Primary routes/tabs map to distinct user
jobs, workflow states, data/action contracts, or approved operator workflows; status/evidence
is available without becoming a fake primary destination or occupying primary workspace
attention by default. Evidence: surface map plus browser route verdict.
