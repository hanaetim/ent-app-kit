---
name: kit-llm-wiki
description: Build, update, query, and lint persistent LLM-maintained markdown wikis using OKF-style frontmatter, provenance, index files, and logs. Use when asked to create an LLM wiki, move source knowledge into a wiki, ingest new sources into an existing wiki, answer questions from a wiki, file synthesized answers back into a wiki, audit wiki health, or maintain markdown knowledge bundles.
---

# LLM Wiki

Create and maintain a persistent markdown wiki that sits between raw sources and future questions. The wiki is a compounding artifact: sources are read once, distilled into interlinked concept pages, and then kept current as sources, queries, and decisions evolve.

## Source Of Truth

Use the bundled `references/SPEC.md` as the OKF reference. It owns frontmatter, provenance, lifecycle, reserved filename, index, log, path, and conformance rules. Read it when:

- creating a new wiki bundle,
- changing frontmatter conventions,
- validating OKF compatibility,
- adding provenance, trust, lifecycle, or attested-computation fields.

Read `references/appkit-profile.md` when the target corpus or workspace is an Enterprise App Kit project. It owns App Kit-specific layout, metadata extensions, page templates, build workflow, query workflow, lint rules, and Graphify positioning.

## Model

Maintain three layers:

- **Raw sources**: immutable source documents, images, transcripts, data files, or code. Read them; do not rewrite them as part of wiki maintenance.
- **Wiki**: generated markdown pages with YAML frontmatter, cross-links, summaries, concept pages, comparison pages, and synthesized answers.
- **Schema/conventions**: this skill plus bundled `references/SPEC.md`; use them to keep future agents consistent.

## Bundle Location

For generic wikis, create `llm-wiki/` in the current workspace unless the user gives another path. Use the bundle structure and reserved filename rules from `references/SPEC.md`.

For Enterprise App Kit projects, the App Kit root is the directory that directly contains `payload/`; if `ent-app-kit/payload/` exists, `ent-app-kit/` is the App Kit root. Create or update the generated wiki as a sibling of that root, and before writing state `app_kit_root` and `wiki_root`:

```text
<parent-of-app-kit-root>/llm-wiki/
```

Do not create the generated wiki under the App Kit root, under `payload/`, at the workspace parent, or at the installed skill directory unless the user explicitly asks.

Use `index.md` as the progressive-disclosure entry point: list pages by category with links and one-line descriptions. Use `log.md` as the newest-first chronological record of ingests, query filings, lint passes, reorganizations, and major updates.

Let folder structure follow the corpus domain. Use categories such as `concepts/`, `entities/`, `people/`, `places/`, `systems/`, `decisions/`, or `references/` only when they make the wiki easier to query.

## Enterprise App Kit Profile

Activate the Enterprise App Kit profile when the target workspace or corpus contains App Kit signals such as `ent-app-kit`, `payload/`, `payload/repos.yaml`, `payload/design/`, `.codex/skills/kit-llm-wiki/`, `skills/kit-llm-wiki/`, `kit-state/`, or an EAEF blueprint meant for implementation handoff. When it applies, read and follow `references/appkit-profile.md` before creating, querying, or linting the wiki.

Do not duplicate App Kit profile details in this file; keep them in `references/appkit-profile.md`.

## Workflows

### Build A New Wiki

1. Read `references/SPEC.md` enough to confirm OKF conventions.
2. Inventory raw sources with `rg --files` or equivalent.
3. Read high-signal sources first: manifests, README files, design docs, specs, existing indexes, generated reports.
4. Choose a compact page taxonomy based on the corpus, not a generic template.
5. Create `index.md`, `log.md`, and the domain folders needed by the corpus, following `references/SPEC.md`.
6. Create concept pages that synthesize, cross-link, and cite sources.
7. Validate against `references/SPEC.md`.

For Enterprise App Kit builds, follow `references/appkit-profile.md` and create the wiki at `<parent-of-app-kit-root>/llm-wiki/`.

### Ingest New Sources

1. Read the new source and the existing `index.md`.
2. Update the source catalog.
3. Update existing concept/entity/topic pages before creating duplicates.
4. Create new pages only for durable concepts likely to be queried again.
5. Add contradictions, superseded claims, and uncertainty explicitly.
6. Append a dated entry to `log.md`.

### Update Existing Sources

Use this when a source file already represented in the wiki changes.

1. Read the changed source and the existing `index.md`.
2. Find existing wiki pages and source catalog entries that reference the changed source.
3. Prefer updating existing concept/entity/topic pages over creating replacement pages.
4. Update source metadata when available. For source files referenced by the wiki, prefer recording `last_modified` on `sources[]` entries when creating or updating source metadata. Use the source file's filesystem modification timestamp when no source-provided modification date exists.
5. Preserve current claims that are still valid, remove or mark superseded claims that no longer match the source, and add contradictions or uncertainty explicitly.
6. Update `index.md` only when navigation, page summaries, or page membership changed.
7. Append a dated entry to `log.md` describing the source update and the affected wiki pages.

### Query A Wiki

1. Read `index.md` first.
2. Read relevant concept pages.
3. Drill into raw sources only when exact evidence, stale claims, or missing details require it.
4. Cite wiki pages or raw source locations in the answer.
5. If the answer is reusable, ask or infer whether to file it back into the wiki as a new page or update.

For Enterprise App Kit queries, follow `references/appkit-profile.md`.

### Lint A Wiki

Run the bundled deterministic checker first: `python3 scripts/lint_wiki.py <wiki-path>`. It is a generic OKF structure validator — it does not know about any domain's folder layout or page templates. It catches mechanical issues — missing/unparseable frontmatter, missing `type`, malformed `verified`/`generated`, sources that are commands instead of paths, broken links, orphan pages not reachable from `index.md`. Use `--json` to consume its output programmatically. It needs no dependency beyond the Python standard library (PyYAML is used automatically if present, otherwise a bundled minimal parser handles the OKF frontmatter subset).

Then check the things the script can't judge:

- OKF conformance issues defined by `references/SPEC.md`,
- source files missing from the source catalog when the wiki uses one,
- broken or stale links,
- important concepts mentioned repeatedly without their own page,
- orphan pages not discoverable from `index.md`,
- contradictions or stale claims,
- pages whose source references do not support their claims,
- missing log entries after meaningful changes.

For Enterprise App Kit wikis, use the additional lint checks in `references/appkit-profile.md`.

## Page Writing Guidance

- Prefer durable concepts over source-by-source summaries.
- Keep raw-source summaries short; invest tokens in synthesis and relationships.
- Use a source catalog when the corpus is large enough that per-page provenance is not enough to see coverage.
- File high-value query answers back into the wiki when they are likely to be reused.
- Make claims traceable using the provenance conventions in `references/SPEC.md`.
- Preserve uncertainty. Write "the source implies" or "this appears to" when an edge is inferred.
- Cross-link aggressively but meaningfully; links are the wiki graph.
- Do not paste large source excerpts. Summarize and point to the source.
- Inspect local images directly when they carry visual information; markdown image references alone are not enough.
- Treat Graphify as an optional downstream query/traversal accelerator over the generated wiki, not as a required part of this skill.

## Issues To Avoid

- Do not treat a skill trigger as a passive mode switch. If the user invokes this skill and the workspace state makes the next action clear, run the matching workflow directly.
- Do not leave placeholder status text such as "validation pending" after validation has run. Update the wiki log to reflect the actual result.