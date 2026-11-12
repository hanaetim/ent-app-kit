---
name: kit-backend-engineering
description: "Enterprise App Kit backend engineering baseline for production-shaped backend repos across stacks. Use when planning, building, changing, reviewing, or validating backend shippability, including plain-language asks like \"is this production-ready?\", \"review this API PR\", \"set up backend tests/CI\", \"add auth\", \"wire the real queue/database\", \"replace mocks\", \"this service looks hacky\", or \"prove this agent/tool workflow is safe.\" Covers APIs, services, workers, agent runtimes, persistence, migrations, integrations, auth/authz, security/privacy, observability, release safety, tests, and backend conformance evidence without prescribing a framework."
---

# Kit Backend Engineering

## Scale First

Apply only the baseline items relevant to the touched risk surface. For narrow fixes, preserve the existing backend shape and prove the changed behavior through the cheapest reliable test or evidence. For greenfield, production-facing, security-sensitive, durable-state, async, cross-service, or agent/tool work, require stronger shape and evidence before calling the work complete.

## Baseline

### Shape And Contracts

- Respect brownfield conventions unless they block correctness or maintainability.
- For greenfield repos, create the stack's normal harness before feature work: install, start, test, lint/static analysis, typecheck/compile when normal, migrate/validate schema when persistence exists, and seed/bootstrap when demo data is needed.
- Name the concrete backend shape before implementing: modules/packages, responsibilities, entrypoints, call paths, persistence boundary, integration boundary, config boundary, and test coverage.
- Make domain/module boundaries enforceable where drift is likely: define dependency direction, keep shared code thin, and add stack-native boundary checks when available.
- Keep core workflow/domain behavior outside routes, controllers, jobs, workers, and serverless handlers.
- For public or cross-service APIs, keep a versioned machine-readable contract where the stack supports it, and define validation, authn/authz, compatibility, breaking-change, deprecation, pagination/order/filter, and idempotency rules.
- Put providers, tools, SDKs, queues, databases, and external APIs behind stack-appropriate adapters or ports; fakes/mocks must follow the same contract shape.

### Runtime Safety

- Validate required runtime configuration before serving or processing work.
- Prefer domain-readable names for app-owned environment variables and config keys; keep opaque source IDs in adapter metadata, readiness, audit/traces, and conformance unless an external contract requires the raw ID as the config key.
- For security-sensitive paths, name abuse cases and enforce object ownership, input/property allow-lists, rate/resource limits, sensitive-data redaction, secrets hygiene, and stack-native dependency/security checks.

### State, Async, And Operations

- Use durable persistence and migrations when durable state is in scope; enforce datastore invariants, indexes, transaction/concurrency boundaries, migration ordering, backfill, and rollback/roll-forward where risk warrants it.
- Add structured errors, bounded retries with backoff/jitter, overload controls, audit/events, correlated logs/metrics/traces, readiness/health semantics, and operator diagnostics where the product or enterprise context requires them.
- For async, queue, and cross-service workflows, make delivery/consistency guarantees explicit: idempotency, deduplication, ordering, outbox/saga/compensation, and replay behavior where applicable.
- For production-facing changes, name rollout gates, rollback or roll-forward path, feature-flag owner/removal plan, migration ordering, and operator handoff.
- For agentic workflows, persist run/job state, correlation/provenance IDs, cancel/resume behavior, idempotency keys, redacted model/tool provenance, and approval gates for sensitive tools.

### Verification

- Choose the cheapest test level that proves the risk, keep test data deterministic and isolated, and route seed/demo data through application write paths instead of bypassing runtime behavior.
- Keep maintainer docs aligned with the actual local commands.

## Stack Translation Examples

Translate the baseline into the repo's selected stack. These are examples of equivalent proof, not preferred stacks or required tools:

| Backend shape | Equivalent production harness |
| --- | --- |
| Greenfield API/service | Stack-normal package manager, project structure, app entrypoint, config validation, test runner, static analysis/typecheck/compile where normal, migrations when durable state exists, and local install/start/test/lint commands before feature work. |
| Brownfield API/service | Preserve established framework, commands, layout, dependency boundaries, and test tools when they provide equivalent proof; close concrete gaps instead of replacing the stack for preference. |
| Typed HTTP/gRPC API | Versioned contract such as OpenAPI, GraphQL schema, protobuf, or typed router; generated/stub checks where used; compatibility/breaking-change evidence; request/response/error/auth coverage through real routing. |
| Worker/queue service | Real enqueue/dequeue or consumer entrypoint, message schema/versioning, idempotency, retry/backoff, DLQ/failure handling, ordering/concurrency assumptions, and job lifecycle observability. |
| Serverless/backend function | Thin handler, shared services/adapters, provider event fixtures, config/auth validation, timeout/retry/runtime limits, local/integration invocation evidence, and deploy/rollback config. |
| Agent/tool backend | Persisted run state, tool contracts, approval gates, idempotency keys, cancellation/resume, redacted provenance, representative failure traces/evals, and replay behavior. |

If a stack lacks a direct category, document the nearest stack-native equivalent and residual risk. Tool inconvenience is not enough reason to omit proof.

## Evidence

For the touched risk surface, backend work is complete when evidence shows that:

- local install/start/test/lint/typecheck/migration/seed commands pass or deferrals are explicit
- runtime entrypoints call the same services, adapters, contracts, and persistence paths tested by the suite
- external provider/tool/database/queue boundaries have contract or error-path coverage
- API/security-critical paths cover contract drift, validation, authorization, structured errors, abuse cases, and privacy-safe evidence
- CI runs the documented verification commands and records exact commands, profile/environment, exit status, and intentional deferrals
- observability and release evidence covers emitted telemetry, probe behavior, contract/migration checks, rollback triggers, flag state, and runbook/operator impact where applicable
- agent/model changes include trace/eval or safety evidence for representative failures, prompt-injection/tool-misuse cases, retries, and replay/resume paths
- config validation fails clearly for missing required settings
- README/Taskfile/package scripts match reality

## Reject

Treat these as failures unless the user explicitly accepts the tradeoff:

- vague "layered" or "production-ready" claims without concrete modules and call paths
- core logic embedded directly in transport handlers or jobs
- tests, fixtures, mocks, or seed scripts bypassing runtime contracts
- missing validation or authorization on user-controlled data/object access
- unbounded external calls without timeout, retry, overload, or error strategy
- "exactly-once", ordering, atomic cross-service writes, or race-free updates claimed without platform guarantees, idempotency, deduplication, or compensation
- irreversible deploys, incompatible migrations, or permanent feature flags without operational ownership and recovery path
- compliance claims without mapped controls, evidence, scope, owner, and explicit deferrals
- production-like config silently selecting mocks, in-memory stores, or demo modes
- ad hoc JSON/files/globals/in-memory maps used as durable state without explicit justification
- unclear schema, migration, transaction, auth, or audit ownership

## Planning And Review

When planning backend work, make the applicable backend baseline acceptance criteria, not an optional checklist.

For non-trivial plans or reviews, name:

- selected stack, runtime, package manager, and repo-local commands conformance will run
- source/module plan, ownership boundaries, entrypoints, runtime call paths, and production caller paths
- API/contract, domain, persistence, integration, config, authz/privacy, observability, and release decisions in scope
- migration/seed/backfill approach, fake-vs-real adapter boundaries, and risk-specific validation plan
- explicit deferrals with owner, reason, residual risk, and follow-up trigger

When reviewing completed work, inspect structure, runtime wiring, and command/risk evidence against the plan. Passing tests are necessary but not sufficient if backend shape is unclear, bypasses production paths, or cannot absorb later enterprise slices.
