import fs from "node:fs";
import path from "node:path";
import { getAgentAdapter } from "../adapters/registry.js";
import { note } from "./output.js";
import { mkdirp, skillRefRoot, workspaceRelPath } from "./paths.js";
import { promptAgentInstructionsDecision } from "./prompt.js";
import { SetupError } from "./process.js";

export async function installDriver(kitRoot, workspaceRoot, options, repos, io) {
  mkdirp(path.join(workspaceRoot, ".kit-state"));
  const content = renderDriver(kitRoot, workspaceRoot, options, repos);
  const target = resolveDriverTarget(workspaceRoot, options.agent);
  const relativeTarget = workspaceRelPath(target, workspaceRoot);
  const policy = options.agentInstructionsPolicy || resolveAgentInstructionsPolicySync(workspaceRoot, options);
  if (policy === "prompt") {
    throw agentInstructionsPolicyError(target);
  }
  mkdirp(path.dirname(target));

  if (policy === "keep") {
    note(agentInstructionsKeptWarning(relativeTarget), io);
    return target;
  }
  if (policy === "replace") {
    fs.writeFileSync(target, content);
    io.stdout.write(`  Replaced project-local ${relativeTarget}.\n`);
    return target;
  }

  fs.writeFileSync(target, content);
  io.stdout.write(`  Wrote project-local ${relativeTarget}.\n`);
  return target;
}

export async function resolveAgentInstructionsPolicy(workspaceRoot, options, io) {
  options.agentInstructionsPolicy = await resolveAgentInstructionsPolicyValue(workspaceRoot, options, io);
  return options.agentInstructionsPolicy;
}

function resolveAgentInstructionsPolicySync(workspaceRoot, options) {
  if (options.agentInstructionsPolicy) return options.agentInstructionsPolicy;
  const target = resolveDriverTarget(workspaceRoot, options.agent);
  if (!fs.existsSync(target)) return "write";
  if (options.replaceAgentInstructions) return "replace";
  if (options.keepAgentInstructions) return "keep";
  if (options.nonInteractive) throw agentInstructionsPolicyError(target);
  return "prompt";
}

async function resolveAgentInstructionsPolicyValue(workspaceRoot, options, io) {
  const policy = resolveAgentInstructionsPolicySync(workspaceRoot, options);
  if (policy !== "prompt") return policy;

  const target = resolveDriverTarget(workspaceRoot, options.agent);
  const relativeTarget = workspaceRelPath(target, workspaceRoot);
  note(`Project-local agent instructions already exist at ${target}.`, io);
  const decision = await promptAgentInstructionsDecision(io, relativeTarget);
  if (decision !== "replace" && decision !== "keep") {
    throw agentInstructionsPolicyError(target);
  }
  return decision;
}

function agentInstructionsPolicyError(target) {
  return new SetupError(
    [
      `ERROR: Project-local agent instructions already exist at ${target}; setup needs an explicit agent-instructions policy.`,
      "Rerun with --replace-agent-instructions to replace it, or --keep-agent-instructions to leave it unchanged.",
    ].join("\n"),
  );
}

function agentInstructionsKeptWarning(relativeTarget) {
  return [
    `${relativeTarget} already exists; left it unchanged.`,
    "App Kit instructions were not installed into the active agent instructions file.",
    `Do not start the App Kit workflow until ${relativeTarget} includes the generated App Kit instructions.`,
  ].join("\n");
}

function resolveDriverTarget(workspaceRoot, agent) {
  return getAgentAdapter(agent).instructionSurface({ workspaceRoot, kitRoot: path.join(workspaceRoot, "ent-app-kit") }).target;
}

