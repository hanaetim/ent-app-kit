import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { findAgentAdapter, listAgentAdapters, SUPPORTED_AGENT_IDS } from "../src/adapters/registry.js";
import { readReposConfig, readYamlFile, writeYamlFile } from "../src/setup/config.js";
import { runChecks } from "../src/setup/compile-check.js";
import { resolveAgentInstructionsPolicy } from "../src/setup/driver.js";
import { runLoggedCommand } from "../src/setup/process.js";
import { missingSelectionFlags, missingSelectionMessage, promptAgentInstructionsDecision, promptMissingOptions, promptToolDecision } from "../src/setup/prompt.js";
import { validateWorkspacePath } from "../src/setup/repos.js";
import { writeBootstrapState } from "../src/setup/state.js";
import { buildToolInstallInvocation, buildToolInvocation, extractVersion, getSetupTool, SETUP_TOOLS, toolPackageSpec } from "../src/setup/tools.js";
import { DEFAULTS } from "../src/setup/options.js";
import { ROADMAP_METHODS, SELECTABLE_METHODS, SUPPORTED_AGENTS, SUPPORTED_METHODS, validateSetupSelection } from "../src/setup/validate.js";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("setup CLI is split into expected responsibility modules", () => {
  const expectedModules = [
    "compile-check.js",
    "config.js",
    "driver.js",
    "impeccable.js",
    "index.js",
    "methods.js",
    "options.js",
    "output.js",
    "paths.js",
    "process.js",
    "prompt.js",
    "repos.js",
    "skills.js",
    "state.js",
    "summary.js",
    "tools.js",
    "validate.js",
    "workspace.js",
  ];

  for (const moduleName of expectedModules) {
    assert.equal(fs.existsSync(path.join(kitRoot, "src", "setup", moduleName)), true, `${moduleName} should exist`);
  }
});

test("cli.js remains a thin command router", () => {
  const cli = fs.readFileSync(path.join(kitRoot, "src", "cli.js"), "utf8");
  assert.ok(cli.split(/\r?\n/).length <= 80);
  assert.doesNotMatch(cli, /spawnSync|fs\.|git|Impeccable|materializeRepo|installDriver|initSpeckit/);
});

test("external process spawning is centralized", () => {
  const srcRoot = path.join(kitRoot, "src");
  const offenders = [];
  for (const file of walkJs(srcRoot)) {
    const relative = path.relative(srcRoot, file).split(path.sep).join("/");
    const content = fs.readFileSync(file, "utf8");
    if (!["setup/process.js", "runtime-deps.js"].includes(relative) && content.includes("spawnSync")) {
      offenders.push(relative);
    }
  }
  assert.deepEqual(offenders, []);
});

test("config loader preserves valid repos with reordered keys and quoted scalars", () => {
  const workspace = makeCopiedKit();
  fs.writeFileSync(path.join(workspace, "payload", "repos.yaml"), `schema: appkit-repos-v1
topology: multi
repositories:
  - role: application
    source: brownfield
    workspace_path: "repos/backend"
    name: backend
    remote: "git@example.com:app/backend.git"
    branch: develop
  - source: greenfield
    workspace_path: repos/frontend
    role: application
    name: frontend
`);
  const repos = readReposConfig(workspace);

  assert.equal(repos.schema, "appkit-repos-v1");
  assert.equal(repos.topology, "multi");
  assert.deepEqual(repos.repositories, [
    {
      name: "backend",
      role: "application",
      workspace_path: "repos/backend",
      source: "brownfield",
      remote: "git@example.com:app/backend.git",
      branch: "develop",
    },
    {
      name: "frontend",
      role: "application",
      workspace_path: "repos/frontend",
      source: "greenfield",
    },
  ]);
});

test("minimal payload example validates as repos config", () => {
  const workspace = makeCopiedKit({ assembled: true });
  const repos = readReposConfig(workspace);

  assert.equal(repos.schema, "appkit-repos-v1");
  assert.equal(repos.topology, "multi");
  assert.deepEqual(repos.repositories.map((repo) => repo.name), ["backend", "frontend"]);
});

