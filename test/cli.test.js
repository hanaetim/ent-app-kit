import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readYamlFile } from "../src/setup/config.js";
import { getSetupTool, toolPackageSpec } from "../src/setup/tools.js";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(kitRoot, "bin", "ent-app-kit.js");
const OPENSPEC = getSetupTool("openspec");
const SPECKIT = getSetupTool("speckit");
const IMPECCABLE = getSetupTool("impeccable");
const WRONG_OPENSPEC_VERSION = "0.0.0-openspec-test";
const WRONG_SPECKIT_VERSION = "0.0.0-speckit-test";
const FRAMEWORK_FIXTURE_ENTRIES = [
  "bin",
  "src",
  "schemas",
  "examples",
  "skills",
  "manifest.yaml",
  "package.json",
  "package-lock.json",
  "README.md",
];

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function linePattern(value) {
  return new RegExp(escapeRegExp(value));
}

function installingPattern(tool, runner) {
  return linePattern(`${tool.label}: installing pinned ${toolPackageSpec(tool)} via ${runner}`);
}

function installingCompletedPattern(tool, runner) {
  return linePattern(`${tool.label}: installing pinned ${toolPackageSpec(tool)} via ${runner}: completed`);
}

function verifiedPattern(tool) {
  return linePattern(`${tool.label}: verified ${tool.command} ${tool.version}`);
}

function matchingInstalledPattern(tool) {
  return linePattern(`${tool.label}: found installed ${tool.command} ${tool.version}; matches pinned ${toolPackageSpec(tool)}`);
}

function updatingPinnedPattern(tool, foundVersion) {
  return linePattern(`${tool.label}: found installed ${tool.command} ${foundVersion}; updating to pinned ${toolPackageSpec(tool)}.`);
}

function updatingUnverifiedPattern(tool) {
  return linePattern(`${tool.label}: found installed ${tool.command}, but version could not be verified; updating to pinned ${toolPackageSpec(tool)}.`);
}

function usingExistingPattern(tool, foundVersion) {
  return linePattern(`${tool.label}: found installed ${tool.command} ${foundVersion}; using installed command. Pinned recommendation is ${toolPackageSpec(tool)}.`);
}

function usingUnverifiedPattern(tool) {
  return linePattern(`${tool.label}: found installed ${tool.command}, but version could not be verified; using installed command. Pinned recommendation is ${toolPackageSpec(tool)}.`);
}

function noDownloadsMissingPattern(tool) {
  return linePattern(`${tool.label} is required but '${tool.command}' is not installed (--no-tool-downloads is set).`);
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [options.bin || bin, ...args], {
    cwd: options.cwd || kitRoot,
    env: options.env || process.env,
    encoding: "utf8",
  });
}

function makeWorkspace() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "ent-app-kit-cli-test."));
  copyFrameworkKit(path.join(workspace, "ent-app-kit"));
  injectMinimalExamplePayload(path.join(workspace, "ent-app-kit"));
  return workspace;
}

function markOpenSpecInitialized(workspace) {
  fs.mkdirSync(path.join(workspace, "openspec"), { recursive: true });
  return workspace;
}

function makeCopiedWorkspace() {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "ent-app-kit-cli-copy-test."));
  copyFrameworkKit(path.join(workspace, "ent-app-kit"));
  return workspace;
}

function copyFrameworkKit(target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of FRAMEWORK_FIXTURE_ENTRIES) {
    fs.cpSync(path.join(kitRoot, entry), path.join(target, entry), { recursive: true });
  }
  fs.mkdirSync(path.join(target, "payload", "design"), { recursive: true });
  fs.mkdirSync(path.join(target, "payload", "skills"), { recursive: true });
  fs.writeFileSync(path.join(target, "payload", ".gitkeep"), "");
  fs.writeFileSync(path.join(target, "payload", "design", ".gitkeep"), "");
  fs.writeFileSync(path.join(target, "payload", "skills", ".gitkeep"), "");
  try {
    fs.symlinkSync(path.join(kitRoot, "node_modules"), path.join(target, "node_modules"), "dir");
  } catch {
    fs.cpSync(path.join(kitRoot, "node_modules"), path.join(target, "node_modules"), { recursive: true });
  }
}

function injectMinimalExamplePayload(kitRootPath) {
  fs.copyFileSync(
    path.join(kitRootPath, "examples", "payload", "minimal", "repos.yaml"),
    path.join(kitRootPath, "payload", "repos.yaml"),
  );
}

function makeFakeBin(command, source) {
  const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), "ent-app-kit-fake-bin."));
  const executable = path.join(fakeBin, process.platform === "win32" ? `${command}.cmd` : command);
  fs.writeFileSync(executable, source);
  fs.chmodSync(executable, 0o755);
  return fakeBin;
}

