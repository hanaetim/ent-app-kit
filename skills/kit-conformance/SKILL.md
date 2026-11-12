---
name: kit-conformance
description: Run an Enterprise App Kit final conformance sweep after implementation, convergence, or framework emission. Audit the delivered app against payload/source truth and runtime evidence, produce a remediation report, and do not edit app code.
---

# Kit Conformance

Conformance is the independent final sweep. It treats method artifacts as evidence, not authority, and audits the composed app against App Kit source truth before completion is claimed.

Run this as a report-only pass, preferably in a fresh subagent so it is not biased by the implementation thread. Write only the final conformance report; do not edit app code, specs, docs, or configuration from this skill.

## Inputs

Read only what is needed to judge conformance. Use the expected App Kit locations when present, but
let workspace state, repo documentation, method artifacts, and the user task determine the actual
paths in scope:

- source truth, usually `ent-app-kit/payload/`
- delivery evidence, usually `specs/product-delivery-slices.md` and slice specs/plans/tasks
- applicable pitfall registry entries and their recorded dispositions
- changed or in-scope repos, including route maps, runtime wiring, tests, config examples, README files, and validation reports
- `out/` and `.kit-state/` evidence from method, startup, browser, conformance, NFR, or deployment phases

## Sweep

First define the review boundary from the change type, user task, source requirements, changed files,
and available evidence. Use `.kit-state/state.yaml`, repo-local documentation, method artifacts, and
runtime evidence to identify the in-scope repos, workflows, entry points, data paths, UI surfaces,
and contracts. Do not assume a particular repository layout, language, package manager, or command
set. When evidence is missing for a material claim, report `needs-user-decision` or `must-fix`
depending on impact; never treat an unknown stack, missing command, or unrecognized repo shape as a
pass.

Look for generic completion risks:

- missed or invented payload scope, including slices, screens, workflows, states, integrations, and acceptance criteria
- method artifacts that weakened source requirements or used generated tasks as authority
- delivery artifacts, slice names, diagnostics, or evidence exposed as product UI without a real workflow
- hidden, hard-coded, or over-dominant mock/deferred/readiness/status disclosure
- unwired code, shallow integrations, status-only adapters, dead routes, duplicate primary destinations, or fake-distinct views
- missing startup/seeding proof, browser/runtime proof, accessibility proof, README accuracy, or config/env documentation
- agentic/MCP/tool/HITL/audit behavior that is claimed but not exercised through production paths
- conformance-relevant security or performance claims without evidence, such as authorization, team/data isolation, secret handling, destructive action safety, idempotency, backpressure, latency, or large-data behavior
- test failures, unrun required checks, placeholder reports, stale deferred copy, or unsupported "flake/pre-existing" claims

### Conformance Evidence To Check

Use these proof areas as an audit matrix, not a fixed universal script. Scope each one to the
changed or source-required surfaces and use the repo's own documented commands, entry points, and
contracts.

- **Build/run proof:** the in-scope runtime surfaces can be built and started through the repo's
  documented or established commands. Unit tests alone are not enough when the deliverable is a
  running service, app, worker, CLI, or UI.
- **Runtime reachability:** implemented workflows are reachable through real product entry points
  such as routes, UI actions, CLIs, jobs, queue consumers, agents, or MCP tools; code exercised only
  by tests is not deployed behavior.
- **Store consistency:** producers and consumers for the same logical data use the same backing
  store, schema, key space, event stream, or contract. Flag split-brain state where writers and
  readers silently diverge.
- **Invariant wiring:** declared validators, guards, state machines, permission checks, policy
  rules, and integration selectors are invoked on the mutation/action paths they are meant to
  protect.
- **Acceptance effects:** stateful acceptance criteria are proven by observed effects, downstream
  behavior, persisted state, emitted events, or API responses; labels, mocked status, or static copy
  are not sufficient.
- **Frontend deliverability:** user-facing changes build, render in the app shell, route correctly,
  fetch or mutate the intended runtime data, and handle loading, empty, error, permission, and
  responsive states that matter for the source requirements.

### UI Surface Wiring