test("config loader rejects schema failures and malformed YAML", () => {
  const invalidSchema = makeCopiedKit();
  fs.writeFileSync(path.join(invalidSchema, "payload", "repos.yaml"), `schema: appkit-repos-v1
topology: multi
repositories:
  - name: backend
    role: application
    workspace_path: repos/backend
    source: unsupported
`);
  assert.throws(() => readReposConfig(invalidSchema), /failed schema validation/);

  const malformed = makeCopiedKit();
  fs.writeFileSync(path.join(malformed, "payload", "repos.yaml"), `schema: appkit-repos-v1
topology: [multi
`);
  assert.throws(() => readReposConfig(malformed), /failed to parse payload\/repos\.yaml/);
});

test("manifest supported agents, methods, and defaults match setup CLI contract", () => {
  const manifest = readYamlFile(path.join(kitRoot, "manifest.yaml"));

  assert.deepEqual([...manifest.supported_agents].sort(), [...SUPPORTED_AGENTS].sort());
  assert.deepEqual([...manifest.supported_agents].sort(), [...SUPPORTED_AGENT_IDS].sort());
  assert.deepEqual([...manifest.supported_sdd_methods].sort(), [...SUPPORTED_METHODS].sort());
  assert.deepEqual(SELECTABLE_METHODS, ["speckit", "openspec"]);
  assert.deepEqual(ROADMAP_METHODS, ["bmad"]);
  assert.equal(manifest.supported_sdd_methods.includes("bmad"), false);
  assert.equal(manifest.defaults.agent, DEFAULTS.agent);
  assert.equal(manifest.defaults.method, DEFAULTS.method);
});

test("agent adapter registry owns supported agent surfaces", () => {
  const adapters = listAgentAdapters();
  assert.deepEqual(adapters.map((adapter) => adapter.id).sort(), [...SUPPORTED_AGENTS].sort());

  const codex = findAgentAdapter("codex");
  assert.equal(codex.skillSurface({ workspaceRoot: "/workspace", kitRoot: "/workspace/ent-app-kit" }).refRoot, ".agents/skills");
  assert.equal(codex.instructionSurface({ workspaceRoot: "/workspace", kitRoot: "/workspace/ent-app-kit" }).target, path.join("/workspace", "AGENTS.md"));
  assert.equal(codex.methods.speckit.integration, "codex");
  assert.deepEqual(codex.methods.speckit.integrationOptions, ["--skills"]);
  assert.equal(codex.methods.openspec.tool, "codex");
  assert.equal(codex.impeccable.provider, "codex");

  const claude = findAgentAdapter("claude-code");
  assert.equal(claude.skillSurface({ workspaceRoot: "/workspace", kitRoot: "/workspace/ent-app-kit" }).refRoot, ".claude/skills");
  assert.equal(claude.instructionSurface({ workspaceRoot: "/workspace", kitRoot: "/workspace/ent-app-kit" }).target, path.join("/workspace", "CLAUDE.md"));

  const kiro = findAgentAdapter("kiro");
  assert.equal(kiro.instructionSurface({ workspaceRoot: "/workspace", kitRoot: "/workspace/ent-app-kit" }).variant, "kiro-steering");
  assert.equal(kiro.methods.speckit.integration, "kiro-cli");

  const bob = findAgentAdapter("ibm-bob");
  assert.equal(bob.skillSurface({ workspaceRoot: "/workspace", kitRoot: "/workspace/ent-app-kit" }).refRoot, ".bob/skills");
  assert.equal(bob.impeccable.skillOnlyFromCodex, true);
  assert.equal(findAgentAdapter("unknown-agent"), undefined);
});