function makeToolBin() {
  const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), "ent-app-kit-tool-bin."));
  symlinkCommand(process.execPath, path.join(fakeBin, process.platform === "win32" ? "node.exe" : "node"));
  symlinkCommand(findCommand("git"), path.join(fakeBin, process.platform === "win32" ? "git.exe" : "git"));
  return fakeBin;
}

function writeExecutable(directory, command, source) {
  const executable = path.join(directory, process.platform === "win32" ? `${command}.cmd` : command);
  fs.writeFileSync(executable, source);
  fs.chmodSync(executable, 0o755);
  return executable;
}

function openspecCommandSource(version, options = {}) {
  const versionLine = options.unknownVersion ? "console.log('openspec version unknown');" : `console.log('openspec ${version}');`;
  return `#!/usr/bin/env node
const fs = require("fs");
if (process.argv.includes("--version")) {
  ${versionLine}
  process.exit(0);
}
if (process.argv[2] === "init") {
  const target = process.argv[3];
  fs.mkdirSync(target + "/openspec", { recursive: true });
  process.exit(0);
}
console.error("unexpected openspec invocation: " + process.argv.slice(2).join(" "));
process.exit(64);
`;
}

function specifyCommandSource(version, options = {}) {
  const versionLine = options.unknownVersion ? "console.log('specify version unknown');" : `console.log('specify-cli ${version}');`;
  return `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
if (process.argv.includes("--version")) {
  ${versionLine}
  process.exit(0);
}
if (process.argv[2] === "init") {
  fs.mkdirSync(path.join(process.cwd(), ".specify"), { recursive: true });
  process.exit(0);
}
console.error("unexpected specify invocation: " + process.argv.slice(2).join(" "));
process.exit(64);
`;
}

function writeOpenSpecCommand(directory, version, options = {}) {
  return writeExecutable(directory, "openspec", openspecCommandSource(version, options));
}

function writeSpecifyCommand(directory, version, options = {}) {
  return writeExecutable(directory, "specify", specifyCommandSource(version, options));
}

function writeNpmInstaller(directory, installedVersion, options = {}) {
  const packageSpec = toolPackageSpec(OPENSPEC);
  return writeExecutable(directory, "npm", `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
if (!process.argv.includes("install") || !process.argv.includes("-g") || !process.argv.includes(${JSON.stringify(packageSpec)})) {
  console.error("npm did not install pinned OpenSpec package globally");
  process.exit(45);
}
const command = path.join(path.dirname(process.argv[1]), process.platform === "win32" ? "openspec.cmd" : "openspec");
fs.writeFileSync(command, ${JSON.stringify(openspecCommandSource(installedVersion, options))});
fs.chmodSync(command, 0o755);
`);
}

function writeUvInstaller(directory, installedVersion, options = {}) {
  const packageSpec = toolPackageSpec(SPECKIT);
  return writeExecutable(directory, "uv", `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
if (!process.argv.includes("tool") || !process.argv.includes("install") || !process.argv.includes(${JSON.stringify(packageSpec)})) {
  console.error("uv did not install pinned Spec Kit package");
  process.exit(44);
}
const command = path.join(path.dirname(process.argv[1]), process.platform === "win32" ? "specify.cmd" : "specify");
fs.writeFileSync(command, ${JSON.stringify(specifyCommandSource(installedVersion, options))});
fs.chmodSync(command, 0o755);
`);
}

test("prints setup help without writing workspace artifacts", () => {
  const workspace = makeWorkspace();
  const result = runCli(["setup", "--help"], { cwd: workspace });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:\n  ent-app-kit setup \[options\]/);
  assert.match(result.stdout, /--method <speckit\|openspec>/);
  assert.doesNotMatch(result.stdout, /--method <[^>]*bmad/);
  assert.match(result.stdout, /--verbose-tools/);
  assert.equal(fs.existsSync(path.join(workspace, ".kit-state")), false);
});

test("fails before writing artifacts when run from inside ent-app-kit", () => {
  const workspace = makeCopiedWorkspace();
  const copiedKit = path.join(workspace, "ent-app-kit");
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--mode",
    "autopilot",
    "--skip-impeccable",
    "--skip-compile-check",
    "--non-interactive",
  ], {
    bin: path.join(copiedKit, "bin", "ent-app-kit.js"),
    cwd: copiedKit,
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /setup is running from inside ent-app-kit/);
  assert.doesNotMatch(result.stderr, /coding agent integration/);
  assert.doesNotMatch(result.stderr, /SDD method adapter/);
  assert.doesNotMatch(result.stderr, /execution mode/);
  assert.equal(fs.existsSync(path.join(copiedKit, ".kit-state")), false);
  assert.equal(fs.existsSync(path.join(copiedKit, "repos")), false);
  assert.equal(fs.existsSync(path.join(copiedKit, "AGENTS.md")), false);
});

