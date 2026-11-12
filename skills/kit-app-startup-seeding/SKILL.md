---
name: kit-app-startup-seeding
description: Cross-platform startup and seeding standard for generated and existing applications. Use when creating, modifying, migrating, or validating greenfield or brownfield apps, multi-repo apps, local development workflows, demo-data flows, root/repo task commands, clean-checkout startup, service orchestration, migrations, seeds, dependency setup, or final user-facing validation. Ensures repo-local commands plus one root command start the full app, with explicit idempotent seeding and no mandatory Docker unless selected by payload, user, or dependency graph.
---

# App Startup & Seeding

Use this skill to make apps runnable from a clean checkout without hard-coding one runtime model. Standardize the user-facing command contract; let payload, stack, and existing repo conventions decide the implementation.

## Discover First

For brownfield, migration, or enhancement work, inspect and preserve the current startup contract before adding commands: README/CONTRIBUTING, CI, package scripts, Taskfiles, justfiles, Gradle/Maven wrappers, .NET solutions, workspace runners, Docker/Compose files, seed/migration scripts, and env conventions.

Prefer additive wrappers over replacements. Existing documented commands must keep working unless the user explicitly approves a breaking change. For partial brownfield work, validate the commands touched plus the relevant user workflow, and report pre-existing startup gaps separately.

## Core Outcome

Deliver both:

- **Repo-local commands** for each independently runnable repo or service.
- **One root command** that starts the full user-facing app and required local services.

For greenfield apps, prefer **Taskfile** as the cross-platform facade unless payload/user selects another tool. Task tasks may delegate to npm, pnpm, uv, Gradle, Maven, Cargo, .NET, framework CLIs, Docker Compose, or other native tooling.

## Required Capabilities

Use these command names unless the existing project has a strong established convention. In brownfield projects, map to existing commands first and add aliases only when useful.

- `bootstrap`: prepare or verify local prerequisites without overwriting user config.
- `install`: install dependencies; may be an alias of `bootstrap`.
- `start`: start the current repo/service only; never seed.
- `seed`: write development/demo data explicitly, idempotently, through the real application write path.
- `test`, `lint`, `validate`: run checks for the current scope.

For multi-service apps, add root-level capabilities:

- `up`: start the full app: frontend, backend, workers, MCP servers, local databases, queues, or other required services.
- `down`: stop services started by `up`, where applicable.
- `migrate`: apply schema/reference setup, where applicable.
- `reset`: destructively recreate local development state and reseed, where applicable.
- `doctor` or `health`: verify tools, ports, config, dependencies, credentials, and readiness, where useful.

## Runtime & Dependencies

Do not force Docker or any other environment tool by default.

- Use **native** startup when the app can run with local language/runtime prerequisites.
- Use **Docker Compose** only when selected by payload/user, when dependency complexity justifies it, or as an optional profile.
- Use **external** profiles when local services point at managed databases, APIs, or shared dev infrastructure.
- Use Kubernetes/Tilt/Skaffold only when the payload or target architecture is Kubernetes-native.

`bootstrap` must prepare or verify what the selected profile needs: virtualenv/uv for Python, npm/pnpm/yarn for Node, Gradle/Maven for JVM, .NET SDK, Cargo, local emulators, databases, queues, caches, object stores, search indexes, or managed-service access. Do not silently require undeclared local services; `doctor`, `bootstrap`, or startup must clearly report what is missing and how to provide it.

If multiple profiles exist, make the default explicit without relying on shell-specific env syntax:

```sh
task up
task up -- PROFILE=native
task up -- PROFILE=compose
```

## Root Composition

Keep each repo independently useful and make the root command compose them. Root tasks should delegate rather than reimplement.

```yaml
tasks:
  up:
    desc: Start the full local app
    cmds:
      - task --parallel start:backend start:frontend

  start:backend:
    dir: repos/backend
    cmds: [task start]

  start:frontend:
    dir: repos/frontend
    cmds: [task start]
```

For simple single-service apps, keep it simpler: repo-local commands plus root `up` as an alias are enough.

## Process Requirements

Full-app startup must be operable, not just documented prose.

- Start all services needed for implemented user-facing workflows.
- Use compatible ports/config and document a root port map when multiple services are involved.
- Use deterministic ports for full-app startup. `up` must not accept silent dev-server port fallback. If a configured port is busy, fail with diagnostics unless the user provided an explicit alternate port.
- Propagate explicit alternate ports through every dependent runtime setting before declaring readiness, including frontend URL, frontend API base URL, backend CORS allow-list, browser validation URL, logs, and shutdown tracking.
- Provide readiness checks for services depended on by another service or user workflow.
- Prefix or otherwise identify logs by service.
- Define shutdown behavior for services started by `up`.
- Avoid POSIX-only shell assumptions in required commands unless payload explicitly selects a POSIX-only environment.

`up` succeeds only when required services are started on the configured ports, readiness probes pass, browser-origin API access succeeds, the primary app URL/API is reachable, and logs identify each service. If a required service exits early, shifts port unexpectedly, fails frontend/backend API wiring, or readiness times out, `up` must fail with diagnostics and stop services it started where practical.

For long-running native multi-service startup, use a small checked-in portable orchestrator script when Taskfile alone would handle process supervision poorly. Prefer JavaScript/TypeScript or Python over shell-specific scripts when Windows support matters.

## Environment Configuration

Startup must not depend on undocumented manual environment setup.

- Each repo/service that needs env vars must provide committed example config using the repo's established convention, such as `.env.example`.
- `bootstrap` must create missing local config/env files from examples when safe, without overwriting user-owned files.
- Example config should include safe local defaults where possible. Required secrets or unavailable external services must fail with clear `doctor`, `health`, or startup errors.
- For multi-repo apps, root `bootstrap` must prepare or verify required local config for every repo while preserving repo-level ownership of integration config.

## Seeding & State

- `start` and repo-local service entrypoints must never seed.
- `seed` must be explicit, committed, idempotent, modular, and use real application services/repositories/APIs unless the app's write path is a migration/fixture loader.
- Seed only development/demo data. Reference or production-like schema state belongs in migrations or bootstrap.
- For demos, document whether `up` expects `seed` to have already run or invokes `seed` as a clearly named prerequisite. Do not hide mutation inside `start`.
- `reset` must be local-development scoped. It must not run against production, staging, shared, or external profiles unless the user explicitly approves that behavior. Destructive reset commands should require a clear confirmation flag where practical.

## Completion Checklist

Before marking user-facing work complete, verify from a clean checkout or clean local state:

- Repo-local `bootstrap`/`install`, `start`, `seed`, `test`, and `lint` work where applicable.
- Root `up` starts the full app with one command and has defined shutdown behavior.
- Required migrations and seeds produce reproducible demo data.
- The frontend or primary user surface visibly renders or exercises seeded data.
- Startup works on Windows, macOS, and Linux, or the payload-approved platform limitation is documented.
- Docker or other environment tooling is not mandatory unless selected by payload, user, or dependency graph.
- README or maintainer docs list exact commands, prerequisites, profiles, and legacy command compatibility where applicable.