function renderDriver(kitRoot, workspaceRoot, options, repos) {
  const adapter = getAgentAdapter(options.agent);
  const skillsRoot = skillRefRoot(options.agent);
  const focusBlock = driverFocusBlock();
  const fidelityBlock = driverImplementationFidelityBlock();
  const startupBlock = driverStartupSeedingBlock();
  const contextBlock = driverContextBlock(options, repos);
  const guidanceBlock = driverUserGuidanceBlock();
  const wikiBlock = driverLlmWikiBlock();
  const methodBlock = driverMethodBlock(skillsRoot, options.method);
  const rulesBlock = driverWorkspaceRulesBlock();
  const conventionsBlock = driverWorkspaceConventionsBlock();

  if (adapter.instructionSurface({ workspaceRoot, kitRoot }).variant === "kiro-steering") {
    return `# Enterprise App Kit Workspace

This workspace uses Enterprise App Kit.

This file is a Kiro steering document: Kiro CLI loads every Markdown file under
\`.kiro/steering/\` automatically, so these instructions apply to every session
in this workspace. The kit's skills are installed under \`.kiro/skills/\` and can
be invoked directly by typing \`/\` in chat.

${focusBlock}

${fidelityBlock}

${contextBlock}

${guidanceBlock}

${methodBlock}

Before implementation, read:
- ${skillsRoot}/kit-orchestrator/SKILL.md

${rulesBlock}

${conventionsBlock}
`;
  }

  const entry = adapter.skillEntryMode === "before-implementation"
    ? `Before implementation, read:\n- ${skillsRoot}/kit-orchestrator/SKILL.md`
    : `Entry point:\n- ${skillsRoot}/kit-orchestrator/SKILL.md`;

  return `# Enterprise App Kit Workspace

This workspace uses Enterprise App Kit.

${focusBlock}

${fidelityBlock}

${startupBlock}

${contextBlock}

${guidanceBlock}

${wikiBlock}

${methodBlock}

${entry}

${rulesBlock}

${conventionsBlock}
`;
}

function driverContextBlock(options, repos) {
  const topology = repos.topology || "unspecified";
  const repoLines = repos.repositories.length
    ? repos.repositories.map((repo) => `- \`${repo.name}\` (${repo.role || "unspecified"}): \`${repo.workspace_path || `repos/${repo.name}`}\` [${repo.source || "greenfield"}]`).join("\n")
    : "- none declared in ent-app-kit/payload/repos.yaml";

  return `## Execution Context

Selected execution context:
- agent: ${options.agent}
- method: ${options.method}
- mode: ${options.mode}

${modeBehaviorInstruction(options.mode)}

Declared repositories:
- topology: ${topology}
${repoLines}`;
}

function driverMethodBlock(skillsRoot, method) {
  if (method === "speckit") {
    return `Method adapter:
- ${skillsRoot}/kit-method-${method}/SKILL.md`;
  }
  return `Method integration:
- You MUST use the outlined ${method} workflow for planning and implementation. Never skip this part.
- Use the repositories declared in .kit-state/state.yaml as the routing authority for repository boundaries.

Method adapter:
- ${skillsRoot}/kit-method-${method}/SKILL.md`;
}

function driverFocusBlock() {
  return `## Application Focus

The Kit builds an **enterprise-grade agentic application**. Success is measured first by whether the agentic capabilities actually work - not by surface scaffolding.

- **Agents and MCPs must work correctly.** Agents, MCP tools/servers, tool-calling, and inter-agent handoffs must run and interact correctly end to end - exercised and verified, not stubbed placeholders.
- **Use real agent frameworks.** Use the agent framework, MCP implementation, and provider SDKs the App Kit defines; when none is specified, choose established defaults.`;
}