test("fails before prompting when cwd is not the direct parent of ent-app-kit", () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "ent-app-kit-cli-empty-workspace."));
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--mode",
    "autopilot",
    "--skip-impeccable",
    "--skip-compile-check",
    "--non-interactive",
  ], { cwd: workspace });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /setup must be run from the direct parent directory of ent-app-kit/);
  assert.doesNotMatch(result.stderr, /coding agent integration/);
  assert.equal(fs.existsSync(path.join(workspace, "ent-app-kit")), false);
  assert.equal(fs.existsSync(path.join(workspace, ".kit-state")), false);
  assert.equal(fs.existsSync(path.join(workspace, "repos")), false);
  assert.equal(fs.existsSync(path.join(workspace, "AGENTS.md")), false);
});

test("fails before mutation when assembled payload omits repos config", () => {
  const workspace = makeCopiedWorkspace();
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--mode",
    "autopilot",
    "--skip-impeccable",
    "--skip-compile-check",
    "--non-interactive",
  ], { cwd: workspace });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /payload\/repos\.yaml is required after payload injection/);
  assert.match(result.stderr, /examples\/payload\/minimal\/repos\.yaml/);
  assert.equal(fs.existsSync(path.join(workspace, ".kit-state")), false);
  assert.equal(fs.existsSync(path.join(workspace, "repos")), false);
  assert.equal(fs.existsSync(path.join(workspace, "AGENTS.md")), false);
});

test("initializes greenfield workspace without bash setup path", () => {
  const workspace = markOpenSpecInitialized(makeWorkspace());
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--mode",
    "autopilot",
    "--skip-impeccable",
    "--skip-compile-check",
    "--non-interactive",
  ], { cwd: workspace });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(path.join(workspace, ".kit-state", "state.yaml")), true);
  assert.equal(fs.existsSync(path.join(workspace, "repos", "backend", ".git")), true);
  assert.equal(fs.existsSync(path.join(workspace, "repos", "frontend", ".git")), true);
  assert.equal(fs.existsSync(path.join(workspace, ".agents", "skills", "kit-orchestrator", "SKILL.md")), true);
  assert.equal(fs.existsSync(path.join(workspace, "AGENTS.md")), true);
  assert.match(
    result.stdout,
    /Usage note[\s\S]*Starting the application build can trigger a long-running autonomous workflow\. Monitor assistant usage and cost while it is running\.[\s\S]*Next steps[\s\S]*1\. Start a new coding-agent session from the workspace root:[\s\S]*2\. If you use an IDE integration, restart the IDE so slash commands and skills are refreshed\.[\s\S]*3\. Paste this prompt into the agent:[\s\S]*Build the app kit\./,
  );
});

test("non-interactive setup fails before mutation when selections are missing", () => {
  const workspace = makeWorkspace();
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--skip-impeccable",
    "--skip-compile-check",
    "--non-interactive",
  ], { cwd: workspace });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /setup requires explicit selection\(s\): --mode/);
  assert.match(result.stderr, /ent-app-kit setup --agent ibm-bob --method speckit --mode autopilot/);
  assert.equal(fs.existsSync(path.join(workspace, ".kit-state")), false);
  assert.equal(fs.existsSync(path.join(workspace, "repos")), false);
});

test("non-interactive setup requires agent instructions policy when active driver exists", () => {
  const workspace = makeWorkspace();
  fs.writeFileSync(path.join(workspace, "AGENTS.md"), "# User driver\n");
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], { cwd: workspace });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Project-local agent instructions already exist at .*AGENTS\.md; setup needs an explicit agent-instructions policy/);
  assert.match(result.stderr, /--replace-agent-instructions/);
  assert.match(result.stderr, /--keep-agent-instructions/);
  assert.equal(fs.readFileSync(path.join(workspace, "AGENTS.md"), "utf8"), "# User driver\n");
  assert.equal(fs.existsSync(path.join(workspace, "repos")), false);
  assert.equal(fs.existsSync(path.join(workspace, "AGENTS.md.ent-app-kit")), false);
});

test("non-interactive setup requires policy even when active driver was generated", () => {
  const workspace = makeWorkspace();
  fs.writeFileSync(path.join(workspace, "AGENTS.md"), "# Enterprise App Kit Workspace\n\nThis workspace uses Enterprise App Kit.\n");
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], { cwd: workspace });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Project-local agent instructions already exist at .*AGENTS\.md; setup needs an explicit agent-instructions policy/);
  assert.match(fs.readFileSync(path.join(workspace, "AGENTS.md"), "utf8"), /# Enterprise App Kit Workspace/);
  assert.equal(fs.existsSync(path.join(workspace, "repos")), false);
});

test("keeps active agent instructions when requested", () => {
  const workspace = markOpenSpecInitialized(makeWorkspace());
  fs.writeFileSync(path.join(workspace, "AGENTS.md"), "# User driver\n");
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--keep-agent-instructions",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], { cwd: workspace });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, /AGENTS\.md already exists; left it unchanged/);
  assert.match(result.stderr, /App Kit instructions were not installed into the active agent instructions file/);
  assert.match(result.stderr, /Do not start the App Kit workflow until AGENTS\.md includes the generated App Kit instructions/);
  assert.equal(fs.readFileSync(path.join(workspace, "AGENTS.md"), "utf8"), "# User driver\n");
  assert.equal(fs.existsSync(path.join(workspace, "AGENTS.md.ent-app-kit")), false);
});

