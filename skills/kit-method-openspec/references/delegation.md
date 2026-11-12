# OpenSpec Delegation Contract

Subagent-worker prompts must stay at operation intent altitude. The default pattern is a short operation prompt plus rich durable context in `openspec/config.yaml`, slice records, payload artifacts, and existing OpenSpec artifacts. Long subagent-worker prompts are risky here because they can become a competing source of truth, drift per slice, and encourage operation chaining.

## Grammar

```text
<openspec-skill-name> <change-name> — <short intent>
Relevant skills: <skill-name>, <skill-name>.
```

Operation first. No role assignment, no "invoke the Skill tool with...", no operation explanation. `Relevant skills:` is optional and may name skills only.

Valid simple-workflow shapes:

```text
openspec-explore <change> — <question or ambiguity>
openspec-propose <change> — <slice capability> per specs/product-delivery-slices.md slice <slice-id>
openspec-update-change <change> — <one actual orchestrator review finding to fix>
openspec-apply-change <change>
openspec-sync-specs <change>
openspec-archive-change <change>
```

For apply/sync/archive, the change name is enough. Never send multiple operation lines in one subagent-worker prompt.

## Context Placement

- Subagent-worker prompt: operation, change name, one slice-intent line, optional `Relevant skills:`.
- `openspec/config.yaml`: standing gates, repo routing, payload binding, design authority, integration fidelity, validation expectations.
- Source/OpenSpec artifacts: requirements, contracts, design details, task lists, implementation evidence.
- `openspec-update-change` prompt: one actual orchestrator review finding, not a full corrected design.

## Pre-Delegation Checklist

- [ ] Exactly one OpenSpec operation.
- [ ] Starts with `<openspec-skill-name> <change-name>`.
- [ ] No propose -> apply -> archive chaining.
- [ ] No file tree, task list, artifact contents, validation checklist, payload paraphrase, report template, or absolute path.
- [ ] Standing context lives in `openspec/config.yaml`, not this prompt.
- [ ] Extra App Kit guidance is only a `Relevant skills:` line.
- [ ] Every sentence passes the three-class test.

## Three-Class Test

1. **Tool owns it - delete.** Operation procedure, artifact paths, task loop, report format. OpenSpec status/instructions resolve these.
2. **Project owns it - move to `openspec/config.yaml`.** Repo routing, payload binding, design-source authority, integration fidelity, validation commands, per-artifact rules.
3. **This slice and operation own it - keep.** Change name, one slice/capability line pointing to the slice record, or one actual review finding for update.

Shortening without relocating class-2 content loses gates. Do both.

## Examples

Correct:

```text
openspec-propose cash-app-runtime-s001 — walking skeleton for the AR Cash Application MVP per specs/product-delivery-slices.md slice cash-app-runtime-s001
Relevant skills: kit-backend-engineering, kit-app-startup-seeding, kit-frontend-engineering.
```

```text
openspec-apply-change cash-app-runtime-s001
```

```text
openspec-update-change cash-app-runtime-s001 — tasks.md omits fake-client error-path coverage for required MCP tool adapters
```

Wrong - batches operations:

```text
openspec-apply-change cash-app-runtime-s001
openspec-sync-specs cash-app-runtime-s001
openspec-archive-change cash-app-runtime-s001
```

Wrong - turns the prompt into the spec:

```text
Run the full OpenSpec workflow propose -> apply -> archive for cash-app-runtime-s001.
Read ent-app-kit/payload/data-contracts.md and mcp-tool-register.md.
tasks.md must include:
1. Init repos/backend
2. Write domain/entities.py
3. Write SQLAlchemy models
Run pytest and tsc. Report every file created.
```

These fail because the prompt becomes the operative spec; payload/config degrade to citations, and omitted details never reach artifacts or implementation.

## Reject If

- Restates payload requirements instead of pointing to the slice record.
- Names absolute paths or concrete OpenSpec artifact paths.
- Uses `openspec-new-change`, `openspec-continue-change`, `openspec-ff-change`, or `openspec-verify-change`.
- Lists implementation files, task numbers, validation output, or report requirements.
- Materially differs in length from same-operation prompts for other slices.