When user-facing UI exists, perform a risk-based route/control wiring audit before judging UI completion. Do not try to exhaustively inspect every repeated control in a large app. Prioritize:

- primary navigation destinations and route groups
- payload-required screens, workflows, and acceptance surfaces
- readiness, audit, status, evidence, integration, HITL, admin, and operational surfaces
- high-impact workflow actions
- newly implemented or changed routes
- controls whose labels imply distinct data, state, or behavior

Build a concise matrix for audited surfaces. For each item, identify:

- visible label
- route/hash/path/state key
- rendered component/view
- expected product purpose from payload/UI contracts
- backend/API/runtime dependency, if any
- unique rendered evidence expected after activation

Flag `must-fix` when:

- advertised destinations render the same component/content without an explicit route-specific branch or approved reason
- clicking a nav item/tab changes only URL/hash/active styling/chrome
- readiness/status/audit/evidence panels do not fetch, refresh, or display the corresponding runtime state they claim
- action buttons update UI copy without invoking the production API/workflow path
- tests only assert controls exist, not that activation changes content, data, or behavior

Static source inspection is often enough to prove a wiring defect or to clear low-risk static surfaces. Run or inspect browser/runtime checks when a material UI claim depends on rendered behavior, routing, async state, API calls, permissions, HITL actions, audit/readiness/status freshness, or when static inspection cannot prove the production path. For large apps, record the sampling basis and any unaudited low-risk areas; do not claim full UI conformance if primary flows, source-required screens, or high-risk operational surfaces were not checked.

### Defect-Oriented Code Review Pass

Use a targeted read-only code review pass when conformance sees UI routes, workflow actions, readiness/status surfaces, integration selectors, agent/tool registries, or audit/HITL paths. This is not a style review and not a diff-only review: judge against payload and runtime behavior, even for greenfield or untracked repos.

Look for concrete product defects:

- advertised UI destinations or workflow actions that are fake-distinct or unwired
- production callers missing for code claimed as implemented
- selectors/readiness/status claims that do not match the actual adapter or provider wired
- security, permission, tenancy, secret-handling, destructive-action, idempotency, or performance paths whose implementation does not match source-required or user-visible claims
- tests that validate scaffolding, generated tasks, or static copy rather than the required behavior
- source-deferred capabilities leaking into active UI/readiness as available functionality

For each suspected defect, confirm the source expectation, the failing call path, and why existing evidence/tests do not prove it. If useful, delegate an independent review by reference to a review-oriented skill, but do not let diff-only review rules narrow conformance scope.

Run lightweight inspections first, then run documented repo-local validation commands when needed to prove build, startup, runtime reachability, browser behavior, seeding, or acceptance effects. Normal local validation side effects are allowed when scoped to the workspace or documented disposable development resources. Ask before touching production, shared infrastructure, external services, non-disposable data stores, credentials, destructive resources, or paths outside the workspace. Record commands and results; if required runtime proof cannot be run safely, report the gap instead of passing.

## Report

Write `out/conformance/final-sweep.md` with the following shape. Include the UI matrix when
user-facing UI is in scope; otherwise record why it is not applicable under Non-Applicable Checks.

```md
# Final Conformance Sweep

Status: pass | must-fix | needs-user-decision

## Evidence Read
- ...

## Findings
| Severity | Area | Finding | Evidence | Required action |
| --- | --- | --- | --- | --- |

## UI Surface Wiring Matrix (if applicable)
| Label | Route/control | Expected behavior | Actual component/API | Evidence checked | Result |
| --- | --- | --- | --- | --- | --- |

## Non-Applicable Checks
- ...

## Commands Run
- ...
```

Use severities:

- `must-fix`: source contradiction, broken runtime path, missing required behavior, false UI/status claim, or unverified critical integration
- `needs-user-decision`: real scope ambiguity, proposed deferral, or source conflict
- `accepted-risk`: limitation already approved by the user and honestly represented. This can still be a `pass`; unapproved risks must stay `needs-user-decision` or `must-fix`.
- `non-applicable`: checked and not relevant for this app