test("replaces active agent instructions when requested", () => {
  const workspace = markOpenSpecInitialized(makeWorkspace());
  fs.writeFileSync(path.join(workspace, "AGENTS.md"), "# User driver\n");
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--replace-agent-instructions",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], { cwd: workspace });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(fs.readFileSync(path.join(workspace, "AGENTS.md"), "utf8"), /# Enterprise App Kit Workspace/);
  assert.equal(fs.existsSync(path.join(workspace, "AGENTS.md.ent-app-kit")), false);
});

test("switching agents writes selected driver without touching other agent instructions", () => {
  const workspace = markOpenSpecInitialized(makeWorkspace());
  fs.writeFileSync(path.join(workspace, "AGENTS.md"), "# Enterprise App Kit Workspace\n\nThis workspace uses Enterprise App Kit.\n");
  fs.writeFileSync(path.join(workspace, "DEEPAGENTS.md"), "# Enterprise App Kit Workspace\n\nThis workspace uses Enterprise App Kit.\n");
  const result = runCli([
    "setup",
    "--agent",
    "claude-code",
    "--method",
    "openspec",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], { cwd: workspace });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Agent instructions/);
  assert.match(result.stdout, /Wrote project-local CLAUDE\.md/);
  assert.doesNotMatch(result.stdout, /Removed .* AGENTS\.md/);
  assert.doesNotMatch(result.stdout, /Removed .*DEEPAGENTS\.md/);
  assert.equal(fs.existsSync(path.join(workspace, "AGENTS.md")), true);
  assert.equal(fs.existsSync(path.join(workspace, "DEEPAGENTS.md")), true);
  assert.match(fs.readFileSync(path.join(workspace, "CLAUDE.md"), "utf8"), /# Enterprise App Kit Workspace/);
});

test("supported agent adapters install their native skill and instruction surfaces", () => {
  const cases = [
    { agent: "codex", skill: [".agents", "skills"], driver: ["AGENTS.md"] },
    { agent: "claude-code", skill: [".claude", "skills"], driver: ["CLAUDE.md"] },
    { agent: "kiro", skill: [".kiro", "skills"], driver: [".kiro", "steering", "enterprise-app-kit.md"] },
    { agent: "ibm-bob", skill: [".bob", "skills"], driver: ["AGENTS.md"] },
  ];

  for (const entry of cases) {
    const workspace = markOpenSpecInitialized(makeWorkspace());
    const result = runCli([
      "setup",
      "--agent",
      entry.agent,
      "--method",
      "openspec",
      "--mode",
      "autopilot",
      "--skip-impeccable",
      "--skip-compile-check",
      "--non-interactive",
    ], { cwd: workspace });

    assert.equal(result.status, 0, `${entry.agent}\n${result.stderr || result.stdout}`);
    const orchestratorSkill = path.join(workspace, ...entry.skill, "kit-orchestrator", "SKILL.md");
    assert.equal(fs.existsSync(orchestratorSkill), true, entry.agent);
    if (entry.agent === "kiro") {
      const orchestrator = fs.readFileSync(orchestratorSkill, "utf8");
      assert.match(orchestrator, /`openspec` -> read `kit-method-openspec`/);
      assert.match(orchestrator, /\.kit-state\/methods\/openspec\/current-phase\.json/);
    }
    assert.equal(fs.existsSync(path.join(workspace, ...entry.driver)), true, entry.agent);
    const state = readYamlFile(path.join(workspace, ".kit-state", "state.yaml"));
    assert.equal(state.adapter.id, entry.agent);
    assert.equal(state.adapter.installed_surfaces.skills, path.posix.join(...entry.skill));
    assert.equal(state.adapter.installed_surfaces.instructions, entry.driver.join("/"));
  }
});