test("workspace path validation rejects absolute and parent paths", () => {
  assert.doesNotThrow(() => validateWorkspacePath("frontend", "repos/frontend"));
  assert.throws(() => validateWorkspacePath("frontend", "../frontend"), /workspace-relative/);
  assert.throws(() => validateWorkspacePath("frontend", "/tmp/frontend"), /workspace-relative/);
});

test("setup validation rejects placeholder and unknown methods distinctly", () => {
  assert.throws(
    () => validateSetupSelection({ agent: "codex", method: "bmad", mode: "autopilot" }),
    /method 'bmad' is coming soon and cannot be selected by setup/,
  );
  assert.throws(
    () => validateSetupSelection({ agent: "codex", method: "unsupported", mode: "autopilot" }),
    /unsupported method: unsupported/,
  );
});

test("setup tool registry pins package specs and executable commands", () => {
  const openspec = getSetupTool("openspec");
  const speckit = getSetupTool("speckit");
  const impeccable = getSetupTool("impeccable");

  assert.deepEqual(Object.keys(SETUP_TOOLS).sort(), ["impeccable", "openspec", "speckit"]);
  assert.equal(openspec.command, "openspec");
  assert.equal(openspec.packageName, "@fission-ai/openspec");
  assert.equal(toolPackageSpec(openspec), `${openspec.packageName}@${openspec.version}`);
  assert.equal(openspec.execution, "persistent");
  assert.deepEqual(openspec.versionArgs, ["--version"]);
  assert.equal(speckit.command, "specify");
  assert.equal(speckit.packageName, "specify-cli");
  assert.equal(toolPackageSpec(speckit), `${speckit.packageName}==${speckit.version}`);
  assert.equal(speckit.execution, "persistent");
  assert.deepEqual(speckit.versionArgs, ["--version"]);
  assert.equal(impeccable.command, "impeccable");
  assert.equal(impeccable.packageName, "impeccable");
  assert.equal(toolPackageSpec(impeccable), `${impeccable.packageName}@${impeccable.version}`);
  assert.equal(impeccable.execution, "package");
});

test("setup tool version extraction handles common CLI output formats", () => {
  assert.equal(extractVersion("9.8.7\n"), "9.8.7");
  assert.equal(extractVersion("openspec v9.8.7"), "9.8.7");
  assert.equal(extractVersion("specify-cli 8.7.6"), "8.7.6");
  assert.equal(extractVersion("tool version unknown"), null);
});

test("setup tool invocation builds persistent installs, package execution, and direct commands", () => {
  const openspec = getSetupTool("openspec");
  const speckit = getSetupTool("speckit");
  const impeccable = getSetupTool("impeccable");
  const openspecInstall = buildToolInstallInvocation(openspec);
  assert.equal(openspecInstall.command, "npm");
  assert.deepEqual(openspecInstall.args, ["install", "-g", toolPackageSpec(openspec)]);

  const speckitInstall = buildToolInstallInvocation(speckit);
  assert.equal(speckitInstall.command, "uv");
  assert.deepEqual(speckitInstall.args, ["tool", "install", toolPackageSpec(speckit)]);

  const impeccablePackage = buildToolInvocation(impeccable, "package");
  assert.equal(impeccablePackage.command, "npx");
  assert.deepEqual(impeccablePackage.args, ["--yes", toolPackageSpec(impeccable)]);

  const installed = buildToolInvocation(getSetupTool("impeccable"), "installed");
  assert.equal(installed.command, "impeccable");
  assert.deepEqual(installed.args, []);

  const prepared = buildToolInvocation(getSetupTool("openspec"), "install");
  assert.equal(prepared.command, "openspec");
  assert.deepEqual(prepared.args, []);
});

test("interactive tool version prompt returns the selected Clack action", async () => {
  const io = makePromptIo();
  const tool = getSetupTool("speckit");
  const mismatchedVersion = nextPatchVersion(tool.version);
  const decisionPromise = promptToolDecision(
    io,
    tool,
    { status: "mismatched", version: mismatchedVersion },
  );

  queueMicrotask(() => io.stdin.emit("data", "\r"));
  const decision = await decisionPromise;

  assert.equal(decision, "keep");
  assert.match(io.capture.stderr, linePattern(`Keep ${mismatchedVersion}`));
  assert.match(io.capture.stderr, linePattern(`Update to ${tool.version}`));
});

