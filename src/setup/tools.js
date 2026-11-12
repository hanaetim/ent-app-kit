import { getAgentAdapter } from "../adapters/registry.js";
import { note } from "./output.js";
import { promptToolDecision } from "./prompt.js";
import { commandExists, isolatedNpmExecEnv, runLoggedCommand, SetupError, spawn as spawnForProbe } from "./process.js";

export const SETUP_TOOLS = Object.freeze({
  openspec: Object.freeze({
    id: "openspec",
    label: "OpenSpec",
    packageName: "@fission-ai/openspec",
    version: "1.8.0",
    command: "openspec",
    versionArgs: ["--version"],
    runner: "npm",
    execution: "persistent",
  }),
  speckit: Object.freeze({
    id: "speckit",
    label: "Spec Kit",
    packageName: "specify-cli",
    version: "0.16.2",
    command: "specify",
    versionArgs: ["--version"],
    runner: "uv",
    execution: "persistent",
  }),
  impeccable: Object.freeze({
    id: "impeccable",
    label: "Impeccable",
    packageName: "impeccable",
    version: "3.6.1",
    command: "impeccable",
    runner: "npx",
    execution: "package",
  }),
});

export function selectedSetupToolIds(options) {
  const selected = [];
  if (options.method === "openspec") selected.push("openspec");
  if (options.method === "speckit") selected.push("speckit");
  if (options.installImpeccable && getAgentAdapter(options.agent).impeccable) {
    selected.push("impeccable");
  }
  return selected;
}

export async function ensureSetupTools(options, io) {
  for (const id of selectedSetupToolIds(options)) {
    await prepareSetupTool(id, options, io);
  }
}

export async function runSetupTool(id, args, options, io, spawnOptions = {}) {
  const tool = getSetupTool(id);
  const prepared = await prepareSetupTool(id, options, io);
  const invocation = buildToolInvocation(tool, prepared.mode);

  const result = await runLoggedCommand(invocation.command, [...invocation.args, ...args], {
    ...spawnOptions,
    env: { ...invocation.env, ...(spawnOptions.env || {}) },
    io,
    verbose: options.verboseTools,
    action: toolActionLabel(tool, prepared.mode, invocation, args),
  });
  if (result.status !== 0 && spawnOptions.allowFailure) {
    note(`${tool.label} command failed.`, io);
    if (prepared.unpinned) {
      note(`${tool.label} was run with an unpinned installed command; rerun setup with --ensure-tools to use ${toolPackageSpec(tool)}.`, io);
    }
  }
  return result;
}

export async function prepareSetupTool(id, options, io) {
  const tool = getSetupTool(id);
  if (tool.execution === "persistent") return preparePersistentTool(tool, options, io);
  return preparePackageTool(tool, options, io);
}

export function buildToolInvocation(tool, mode = "package") {
  if (mode === "installed" || mode === "install") {
    return { command: tool.command, args: [], env: process.env };
  }
  if (tool.runner === "npx") {
    return {
      command: "npx",
      args: ["--yes", toolPackageSpec(tool)],
      env: isolatedNpmExecEnv(),
    };
  }
  throw new SetupError(`ERROR: setup tool '${tool.id}' has unsupported runner '${tool.runner}' for package execution`);
}

export function buildToolInstallInvocation(tool) {
  if (tool.runner === "npm") {
    return {
      command: "npm",
      args: ["install", "-g", toolPackageSpec(tool)],
      env: isolatedNpmExecEnv(),
    };
  }
  if (tool.runner === "uv") {
    return {
      command: "uv",
      args: ["tool", "install", toolPackageSpec(tool)],
      env: process.env,
    };
  }
  throw new SetupError(`ERROR: setup tool '${tool.id}' does not support persistent installation`);
}

export function getSetupTool(id) {
  const tool = SETUP_TOOLS[id];
  if (!tool) throw new SetupError(`ERROR: unknown setup tool: ${id}`);
  return tool;
}

export function toolPackageSpec(tool) {
  if (tool.runner === "uv") return `${tool.packageName}==${tool.version}`;
  return `${tool.packageName}@${tool.version}`;
}

export function extractVersion(text) {
  const match = String(text || "").match(/(?:^|[^\d])v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/);
  return match ? match[1] : null;
}

export function probeToolVersion(tool) {
  if (tool.execution !== "persistent") {
    return { status: commandExists(tool.command) ? "present" : "missing", version: null, output: "" };
  }
  if (!commandExists(tool.command)) {
    return { status: "missing", version: null, output: "" };
  }

  const result = spawnVersionCommand(tool);
  const output = result.combined || "";
  const version = extractVersion(output);
  if (!version) return { status: "unknown", version: null, output };
  if (version === tool.version) return { status: "matching", version, output };
  return { status: "mismatched", version, output };
}

function verifyPersistentToolVersion(tool) {
  const probe = probeToolVersion(tool);
  if (probe.status === "unknown") {
    throw new SetupError(`ERROR: ${tool.label} installed but command '${tool.command}' version could not be verified.`);
  }
  if (probe.status === "mismatched") {
    throw new SetupError(`ERROR: ${tool.label} installed but command '${tool.command}' reports ${probe.version}; expected ${tool.version}.`);
  }
}

