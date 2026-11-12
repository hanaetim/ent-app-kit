# Enterprise App Kit LLM Wiki Profile

Use this profile when the `kit-llm-wiki` skill is creating, maintaining, querying, or linting an Enterprise App Kit wiki.

The generic OKF rules still apply. This profile adds App Kit-specific folder guidance, page templates, metadata conventions, and lint checks.

## Source And Wiki Boundary

For Enterprise App Kit projects, keep immutable source material under the App Kit root's `payload/` directory and create the generated wiki beside the App Kit root, as a sibling directory:

```text
workspace/
  ent-app-kit/
    payload/
      blueprint.md
      design/
      repos.yaml
    kit-state/
      ...

  llm-wiki/
    index.md
    log.md
    agents/
    tools/
    controls/
    ...
```

Do not place the generated wiki inside `ent-app-kit/`:

```text
ent-app-kit/
  payload/
    blueprint.md
    design/
    repos.yaml
```

`llm-wiki/` is the OKF-compatible knowledge bundle. `ent-app-kit/payload/` is adjacent source material by workspace relationship, not by being in the same directory. Wiki pages cite payload files through `sources[].resource` and record App Kit-specific source locations under `appkit.source_locator`.

Do not duplicate the source blueprint wholesale. The wiki is a navigation and synthesis layer: it summarizes durable meaning, relationships, implementation implications, decisions, risks, and open questions, then points agents back to the source for exact truth.

## Preferred Wiki Folders

Use these folders when the source contains durable concepts for them:

- `agents/` - automation roles, blueprint agents, orchestration agents, deterministic engines.
- `tools/` - MCP tools, APIs, connectors, external capabilities, reusable services.
- `systems/` - systems of record, SaaS platforms, auth boundaries, integration constraints.
- `data/` - business entities, data products, schemas, fixtures, retention rules, state models.
- `controls/` - HITL rules, compliance gates, circuit breakers, audit obligations, policy constraints.
- `evals/` - functional, behavioral, adversarial, domain, acceptance, and operational validation.
- `operations/` - telemetry, dashboards, runbooks, support model, handover, continuous improvement.
- `decisions/` - scope selections, defaults, inferred values, repository topology rationale, implementation choices.
- `open-questions/` - unresolved ambiguity, missing source detail, stakeholder confirmation items.

Omit folders that do not apply. Do not create empty structure just to satisfy the profile.

## OKF-Compatible App Kit Frontmatter

Standard OKF fields keep their OKF shapes. App Kit-specific metadata lives under `appkit:`.

```yaml
---
type: Agent
title: Anomaly Detection Agent
description: Detects invoice fraud and anomaly patterns.
tags: [enterprise-app-kit, agent, fraud, red-zone]
status: draft
generated:
  by: codex/kit-llm-wiki
  at: 2026-07-30T00:00:00Z
sources:
  - id: blueprint
    resource: ../ent-app-kit/payload/blueprint.md
    title: Enterprise App Kit source blueprint
appkit:
  role: agent
  source_id: AGN4
  source_locator: "Phase 3.1 Agent Roster / AGN4"
  implementation_status: in_scope
  build_priority: mvp
---
```

Use `sources[].resource` for a real canonical source file or URL. Do not put shell commands, search queries, or generated inventory descriptions in `sources[].resource`. Use `appkit.source_locator` for blueprint sections, table rows, IDs, or other App Kit-specific locators.

## App Kit Content States

When a page contains implementation-facing decisions, make the content state explicit:

- `source-stated` - stated directly by the source blueprint.
- `user-decided` - selected by the user during elicitation or review.
- `inferred` - chosen by the wiki builder; mark the value with `[inferred]` on first mention.
- `deferred` - intentionally out of scope for the current build slice.
- `open-question` - unresolved and requires stakeholder confirmation.

Represent these states in prose, tables, or producer-defined `appkit:` fields. Do not imply a generated decision is source truth.

## Page Templates

### Agent Page

```markdown
# <Agent Name>

## Purpose
## Source Grounding
## Responsibilities
## Inputs And Outputs
## Tools
## Controls And HITL
## Implementation Relevance
## Related Pages
## Open Questions
```

### Tool Page