test("interactive setup wizard collects default selections and confirms", async () => {
  const io = makePromptIo();
  const options = makeSelectionOptions();
  const promptPromise = promptMissingOptions(options, io);

  writePromptKeys(io, ["\r", "\r", "\r", "\r"]);
  await promptPromise;

  assert.equal(options.agent, "ibm-bob");
  assert.equal(options.method, "speckit");
  assert.equal(options.mode, "autopilot");
  assert.match(io.capture.stderr, /^\n/);
  assert.match(stripAnsi(io.capture.stderr), /Enterprise App Kit Setup/);
  assert.match(stripAnsi(io.capture.stderr), /Workspace preparation/);
  assert.match(stripAnsi(io.capture.stderr), /prepares the current project workspace for AI-assisted/);
  assert.match(stripAnsi(io.capture.stderr), /application delivery/);
  assert.match(stripAnsi(io.capture.stderr), /add project instructions and skills for the selected assistant/);
  assert.match(stripAnsi(io.capture.stderr), /does not build the/);
  assert.match(stripAnsi(io.capture.stderr), /application or run the delivery workflow/);
  assert.match(stripAnsi(io.capture.stderr), /Assistant access/);
  assert.match(stripAnsi(io.capture.stderr), /Select AI coding assistant/);
  assert.match(stripAnsi(io.capture.stderr), /works with the AI coding assistant you already have/);
  assert.match(stripAnsi(io.capture.stderr), /access to/);
  assert.match(stripAnsi(io.capture.stderr), /needs to know which assistant will work on this project/);
  assert.match(stripAnsi(io.capture.stderr), /must already be installed or available in your environment/);
  assert.match(stripAnsi(io.capture.stderr), /will not install the assistant or configure credentials/);
  assert.match(io.capture.stderr, /Selected configuration/);
  assert.match(stripAnsi(io.capture.stderr), /IBM Bob[\s\S]*Codex[\s\S]*Claude Code[\s\S]*Kiro/);
  assert.doesNotMatch(stripAnsi(io.capture.stderr), /DeepAgents/);
  assert.doesNotMatch(stripAnsi(io.capture.stderr), /Codex\s+recommended/);
  assert.doesNotMatch(stripAnsi(io.capture.stderr), /Spec Kit\s+recommended/);
  assert.match(stripAnsi(io.capture.stderr), /Delivery method/);
  assert.match(stripAnsi(io.capture.stderr), /uses spec-driven development to help translate project/);
  assert.match(stripAnsi(io.capture.stderr), /intent into working application code/);
  assert.match(stripAnsi(io.capture.stderr), /clarifying requirements/);
  assert.match(stripAnsi(io.capture.stderr), /ad-hoc prompting/);
  assert.match(stripAnsi(io.capture.stderr), /Select delivery method/);
  assert.match(stripAnsi(io.capture.stderr), wrappedTextPattern("Spec Kit - phase-heavy workflow for more formal spec-driven delivery"));
  assert.match(stripAnsi(io.capture.stderr), wrappedTextPattern("OpenSpec - leaner workflow for faster spec-driven delivery"));
  assert.match(stripAnsi(io.capture.stderr), /BMAD \(coming soon\)/);
  assert.doesNotMatch(stripAnsi(io.capture.stderr), /Native App Kit/);
  assert.match(stripAnsi(io.capture.stderr), /Execution mode/);
  assert.match(stripAnsi(io.capture.stderr), /controls how the assistant should interact with you/);
  assert.match(stripAnsi(io.capture.stderr), /expected collaboration style/);
  assert.match(stripAnsi(io.capture.stderr), /does not change command/);
  assert.match(stripAnsi(io.capture.stderr), /approval settings/);
  assert.match(stripAnsi(io.capture.stderr), /tool permissions, or security controls/);
  assert.match(stripAnsi(io.capture.stderr), /Autopilot - run the full build end-to-end unless blocked/);
  assert.match(stripAnsi(io.capture.stderr), /Interactive - pause for input at key decisions/);
});