function driverImplementationFidelityBlock() {
  return `## App Kit Implementation Fidelity

Everything present in \`ent-app-kit/payload/\` - product, design, architecture, workflow, interface, data, UX, and acceptance artifacts - is binding scope, not suggestions. Scaffold-level content does not license a smaller build.

- **Deviation requires approval.** If a spec can't be followed precisely, or you think a scope reduction or substitution is warranted, STOP and ask. Never silently pick a narrower implementation; proceed only after the user approves the specific change.
- **Method scope.** Method adapters produce build intent; they do not reduce package scope, repo topology, integration fidelity, or enterprise quality requirements.
- **Ship production-grade.** Default quality target is enterprise-grade software. Even mocks and MVPs use production-shaped architecture: fake adapters behind real boundaries, operational UX, audit/error contracts, and tests for control risks. Challenge any plan that only produces a demo or just passes tasks.

Before marking implementation complete, confirm every in-scope behavior, screen, workflow, data state, integration boundary, edge case, and acceptance criterion is either implemented as specified or recorded as a user-approved mock/deferred item with its reason.

## Source Identifier Translation

Classify source identifiers before using them as implementation, configuration, or UI names.

Payload (e.g. blueprint, workflow, tool, agent, step, and external-system) identifiers may be:
- **External contract identifiers** — keep exact at the integration, API, protocol, event, or vendor boundary.
- **Source traceability identifiers** — preserve in metadata, audit events, traces, conformance evidence, and source maps, but translate into domain-readable names for code, config, and UI.
- **Domain identifiers** — use directly when they are already normal business language.
- **Regulatory or legal identifiers** — preserve exact wording when the source requires it.

Do not name modules, services, routes, classes, tests, environment variables, app-owned config keys, UI labels, or navigation after opaque source identifiers by default. Prefer human-readable domain names and keep the raw identifier in mapping metadata unless the payload explicitly requires exact usage.

When unclear, create or update a lightweight source identifier map in the relevant planning artifact. Record the raw identifier, source meaning, classification, implementation name, config name, UI label guidance, and where the raw identifier must remain visible. Map only the identifiers needed for the current planning horizon; refine labels when the relevant UI surface is designed or reviewed.

## External Integration Fidelity

- A required external integration means executable runtime behavior, not package, config, status, or adapter scaffolding.
- For every source-required LLM, SDK, MCP, API, database, storage, queue, webhook, auth provider, cloud service, or enterprise connector, implement the real provider path unless explicitly deferred by source or user.
- Complete means: instantiate from config/secrets via one enumerated selection variable per integration (\`INTEGRATION_<NAME>=mock|<real>\`), validated at boot - unknown values or missing required config crash at startup, never at first request; call it in the relevant workflow; map responses into domain contracts; handle missing credentials/auth/timeouts/rate limits/malformed responses/provider errors; expose honest readiness; and test the path with fake clients or emulators using one contract suite that runs against every adapter of the same contract.
- Mocks, fixtures, emulators, and fallbacks are allowed only as alternate adapters behind the same contract. Mock is a development default only - production-like environments require explicit per-integration opt-in.
- The runtime environment is declared, never guessed: use the repo's existing convention or a required \`APP_ENV\` (\`development|staging|production\`) with no default - unset fails at startup.
- Missing credentials may block live validation, not implementation. If the real path cannot be built, stop and ask for explicit deferral approval.
- Document every integration variable, its valid values, and its default in a committed example-config file (\`.env.example\`, or the repo's existing equivalent convention - extend it, never introduce a competing one).`;
}

function driverStartupSeedingBlock() {
  return `## Startup & Seeding

Every generated app must be runnable from a clean checkout with reproducible demo data.
For greenfield or substantially modified apps, apply the \`kit-app-startup-seeding\` skill. The implementation must provide repo-local commands and one root-level command that starts the full user-facing app. Seeding must be explicit, idempotent, and use the real application write path. Docker or other runtime tooling must not be required unless selected by the payload, user, or dependency graph.`;
}