test("installs Impeccable skill-only payload for IBM Bob using pinned npx", () => {
  const workspace = markOpenSpecInitialized(makeWorkspace());
  const fakeBin = makeFakeBin("npx", `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
if (process.env.npm_config_package || process.env.npm_config_call || process.env.npm_config_argv) {
  console.error("outer npm exec metadata leaked into nested npx");
  process.exit(42);
}
if (!process.argv.includes("--yes") || !process.argv.includes(${JSON.stringify(toolPackageSpec(IMPECCABLE))}) || !process.argv.includes("install")) {
  console.error("nested npx did not request the pinned impeccable install explicitly");
  process.exit(43);
}
const target = path.join(process.cwd(), ".agents", "skills", "impeccable");
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, "SKILL.md"), "Read .agents/skills/impeccable before UI work.\\n");
`);
  const result = runCli([
    "setup",
    "--agent",
    "ibm-bob",
    "--method",
    "openspec",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: {
      ...process.env,
      PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
      npm_config_package: "./ent-app-kit",
      npm_config_call: "ent-app-kit setup",
      npm_config_argv: '{"remain":[],"cooked":[],"original":[]}',
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const skill = path.join(workspace, ".bob", "skills", "impeccable", "SKILL.md");
  assert.equal(fs.existsSync(skill), true);
  assert.match(fs.readFileSync(skill, "utf8"), /.bob\/skills\/impeccable/);
  assert.equal(fs.existsSync(path.join(workspace, ".agents", "skills", "impeccable")), false);
  assert.equal(fs.existsSync(path.join(workspace, ".codex", "hooks.json")), false);
  assert.match(result.stdout, linePattern(`Impeccable: running install via pinned ${toolPackageSpec(IMPECCABLE)} with npx`));
  assert.match(result.stdout, linePattern(`Impeccable: running install via pinned ${toolPackageSpec(IMPECCABLE)} with npx: completed`));
});

test("initializes Spec Kit with pinned uv tool install when tools are ensured", () => {
  const workspace = makeWorkspace();
  const fakeBin = makeToolBin();
  writeUvInstaller(fakeBin, SPECKIT.version);
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "speckit",
    "--ensure-tools",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(path.join(workspace, ".specify")), true);
  assert.match(result.stdout, installingPattern(SPECKIT, "uv"));
  assert.match(result.stdout, installingCompletedPattern(SPECKIT, "uv"));
  assert.match(result.stdout, verifiedPattern(SPECKIT));
  assert.match(result.stdout, /Spec Kit: running init via installed 'specify'/);
  assert.match(result.stdout, /Spec Kit: running init via installed 'specify': completed/);
});

test("initializes OpenSpec with pinned npm global install when tools are ensured", () => {
  const workspace = makeWorkspace();
  const fakeBin = makeToolBin();
  writeNpmInstaller(fakeBin, OPENSPEC.version);
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--ensure-tools",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(path.join(workspace, "openspec")), true);
  assert.match(result.stdout, installingPattern(OPENSPEC, "npm"));
  assert.match(result.stdout, installingCompletedPattern(OPENSPEC, "npm"));
  assert.match(result.stdout, verifiedPattern(OPENSPEC));
  assert.match(result.stdout, /OpenSpec: running init via installed 'openspec'/);
  assert.match(result.stdout, /OpenSpec: running init via installed 'openspec': completed/);
  assert.doesNotMatch(result.stdout, /OpenSpec is prepared for later use/);
  assert.doesNotMatch(result.stdout, /Impeccable setup used pinned npx execution/);
});

test("non-interactive setup fails for missing OpenSpec without ensured tools", () => {
  const workspace = makeWorkspace();
  const fakeBin = makeToolBin();
  writeNpmInstaller(fakeBin, OPENSPEC.version);

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OpenSpec is required but 'openspec' is not installed/);
  assert.match(result.stderr, /--ensure-tools/);
  assert.equal(fs.existsSync(path.join(workspace, "openspec")), false);
});

test("rejects ensure tools with no tool downloads", () => {
  const workspace = makeWorkspace();
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--ensure-tools",
    "--no-tool-downloads",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], { cwd: workspace });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--ensure-tools cannot be combined with --no-tool-downloads/);
});

test("rejects BMAD setup selection while method is a placeholder", () => {
  const workspace = makeWorkspace();
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "bmad",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], { cwd: workspace });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /method 'bmad' is coming soon and cannot be selected by setup/);
  assert.equal(fs.existsSync(path.join(workspace, ".kit-state")), false);
  assert.equal(fs.existsSync(path.join(workspace, "repos")), false);
});

test("rejects unsupported setup method", () => {
  const workspace = makeWorkspace();
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "unsupported",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], { cwd: workspace });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported method: unsupported/);
  assert.equal(fs.existsSync(path.join(workspace, ".kit-state")), false);
  assert.equal(fs.existsSync(path.join(workspace, "repos")), false);
});

test("reuses matching installed OpenSpec without reinstalling", () => {
  const workspace = makeWorkspace();
  const fakeBin = makeToolBin();
  writeOpenSpecCommand(fakeBin, OPENSPEC.version);
  writeExecutable(fakeBin, "npm", `#!/usr/bin/env node
console.error("npm package execution should not be used when installed openspec is compatible");
process.exit(46);
`);
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(path.join(workspace, "openspec")), true);
  assert.doesNotMatch(result.stdout, installingPattern(OPENSPEC, "npm"));
  assert.match(result.stdout, matchingInstalledPattern(OPENSPEC));
  assert.match(result.stdout, /OpenSpec: running init via installed 'openspec'/);
});