test("interactive setup wizard preserves explicit flags and prompts missing selections", async () => {
  const io = makePromptIo();
  const options = makeSelectionOptions({
    agent: "ibm-bob",
    agentSet: true,
  });
  const promptPromise = promptMissingOptions(options, io);

  writePromptKeys(io, ["\r", "\r", "\r"]);
  await promptPromise;

  assert.equal(options.agent, "ibm-bob");
  assert.equal(options.method, "speckit");
  assert.equal(options.mode, "autopilot");
});

test("interactive setup wizard rejects confirmation before mutation", async () => {
  const io = makePromptIo();
  const options = makeSelectionOptions({
    agent: "codex",
    method: "openspec",
    agentSet: true,
    methodSet: true,
  });
  const promptPromise = promptMissingOptions(options, io);

  writePromptKeys(io, ["\r", "n\r"]);
  await assert.rejects(promptPromise, /setup canceled before workspace changes/);
});

test("interactive setup wizard handles cancellation before mutation", async () => {
  const io = makePromptIo();
  const options = makeSelectionOptions();
  const promptPromise = promptMissingOptions(options, io);

  writePromptKeys(io, ["\u0003"]);
  await assert.rejects(promptPromise, /setup canceled before workspace changes/);
});

test("interactive setup wizard converts prompt failures to remediation errors", async () => {
  const io = makePromptIo();
  io.stdin.setRawMode = () => {
    throw new Error("raw mode unavailable");
  };

  await assert.rejects(
    () => promptMissingOptions(makeSelectionOptions(), io),
    /interactive setup prompt failed before workspace changes[\s\S]*ent-app-kit setup --agent ibm-bob --method speckit --mode autopilot/,
  );
});

test("interactive agent instructions conflict prompt defaults to replacing existing file", async () => {
  const io = makePromptIo();
  const decisionPromise = promptAgentInstructionsDecision(io, "AGENTS.md");

  writePromptKeys(io, ["\r"]);
  const decision = await decisionPromise;

  assert.equal(decision, "replace");
  const output = stripAnsi(io.capture.stderr);
  assert.match(output, /How should setup handle the project-local AGENTS\.md\?/);
  assert.match(output, /Replace/);
  assert.match(output, /Keep - not recommended; agent performance/);
  assert.match(output, /may degrade/);
  assert.match(output, /Cancel setup/);
});

test("interactive agent instructions cancellation resolves before workspace mutation", async () => {
  const workspace = fs.mkdtempSync(path.join(fs.realpathSync.native("/tmp"), "ent-app-kit-driver-policy-test."));
  fs.writeFileSync(path.join(workspace, "AGENTS.md"), "# User driver\n");
  const io = makePromptIo();
  const options = makeSelectionOptions({
    agent: "codex",
    method: "openspec",
    mode: "autopilot",
    agentSet: true,
    methodSet: true,
    modeSet: true,
  });
  const policyPromise = resolveAgentInstructionsPolicy(workspace, options, io);

  writePromptKeys(io, ["\x1B[B", "\x1B[B", "\r"]);
  await assert.rejects(policyPromise, /setup canceled before changing agent instructions/);

  assert.equal(fs.existsSync(path.join(workspace, ".kit-state")), false);
  assert.equal(fs.existsSync(path.join(workspace, "repos")), false);
  assert.equal(fs.readFileSync(path.join(workspace, "AGENTS.md"), "utf8"), "# User driver\n");
});