function driverWorkspaceConventionsBlock() {
  return `## Workspace Conventions

- For new/generated Python repos, default to \`uv\` unless existing conventions or the user specify otherwise; prefer \`uv sync\` for uv-managed projects and \`uv pip\` for fallback/ad hoc installs.
- Maintain enterprise-grade \`README.md\` files: Keep Readme always up to date and written for maintainers, not delivery logs. Cover purpose, capabilities, setup, config, run, test, operations, integrations, troubleshooting, and known limits.
- Keep implementation details useful but subordinate. Do not include Spec Kit phases, internal delivery notes, self-review checklists, generated-task evidence, or one-off validation transcripts.

## Working Efficiently

Building a full application is token-intensive; work context-efficiently, never at the expense of quality gates.
- Reports and messages: concise, to the point - pointers (file:line, test name) over prose; don't restate what an artifact already records.
- Verify once: green tests are proof; re-verify only what changed, never redundantly.
- Preserve local runtime artifacts between implementation slices, such as venvs, dependency directories, local databases, caches, \`node_modules\`, and build outputs. Remove them only when the user asks or a concrete failure proves they are stale or corrupt.`;
}

function driverWorkspaceRulesBlock() {
  return `## App Kit Workspace Routing

- Treat ent-app-kit/ as package input unless the user explicitly asks to edit the kit.
- Write generated solution code under repos/.
- Write generated reports under out/.
- Write runtime state under .kit-state/.
- Do not mix changes across declared repos unless the task explicitly requires a cross-repo change.
- Config and environment files (\`.env\`, \`.env.example\`) belong to the repo whose integrations they declare - never a workspace-root file spanning multiple repos' integration config.`;
}

function driverUserGuidanceBlock() {
  return `## User guidance

For open-ended questions like "what can you do?" or "what should I do next?", answer in a friendly, plain-spoken way. Briefly explain the goal of the App Kit workflow: turn the \`ent-app-kit/\` package into working software in the declared repos, with implementation traceable back to the kit artifacts.

Then guide the user to the next sensible action based on the current state: start, resume, extend, validate, or troubleshoot the workflow. Mention \`kit-orchestrator\` only as the mechanism that runs the workflow, not as the main user-facing answer.

Avoid long capability lists and internal phase details. If helpful, summarize the workflow at a high level: read the kit, derive or update slices, build the app, and verify it against the original artifacts. If the user wants a new feature, explain that it can be added through the same workflow as new traceable scope, separate from the original kit requirements.`;
}

function driverLlmWikiBlock() {
  return `## LLM Wiki

This workspace may include \`llm-wiki/\`, a generated knowledge layer over the App Kit payload.

- Use \`llm-wiki/index.md\` for orientation on broad product, architecture, workflow, agent, integration, data, control, and implementation questions.
- The wiki is organized as interlinked concept pages with \`llm-wiki/index.md\` as the entry point; follow related-page links to move between agents, tools, systems, data, controls, decisions, and open questions.
- The wiki exists to reduce repeated context reconstruction: it summarizes durable relationships and implementation implications from the payload, so agents can orient quickly before checking exact source details.
- Treat \`ent-app-kit/payload/\` as the source of truth for exact requirements, contracts, acceptance criteria, wireframes, and binding implementation scope.
- Do not treat wiki pages as binding source material. If \`llm-wiki/\` conflicts with \`ent-app-kit/payload/\`, the payload wins.
- For ordinary implementation work, use the wiki for orientation and then verify exact details in payload files before coding.
- If payload files change, or if wiki pages need to be created, updated, linted, or reorganized, read the \`/llm-wiki\` skill and follow its workflow.
- Reusable implementation insights may be filed back into the wiki only as synthesis with source traceability, not as new source-of-truth requirements.`;
}

function modeBehaviorInstruction(mode) {
  if (mode === "autopilot") {
    return "Mode behavior: autopilot - once the process is started, run the workflow end-to-end without stopping for routine input, pausing only when blocked or when a required method gate needs user input.";
  }
  return "Mode behavior: interactive - ask for user input more often at decision points, unclear requirements, review moments, or before consequential changes.";
}