test("updates mismatched installed OpenSpec to pinned version", () => {
  const workspace = makeWorkspace();
  const fakeBin = makeToolBin();
  writeOpenSpecCommand(fakeBin, WRONG_OPENSPEC_VERSION);
  writeNpmInstaller(fakeBin, OPENSPEC.version);

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--ensure-tools",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, updatingPinnedPattern(OPENSPEC, WRONG_OPENSPEC_VERSION));
  assert.match(result.stdout, installingPattern(OPENSPEC, "npm"));
  assert.match(result.stdout, verifiedPattern(OPENSPEC));
  assert.match(result.stdout, /OpenSpec: running init via installed 'openspec'/);
});

test("updates unverifiable installed OpenSpec to pinned version", () => {
  const workspace = makeWorkspace();
  const fakeBin = makeToolBin();
  writeOpenSpecCommand(fakeBin, WRONG_OPENSPEC_VERSION, { unknownVersion: true });
  writeNpmInstaller(fakeBin, OPENSPEC.version);

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--ensure-tools",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, updatingUnverifiedPattern(OPENSPEC));
  assert.match(result.stdout, verifiedPattern(OPENSPEC));
});

test("OpenSpec install fails when verified version remains mismatched", () => {
  const workspace = makeWorkspace();
  const fakeBin = makeToolBin();
  writeNpmInstaller(fakeBin, WRONG_OPENSPEC_VERSION);

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--ensure-tools",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, linePattern(`OpenSpec installed but command 'openspec' reports ${WRONG_OPENSPEC_VERSION}; expected ${OPENSPEC.version}`));
});

test("no tool downloads fails clearly when selected tool is missing", () => {
  const workspace = makeWorkspace();
  const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), "ent-app-kit-no-tools-bin."));
  symlinkCommand(process.execPath, path.join(fakeBin, process.platform === "win32" ? "node.exe" : "node"));
  symlinkCommand(findCommand("git"), path.join(fakeBin, process.platform === "win32" ? "git.exe" : "git"));

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--no-tool-downloads",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, noDownloadsMissingPattern(OPENSPEC));
});

test("no tool downloads reuses mismatched OpenSpec with warning", () => {
  const workspace = makeWorkspace();
  const fakeBin = makeToolBin();
  writeOpenSpecCommand(fakeBin, WRONG_OPENSPEC_VERSION);

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--no-tool-downloads",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, usingExistingPattern(OPENSPEC, WRONG_OPENSPEC_VERSION));
  assert.match(result.stdout, /OpenSpec: running init via installed 'openspec'/);
});

test("existing openspec workspace skips tool checks on rerun", () => {
  const workspace = makeWorkspace();
  fs.mkdirSync(path.join(workspace, "openspec"), { recursive: true });
  const fakeBin = makeToolBin();

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--no-tool-downloads",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Existing openspec project found/);
  assert.doesNotMatch(result.stderr, /OpenSpec is required/);
});

test("reuses matching installed Spec Kit without reinstalling", () => {
  const workspace = makeWorkspace();
  const fakeBin = makeToolBin();
  writeSpecifyCommand(fakeBin, SPECKIT.version);
  writeExecutable(fakeBin, "uv", `#!/usr/bin/env node
console.error("uv package execution should not be used when installed specify is compatible");
process.exit(46);
`);

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "speckit",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(path.join(workspace, ".specify")), true);
  assert.doesNotMatch(result.stdout, installingPattern(SPECKIT, "uv"));
  assert.match(result.stdout, matchingInstalledPattern(SPECKIT));
  assert.match(result.stdout, /Spec Kit: running init via installed 'specify'/);
});

test("updates mismatched installed Spec Kit to pinned version", () => {
  const workspace = makeWorkspace();
  const fakeBin = makeToolBin();
  writeSpecifyCommand(fakeBin, WRONG_SPECKIT_VERSION);
  writeUvInstaller(fakeBin, SPECKIT.version);

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "speckit",
    "--ensure-tools",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, updatingPinnedPattern(SPECKIT, WRONG_SPECKIT_VERSION));
  assert.match(result.stdout, installingPattern(SPECKIT, "uv"));
  assert.match(result.stdout, verifiedPattern(SPECKIT));
  assert.match(result.stdout, /Spec Kit: running init via installed 'specify'/);
});

test("updates unverifiable installed Spec Kit to pinned version", () => {
  const workspace = makeWorkspace();
  const fakeBin = makeToolBin();
  writeSpecifyCommand(fakeBin, WRONG_SPECKIT_VERSION, { unknownVersion: true });
  writeUvInstaller(fakeBin, SPECKIT.version);

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "speckit",
    "--ensure-tools",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, updatingUnverifiedPattern(SPECKIT));
  assert.match(result.stdout, verifiedPattern(SPECKIT));
});