```markdown
# <Tool Name>

## Purpose
## Source Grounding
## Interface Summary
## Authentication And Constraints
## Used By
## Failure Modes
## Implementation Relevance
## Related Pages
```

### Control Page

```markdown
# <Control Name>

## Purpose
## Source Grounding
## Trigger
## Required Behavior
## Evidence / Audit Trail
## Related Agents And Tools
## Implementation Relevance
```

### System Page

```markdown
# <System Name>

## Purpose
## Source Grounding
## Integration Pattern
## Authentication And Constraints
## Data Exchanged
## Used By
## Implementation Relevance
## Related Pages
```

### Eval Page

```markdown
# <Eval Name>

## Purpose
## Source Grounding
## Test Scope
## Required Behavior
## Pass Criteria
## Related Agents, Tools, And Controls
## Implementation Relevance
```

### Operation Page

```markdown
# <Operational Concept>

## Purpose
## Source Grounding
## Owners
## Signals And Dashboards
## Runbook / Response
## Evidence And Retention
## Implementation Relevance
```

### Decision Page

```markdown
# <Decision>

## Decision
## Content State
## Source Grounding
## Rationale
## Impact
## Deferred Work
## Related Pages
```

### Open Question Page

```markdown
# <Open Question>

## Question
## Why It Matters
## Source Grounding
## Default / Fallback
## Needed From
## Related Pages
```

## Build Workflow

1. Resolve the App Kit root; it is the nearest directory containing `payload/` and usually `.codex/skills/kit-llm-wiki/`, `skills/kit-llm-wiki/`, `kit-state/`, or App Kit payload files.
2. Treat `<app-kit-root>/payload/` as immutable source material.
3. Resolve the wiki root as `<parent-of-app-kit-root>/llm-wiki/`, a sibling of the App Kit root.
4. Create or update `<parent-of-app-kit-root>/llm-wiki/index.md` and `<parent-of-app-kit-root>/llm-wiki/log.md`.
5. Create high-level pages: `overview.md`, `implementation-context.md`, and `glossary.md` when useful.
6. Extract durable concepts into the App Kit folders.
7. Update existing pages before creating duplicates.
8. Cross-link pages so agents connect to tools, controls, evals, systems, data, operations, and decisions. Use portable relative links: from the wiki root use `tools/mcp-tooling.md`; from nested pages use `../tools/mcp-tooling.md`.
9. Keep source-derived claims traceable through `sources` and source locators. From root wiki pages cite payload files with paths such as `../ent-app-kit/payload/blueprint.md`; from nested wiki pages use the appropriate relative path such as `../../ent-app-kit/payload/blueprint.md`.
10. Mark inferred/defaulted implementation choices explicitly.
11. Append a dated entry to `<parent-of-app-kit-root>/llm-wiki/log.md`.

## Query Workflow

1. Read `<parent-of-app-kit-root>/llm-wiki/index.md`.
2. Read relevant App Kit concept pages.
3. Read raw `payload/` files only to verify exact source truth, resolve conflicts, or fill missing detail.
4. File reusable answers back into the wiki when they add durable implementation knowledge.

## Lint Checks

Run `python3 scripts/lint_wiki.py <wiki-path>` first for generic OKF structure checks (frontmatter shape, command-like `sources[].resource`, broken links, orphans not reachable from `index.md`). It does not know about App Kit folders, page templates, or the `appkit:` namespace, so check those by hand:

In addition to generic OKF health checks, verify:

- every agent page links to relevant tools, controls, evals, systems, and data when present,
- every tool page links back to consuming agents or workflows,
- every control page identifies trigger, required behavior, and audit evidence,
- every decision page identifies content state,
- source blueprint references resolve where possible,
- internal wiki links are relative and portable; do not use root-absolute links such as `/tools/mcp-tooling.md`,
- every `sources[].resource` is a real relative path or URL; do not use commands such as `rg --files` as provenance,
- source catalog pages list inventory in the body and cite the actual source files or URLs they catalog,
- high-risk topics such as payments, PII, SOX, OFAC, HITL, audit retention, and compliance gates are represented when present in the source,
- App Kit metadata is under `appkit:` and standard OKF fields keep their OKF shapes.

## Graphify

Graphify can be useful after the wiki exists. Treat it as an optional downstream query/traversal accelerator over `llm-wiki/` and implementation context, not as a required part of LLM wiki creation.