test("missing setup selection message identifies flags and remediation command", () => {
  const options = {
    agent: "codex",
    method: undefined,
    mode: undefined,
    agentSet: true,
    methodSet: false,
    modeSet: false,
  };

  assert.deepEqual(missingSelectionFlags(options), ["--method", "--mode"]);
  assert.match(missingSelectionMessage(missingSelectionFlags(options)), /--method, --mode/);
  assert.match(missingSelectionMessage(missingSelectionFlags(options)), /--agent ibm-bob --method speckit --mode autopilot/);
});

test("logged setup tool command keeps successful output concise", async () => {
  const io = makeIo();
  const result = await runLoggedCommand(process.execPath, ["-e", "console.log('raw stdout'); console.error('raw stderr');"], {
    io,
    action: "Test Tool install",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /raw stdout/);
  assert.match(result.stderr, /raw stderr/);
  assert.match(io.capture.stdout, /Test Tool install\n/);
  assert.match(io.capture.stdout, /Test Tool install: completed/);
  assert.doesNotMatch(io.capture.stdout, /raw stdout/);
  assert.doesNotMatch(io.capture.stderr, /raw stderr/);
});

test("logged setup tool command includes captured output on thrown failure", async () => {
  const io = makeIo();
  await assert.rejects(
    () => runLoggedCommand(process.execPath, ["-e", "console.log('install stdout'); console.error('install stderr'); process.exit(7);"], {
      io,
      action: "Failing Tool install",
      label: "Failing Tool",
    }),
    /install stdout[\s\S]*install stderr/,
  );
});

test("logged setup tool command streams output when verbose", async () => {
  const io = makeIo();
  const result = await runLoggedCommand(process.execPath, ["-e", "console.log('verbose stdout'); console.error('verbose stderr');"], {
    io,
    action: "Verbose Tool install",
    verbose: true,
  });

  assert.equal(result.status, 0);
  assert.match(io.capture.stdout, /verbose stdout/);
  assert.match(io.capture.stderr, /verbose stderr/);
});

test("logged setup tool command emits heartbeat for long-running commands", async () => {
  const io = makeIo();
  const result = await runLoggedCommand(process.execPath, ["-e", "setTimeout(() => {}, 50);"], {
    io,
    action: "Slow Tool install",
    heartbeatMs: 10,
  });

  assert.equal(result.status, 0);
  assert.match(io.capture.stdout, /Still running after \d+s: Slow Tool install/);
});

test("node state writer records selected context and repository contract", () => {
  const assembledKit = makeCopiedKit({ assembled: true });
  const workspace = fs.mkdtempSync(path.join(fs.realpathSync.native("/tmp"), "ent-app-kit-state-test."));
  writeBootstrapState(assembledKit, workspace, {
    agent: "codex",
    method: "speckit",
    mode: "autopilot",
  });

  const state = readYamlFile(path.join(workspace, ".kit-state", "state.yaml"));
  assert.equal(state.schema, "appkit-state-v1");
  assert.deepEqual(state.selected, { agent: "codex", method: "speckit", mode: "autopilot" });
  assert.equal(state.paths.kit, assembledKit);
  assert.equal(state.repos.topology, "multi");
  assert.equal(state.repos.repositories.length, 2);
  assert.equal(state.skills.method, ".agents/skills/kit-method-speckit/SKILL.md");
  assert.deepEqual(state.adapter.installed_surfaces, {
    skills: ".agents/skills",
    instructions: "AGENTS.md",
  });
  assert.equal(state.adapter.id, "codex");
});

test("node compile checks record warnings and fail missing runtime assets", () => {
  const assembledKit = makeCopiedKit({ assembled: true });
  const workspace = fs.mkdtempSync(path.join(fs.realpathSync.native("/tmp"), "ent-app-kit-check-test."));
  writeBootstrapState(assembledKit, workspace, {
    agent: "codex",
    method: "speckit",
    mode: "autopilot",
  });

  const passing = runChecks(assembledKit, workspace).toState();
  assert.equal(passing.status, "pass");
  assert.equal(passing.checks.payload, "warn");
  assert.match(passing.warning_details.join("\n"), /payload\/(design|skills) is empty/);

  const brokenKit = makeCopiedKit({ assembled: true });
  fs.rmSync(path.join(brokenKit, "src", "setup", "config.js"));
  const failing = runChecks(brokenKit, workspace).toState();
  assert.equal(failing.status, "fail");
  assert.match(failing.error_details.join("\n"), /missing required Node setup asset: src\/setup\/config\.js/);
});

test("node compile checks fail unsupported selected method", () => {
  const assembledKit = makeCopiedKit({ assembled: true });
  const workspace = fs.mkdtempSync(path.join(fs.realpathSync.native("/tmp"), "ent-app-kit-method-test."));
  writeYamlFile(path.join(workspace, ".kit-state", "state.yaml"), {
    schema: "appkit-state-v1",
    selected: { method: "unsupported" },
  });

  const result = runChecks(assembledKit, workspace).toState();
  assert.equal(result.status, "fail");
  assert.match(result.error_details.join("\n"), /selected method 'unsupported' is not supported by manifest/);
});

test("shipped orchestrator remediation uses Node setup CLI", () => {
  const content = fs.readFileSync(path.join(kitRoot, "skills", "kit-orchestrator", "SKILL.md"), "utf8");
  assert.doesNotMatch(content, /ent-app-kit\/setup\.sh/);
  assert.match(content, /npx --yes --package \.\/ent-app-kit ent-app-kit setup/);
});

function* walkJs(root) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) yield* walkJs(fullPath);
    else if (entry.isFile() && entry.name.endsWith(".js")) yield fullPath;
  }
}