test("Spec Kit install fails when verified version remains mismatched", () => {
  const workspace = makeWorkspace();
  const fakeBin = makeToolBin();
  writeUvInstaller(fakeBin, WRONG_SPECKIT_VERSION);

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "speckit",
    "--ensure-tools",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, linePattern(`Spec Kit installed but command 'specify' reports ${WRONG_SPECKIT_VERSION}; expected ${SPECKIT.version}`));
});

test("no tool downloads reuses unverifiable Spec Kit with warning", () => {
  const workspace = makeWorkspace();
  const fakeBin = makeToolBin();
  writeSpecifyCommand(fakeBin, WRONG_SPECKIT_VERSION, { unknownVersion: true });

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "speckit",
    "--no-tool-downloads",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, usingUnverifiedPattern(SPECKIT));
  assert.match(result.stdout, /Spec Kit: running init via installed 'specify'/);
});

test("existing Spec Kit workspace skips tool checks on rerun", () => {
  const workspace = makeWorkspace();
  fs.mkdirSync(path.join(workspace, ".specify"), { recursive: true });
  const fakeBin = makeToolBin();

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "speckit",
    "--no-tool-downloads",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Existing \.specify project found/);
  assert.doesNotMatch(result.stderr, /Spec Kit is required/);
});

test("persistent tool install fails clearly when command remains off PATH", () => {
  const workspace = makeWorkspace();
  const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), "ent-app-kit-missing-installed-tool-bin."));
  symlinkCommand(process.execPath, path.join(fakeBin, process.platform === "win32" ? "node.exe" : "node"));
  symlinkCommand(findCommand("git"), path.join(fakeBin, process.platform === "win32" ? "git.exe" : "git"));
  const npmCommand = path.join(fakeBin, process.platform === "win32" ? "npm.cmd" : "npm");
  fs.writeFileSync(npmCommand, `#!/usr/bin/env node
if (!process.argv.includes("install") || !process.argv.includes("-g") || !process.argv.includes(${JSON.stringify(toolPackageSpec(OPENSPEC))})) {
  console.error("unexpected npm invocation");
  process.exit(45);
}
`);
  fs.chmodSync(npmCommand, 0o755);
  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--ensure-tools",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OpenSpec installed but command 'openspec' is not visible on PATH/);
  assert.match(result.stderr, /Restart your terminal or IDE/);
});

test("no tool downloads blocks selected Impeccable npx execution", () => {
  const workspace = markOpenSpecInitialized(makeWorkspace());
  const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), "ent-app-kit-no-impeccable-bin."));
  symlinkCommand(process.execPath, path.join(fakeBin, process.platform === "win32" ? "node.exe" : "node"));
  symlinkCommand(findCommand("git"), path.join(fakeBin, process.platform === "win32" ? "git.exe" : "git"));

  const result = runCli([
    "setup",
    "--agent",
    "ibm-bob",
    "--method",
    "openspec",
    "--no-tool-downloads",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Impeccable requires pinned package execution with npx, but --no-tool-downloads is set/);
});

test("non-interactive Impeccable runs pinned npx by default", () => {
  const workspace = markOpenSpecInitialized(makeWorkspace());
  const fakeBin = makeFakeBin("npx", `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
if (!process.argv.includes("--yes") || !process.argv.includes(${JSON.stringify(toolPackageSpec(IMPECCABLE))}) || !process.argv.includes("install")) {
  console.error("nested npx did not request the pinned impeccable install explicitly");
  process.exit(43);
}
const target = path.join(process.cwd(), ".agents", "skills", "impeccable");
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, "SKILL.md"), "Read .agents/skills/impeccable before UI work.\\n");
`);

  const result = runCli([
    "setup",
    "--agent",
    "ibm-bob",
    "--method",
    "openspec",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: `${fakeBin}${path.delimiter}${process.env.PATH}` },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(path.join(workspace, ".bob", "skills", "impeccable", "SKILL.md")), true);
  assert.match(result.stdout, linePattern(`Impeccable: running install via pinned ${toolPackageSpec(IMPECCABLE)} with npx`));
});

test("reuses existing local brownfield repository without remote", () => {
  const workspace = makeCopiedWorkspace();
  markOpenSpecInitialized(workspace);
  const copiedBin = path.join(workspace, "ent-app-kit", "bin", "ent-app-kit.js");
  const reposYaml = `schema: appkit-repos-v1
topology: multi
repositories:
  - name: backend
    role: application
    workspace_path: repos/backend
    source: brownfield
    description: Existing backend.
  - name: frontend
    role: application
    workspace_path: repos/frontend
    source: greenfield
    description: New frontend.
`;
  fs.writeFileSync(path.join(workspace, "ent-app-kit", "payload", "repos.yaml"), reposYaml);
  fs.mkdirSync(path.join(workspace, "repos", "backend"), { recursive: true });
  spawnSync("git", ["init", "--quiet", "--initial-branch=main", path.join(workspace, "repos", "backend")]);

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], { cwd: workspace, bin: copiedBin });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /using existing copy at repos\/backend/);
  assert.equal(fs.existsSync(path.join(workspace, "repos", "frontend", ".git")), true);
});