async function preparePersistentTool(tool, options, io) {
  const probe = probeToolVersion(tool);
  if (probe.status === "matching") {
    io.stdout.write(`  ${tool.label}: found installed ${tool.command} ${tool.version}; matches pinned ${toolPackageSpec(tool)}\n`);
    return { mode: "installed", unpinned: false, probe };
  }

  if (probe.status === "missing") {
    if (options.noToolDownloads) {
      throw new SetupError(missingToolMessage(tool, "--no-tool-downloads is set"));
    }
    if (options.ensureTools || await shouldInstallMissingTool(tool, probe, io)) {
      await installPersistentTool(tool, options, io, "installing");
      return { mode: "installed", unpinned: false, probe: probeToolVersion(tool) };
    }
    throw new SetupError(missingToolMessage(tool, "installation was not approved"));
  }

  if (options.ensureTools) {
    warnUnpinnedTool(tool, probe, "updating to pinned", io);
    await installPersistentTool(tool, options, io, "installing");
    return { mode: "installed", unpinned: false, probe: probeToolVersion(tool) };
  }

  if (!options.noToolDownloads) {
    const decision = await promptToolDecision(io, tool, probe);
    if (decision === "update") {
      warnUnpinnedTool(tool, probe, "updating to pinned", io);
      await installPersistentTool(tool, options, io, "installing");
      return { mode: "installed", unpinned: false, probe: probeToolVersion(tool) };
    }
    if (decision === "abort") {
      throw new SetupError(`ERROR: ${tool.label} setup aborted by user.`);
    }
  }

  warnUnpinnedTool(tool, probe, "using existing", io);
  return { mode: "installed", unpinned: true, probe };
}

async function preparePackageTool(tool, options, io) {
  if (options.noToolDownloads) {
    if (commandExists(tool.command)) {
      note(`${tool.label}: using installed '${tool.command}' because --no-tool-downloads is set; version is not pinned by setup.`, io);
      return { mode: "installed", unpinned: true, probe: { status: "present", version: null } };
    }
    throw new SetupError(
      [
        `ERROR: ${tool.label} requires pinned package execution with ${tool.runner}, but --no-tool-downloads is set.`,
        `Install '${tool.command}' yourself or rerun without --no-tool-downloads / with --skip-impeccable.`,
      ].join("\n"),
    );
  }

  const runner = tool.runner;
  if (!commandExists(runner)) {
    throw new SetupError(`ERROR: ${runner} is required to run pinned ${tool.label} package ${toolPackageSpec(tool)}.`);
  }
  return { mode: "package", unpinned: false, probe: { status: "package", version: tool.version } };
}

async function shouldInstallMissingTool(tool, probe, io) {
  const decision = await promptToolDecision(io, tool, probe);
  if (decision === "install") return true;
  if (decision === "abort") {
    throw new SetupError(`ERROR: ${tool.label} setup aborted by user.`);
  }
  return false;
}

async function installPersistentTool(tool, options, io, verb) {
  const invocation = buildToolInstallInvocation(tool);
  if (!commandExists(invocation.command)) {
    throw new SetupError(`ERROR: ${invocation.command} is required for ${tool.label}; install it or rerun without --ensure-tools after placing '${tool.command}' on PATH.`);
  }
  const result = await runLoggedCommand(invocation.command, invocation.args, {
    env: invocation.env,
    allowFailure: true,
    io,
    verbose: options.verboseTools,
    action: `${tool.label}: ${verb} pinned ${toolPackageSpec(tool)} via ${invocation.command}`,
  });
  if (result.status !== 0) {
    note(`${tool.label} installation failed.`, io);
    throw new SetupError(`ERROR: ${tool.label} installation failed:\n${result.combined.trim()}`);
  }
  if (!commandExists(tool.command)) {
    throw new SetupError(
      [
        `ERROR: ${tool.label} installed but command '${tool.command}' is not visible on PATH.`,
        "Restart your terminal or IDE, ensure the package manager's tool directory is on PATH, then re-run setup.",
      ].join("\n"),
    );
  }
  verifyPersistentToolVersion(tool);
  io.stdout.write(`  ${tool.label}: verified ${tool.command} ${tool.version}\n`);
}

function missingToolMessage(tool, reason) {
  return [
    `ERROR: ${tool.label} is required but '${tool.command}' is not installed (${reason}).`,
    `Install ${toolPackageSpec(tool)} or rerun setup with --ensure-tools to let setup install the pinned version.`,
  ].join("\n");
}

function warnUnpinnedTool(tool, probe, action, io) {
  if (probe.status === "mismatched") {
    if (action === "using existing") {
      note(`${tool.label}: found installed ${tool.command} ${probe.version}; using installed command. Pinned recommendation is ${toolPackageSpec(tool)}.`, io);
      return;
    }
    note(`${tool.label}: found installed ${tool.command} ${probe.version}; ${action} ${toolPackageSpec(tool)}.`, io);
  } else {
    if (action === "using existing") {
      note(`${tool.label}: found installed ${tool.command}, but version could not be verified; using installed command. Pinned recommendation is ${toolPackageSpec(tool)}.`, io);
      return;
    }
    note(`${tool.label}: found installed ${tool.command}, but version could not be verified; ${action} ${toolPackageSpec(tool)}.`, io);
  }
}

function spawnVersionCommand(tool) {
  try {
    return spawnForProbe(tool.command, tool.versionArgs || ["--version"]);
  } catch (error) {
    return { status: 1, stdout: "", stderr: error.message, combined: error.message };
  }
}

function toolActionLabel(tool, mode, invocation, args) {
  const command = args[0] || "command";
  if (mode === "installed") {
    return `${tool.label}: running ${command} via installed '${tool.command}'`;
  }
  return `${tool.label}: running ${command} via pinned ${toolPackageSpec(tool)} with ${invocation.command}`;
}
