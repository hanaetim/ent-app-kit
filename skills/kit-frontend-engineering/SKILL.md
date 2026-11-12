---
name: kit-frontend-engineering
description: "Enterprise App Kit frontend engineering baseline for production-shaped frontend repos, any framework (React, Vue, Angular, Next.js, server-rendered, etc.) — requires equivalent build/test/lint/a11y/e2e coverage rather than one fixed toolchain. Use whenever building, changing, reviewing, or auditing a frontend repo's shippability, even in plain language without tool names: add tests, production-ready review, build/lint setup, frontend PR review, real API wiring, accessibility checks, or hacky/not-done frontend concerns. Not for visual language or design fidelity — use kit-ui-context / kit-ui-design for those."
---

# Kit Frontend Engineering

**Goal: ensure App Kit frontend repos are enterprise-grade, shippable application frontends — not visual-only shells, helper-tested prototypes, or manually verified demos.**

This skill owns frontend implementation and deliverability mechanics. It does not decide UI direction, visual language, interaction model, or design-source authority. Use the `kit-ui-context` skill for accepted UI inputs and the `kit-ui-design` skill for UI quality/fidelity.

## Engineering Baseline

For any greenfield frontend repo, or any materially changed frontend repo, establish the framework's normal enterprise harness. Do not mandate one toolchain; require equivalent coverage for the stack.

The repo must expose conformance-readable local commands for:

- dependency install or bootstrap
- production build
- test suite
- lint or static analysis
- typecheck or framework static correctness when normal for the stack
- browser, end-to-end, or rendered workflow validation when the UI is meaningful
- executable accessibility checks where practical
- local start or preview

The repo must also have:

- a selected frontend stack and component-package strategy that follows payload/UI context, existing repo convention, or the stack's normal enterprise default
- committed build/test configuration when the stack normally uses it
- rendered component or DOM behavior tests, not only pure helper tests
- browser validation that exercises real rendered states and frontend/backend wiring
- environment/config handling for API base URLs, modes, feature flags, and mock/real boundaries
- engineering proof that UI states required by the `kit-ui-design` skill are wired to runtime state, not static mock branches
- actual production UI/component-library packages when payload or UI context names them, unless the user approves a substitution
- repo-local task docs for install, start, test, build, browser validation, and required environment variables

Static HTML/CSS mimicry is acceptable for kit-ui-concept-lab artifacts only. Production frontend code must use real framework and component packages, or record an approved substitution with scope, reason, and validation evidence.

## Equivalence Examples

Use the repo/framework convention. These examples are defaults, not universal law:

| Stack | Expected equivalent harness |
| --- | --- |
| React + Vite | TypeScript when reasonable, committed Vite config, Vitest or Jest with Testing Library/jsdom, Playwright or Cypress, axe or equivalent, ESLint/Oxlint or equivalent, scripts for build/test/lint/browser validation. |
| React + Next.js | `next build`, TypeScript when reasonable, Jest/Vitest with Testing Library, Playwright or Cypress, axe or equivalent, framework lint/static checks, env contract for server/client boundaries. |
| Vue + Vite | TypeScript when reasonable, Vite config, Vitest with Vue Testing Library or equivalent, Playwright or Cypress, axe or equivalent, framework lint/static checks. |
| Angular | Angular CLI build/test, strict template/type checks where appropriate, component harnesses, Playwright or Cypress for workflows, axe or equivalent. |
| Server-rendered UI | Framework build/check command, template/component tests where available, browser smoke/workflow checks, axe or equivalent, explicit env/API/session wiring. |
| Existing brownfield repo | Preserve established tools if they provide equivalent coverage. Improve gaps instead of replacing the stack for style preference. |

If the chosen stack lacks one category, document the nearest equivalent and the residual risk. "The tool is inconvenient" is not a reason to omit coverage.

## Failure Conditions

Treat these as frontend engineering failures unless the user explicitly approves a deferral:

- no production build script or equivalent shippable build command
- tests pass but the production build fails
- production compilation includes test/browser files and breaks or hides type errors
- only pure helper tests exist for a UI-bearing repo
- no rendered browser path verifies the main UI workflow
- browser tests require an undocumented manually started server
- accessibility is asserted only by source review when an executable check is practical
- a named production component library is mimicked with local CSS instead of installed/used
- frontend/backend paths, env vars, CORS assumptions, or error envelopes are inconsistent
- mock data is hard-coded in the UI where runtime API data is required
- scripts in README, Taskfile, and `package.json` disagree

## Planning And Review

When a method adapter plans a frontend implementation, ensure its artifacts include the applicable engineering baseline as acceptance criteria. For UI-bearing frontend work, planning should name:

- selected frontend stack and package manager
- selected component package strategy: named payload package, existing convention, stack default, or approved substitution
- repo-local commands that conformance can run
- build/typecheck/lint/test/browser/a11y strategy
- component-library package commitments or approved substitutions
- frontend/backend API and environment contract
- runtime wiring coverage and browser validation evidence

When reviewing completed work, run or inspect the repo-local commands. Passing unit tests are necessary but never sufficient evidence for a shippable frontend.