test("fails brownfield repository when existing origin does not match declared remote", () => {
  const workspace = makeCopiedWorkspace();
  const copiedBin = path.join(workspace, "ent-app-kit", "bin", "ent-app-kit.js");
  const reposYaml = `schema: appkit-repos-v1
topology: mono
repositories:
  - name: backend
    role: application
    workspace_path: repos/backend
    source: brownfield
    remote: git@example.com:expected/backend.git
    description: Existing backend.
`;
  fs.writeFileSync(path.join(workspace, "ent-app-kit", "payload", "repos.yaml"), reposYaml);
  fs.mkdirSync(path.join(workspace, "repos", "backend"), { recursive: true });
  spawnSync("git", ["init", "--quiet", "--initial-branch=main", path.join(workspace, "repos", "backend")]);
  spawnSync("git", ["-C", path.join(workspace, "repos", "backend"), "remote", "add", "origin", "git@example.com:other/backend.git"]);

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], { cwd: workspace, bin: copiedBin });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /already has origin 'git@example.com:other\/backend.git', expected 'git@example.com:expected\/backend.git'/);
});

test("fails brownfield clone with actionable git remediation", () => {
  const workspace = makeCopiedWorkspace();
  const copiedBin = path.join(workspace, "ent-app-kit", "bin", "ent-app-kit.js");
  const reposYaml = `schema: appkit-repos-v1
topology: mono
repositories:
  - name: backend
    role: application
    workspace_path: repos/backend
    source: brownfield
    remote: /definitely/missing/repo.git
    description: Existing backend.
`;
  fs.writeFileSync(path.join(workspace, "ent-app-kit", "payload", "repos.yaml"), reposYaml);

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--skip-impeccable",
    "--skip-compile-check",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], { cwd: workspace, bin: copiedBin });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /failed to clone '\/definitely\/missing\/repo.git'/);
  assert.match(result.stderr, /missing git credentials|no network access/);
});

test("fails invalid repos config before repository mutation", () => {
  const workspace = makeCopiedWorkspace();
  const copiedBin = path.join(workspace, "ent-app-kit", "bin", "ent-app-kit.js");
  const reposYaml = `schema: appkit-repos-v1
topology: multi
repositories:
  - name: backend
    role: application
    workspace_path: repos/backend
    source: unsupported
`;
  fs.writeFileSync(path.join(workspace, "ent-app-kit", "payload", "repos.yaml"), reposYaml);

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--skip-impeccable",
    "--mode",
    "autopilot",
    "--non-interactive",
  ], { cwd: workspace, bin: copiedBin });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /payload\/repos\.yaml failed schema validation/);
  assert.equal(fs.existsSync(path.join(workspace, "repos")), false);
});

test("initializes without python on PATH", () => {
  const workspace = markOpenSpecInitialized(makeWorkspace());
  const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), "ent-app-kit-no-python-bin."));
  symlinkCommand(process.execPath, path.join(fakeBin, process.platform === "win32" ? "node.exe" : "node"));
  const gitPath = findCommand("git");
  symlinkCommand(gitPath, path.join(fakeBin, process.platform === "win32" ? "git.exe" : "git"));

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--mode",
    "autopilot",
    "--skip-impeccable",
    "--skip-compile-check",
    "--non-interactive",
  ], {
    cwd: workspace,
    env: { ...process.env, PATH: fakeBin },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(path.join(workspace, ".kit-state", "state.yaml")), true);
  assert.equal(fs.existsSync(path.join(workspace, "repos", "backend", ".git")), true);
});

test("OpenSpec setup writes key workspace artifacts when already initialized", () => {
  const workspace = markOpenSpecInitialized(makeWorkspace());

  const result = runCli([
    "setup",
    "--agent",
    "codex",
    "--method",
    "openspec",
    "--mode",
    "autopilot",
    "--skip-impeccable",
    "--skip-compile-check",
    "--non-interactive",
  ], { cwd: workspace });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  for (const relative of [
    ".kit-state/state.yaml",
    ".agents/skills/kit-orchestrator/SKILL.md",
    "AGENTS.md",
    "repos/backend/.git",
    "repos/frontend/.git",
  ]) {
    assert.equal(fs.existsSync(path.join(workspace, relative)), true, `missing ${relative}`);
  }

  const state = fs.readFileSync(path.join(workspace, ".kit-state", "state.yaml"), "utf8");
  assert.match(state, /agent: codex/);
  assert.match(state, /method: openspec/);
});

function findCommand(command) {
  const result = spawnSync(process.platform === "win32" ? "where" : "which", [command], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim().split(/\r?\n/)[0];
}

function symlinkCommand(source, target) {
  try {
    fs.symlinkSync(source, target);
  } catch {
    fs.copyFileSync(source, target);
    fs.chmodSync(target, 0o755);
  }
}