function makeCopiedKit(options = {}) {
  const workspace = fs.mkdtempSync(path.join(fs.realpathSync.native("/tmp"), "ent-app-kit-config-test."));
  fs.cpSync(kitRoot, workspace, {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}.git${path.sep}`) && !source.endsWith(`${path.sep}.git`) && !source.includes(`${path.sep}node_modules${path.sep}`),
  });
  if (options.assembled) {
    injectMinimalExamplePayload(workspace);
  }
  return workspace;
}

function injectMinimalExamplePayload(kitRootPath) {
  fs.copyFileSync(
    path.join(kitRootPath, "examples", "payload", "minimal", "repos.yaml"),
    path.join(kitRootPath, "payload", "repos.yaml"),
  );
}

function makeIo() {
  const capture = { stdout: "", stderr: "" };
  return {
    capture,
    stdout: {
      write(value) {
        capture.stdout += value;
      },
    },
    stderr: {
      write(value) {
        capture.stderr += value;
      },
    },
  };
}

function makePromptIo() {
  const capture = { stdout: "", stderr: "" };
  const stdin = Object.assign(new PassThrough(), { isTTY: true, setRawMode() {} });
  const stdout = Object.assign(new PassThrough(), { isTTY: true });
  const stderr = Object.assign(new PassThrough(), { isTTY: true });
  stdout.on("data", (chunk) => {
    capture.stdout += chunk.toString("utf8");
  });
  stderr.on("data", (chunk) => {
    capture.stderr += chunk.toString("utf8");
  });
  return { capture, stdin, stdout, stderr };
}

function makeSelectionOptions(overrides = {}) {
  return {
    agent: undefined,
    method: undefined,
    mode: undefined,
    nonInteractive: false,
    agentSet: false,
    methodSet: false,
    modeSet: false,
    ...overrides,
  };
}

function writePromptKeys(io, keys) {
  keys.forEach((key, index) => {
    setTimeout(() => {
      io.stdin.write(key);
    }, index * 10);
  });
}

function linePattern(value) {
  return new RegExp(escapeRegExp(value));
}

function wrappedTextPattern(value) {
  return new RegExp(String(value).split(/\s+/).map(escapeRegExp).join("[\\s│]+"));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nextPatchVersion(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  assert.ok(match, `expected semver-like tool version, got ${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}${match[4] || ""}`;
}

function stripAnsi(value) {
  return value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}
