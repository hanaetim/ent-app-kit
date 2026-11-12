import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { claudeCodeAdapter } from "../src/adapters/claude-code.js";
import { codexAdapter } from "../src/adapters/codex.js";
import { ibmBobAdapter } from "../src/adapters/ibm-bob.js";
import { kiroAdapter } from "../src/adapters/kiro.js";
import { getAgentAdapter, isSupportedAgent } from "../src/adapters/registry.js";
import { formatCliError } from "../src/cli-error.js";
import { main } from "../src/cli.js";
import { ensureRuntimeDependencies, hasRuntimeDependencies, npmCommand, RUNTIME_DEPENDENCIES } from "../src/runtime-deps.js";
import { runCompileCheck, runChecks } from "../src/setup/compile-check.js";
import { readJsonFile, readReposConfig, readYamlFile, validateDocument, writeYamlFile } from "../src/setup/config.js";
import { installDriver, resolveAgentInstructionsPolicy } from "../src/setup/driver.js";
import { initImpeccable } from "../src/setup/impeccable.js";
import { runSetup } from "../src/setup/index.js";
import { initOpenSpecWorkspace, initSpeckitWorkspace } from "../src/setup/methods.js";
import { parseSetupArgs } from "../src/setup/options.js";
import { formatToolOutput, note, status, streamColors } from "../src/setup/output.js";
import { copyReplace, directoryHasContent, skillInstallDir, skillRefRoot, walkFiles, workspaceRelPath } from "../src/setup/paths.js";
import { commandExists, isolatedNpmExecEnv, runLoggedCommand, spawn } from "../src/setup/process.js";
import { promptAgentInstructionsDecision, promptMissingOptions, promptToolDecision } from "../src/setup/prompt.js";
import { materializeRepo } from "../src/setup/repos.js";
import { installSkills } from "../src/setup/skills.js";
import { baseState, detectPayload, loadState, writeCompileState, writeWorkspaceState } from "../src/setup/state.js";
import { printSetupSummary } from "../src/setup/summary.js";
import {
  buildToolInstallInvocation,
  buildToolInvocation,
  ensureSetupTools,
  getSetupTool,
  prepareSetupTool,
  probeToolVersion,
  runSetupTool,
  selectedSetupToolIds,
  toolPackageSpec,
} from "../src/setup/tools.js";
import { requireCommands, requireFiles, validateSetupSelection } from "../src/setup/validate.js";
import { initializeWorkspace, resolveKitRoot, validateKitPackage } from "../src/setup/workspace.js";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("runtime dependency bootstrap covers present, install, and failure paths", () => {
  assert.deepEqual(RUNTIME_DEPENDENCIES, ["ajv", "@clack/prompts", "yaml"]);
  assert.equal(npmCommand("win32"), "npm.cmd");
  assert.equal(npmCommand("darwin"), "npm");

  assert.equal(hasRuntimeDependencies(makeResolver(() => "/resolved")), true);
  assert.equal(hasRuntimeDependencies(makeResolver(() => {
    throw new Error("missing");
  })), false);

  let spawnCalls = 0;
  assert.equal(ensureRuntimeDependencies({
    resolver: makeResolver(() => "/resolved"),
    spawnSync() {
      spawnCalls += 1;
      return { status: 0 };
    },
  }), false);
  assert.equal(spawnCalls, 0);

  let resolveCalls = 0;
  const stderr = makeWritable();
  const installed = ensureRuntimeDependencies({
    packageRoot: "/workspace/ent-app-kit",
    platform: "linux",
    stderr,
    env: { PATH: "/bin" },
    resolver: makeResolver(() => {
      resolveCalls += 1;
      if (resolveCalls === 1) throw new Error("missing before install");
      return "/resolved";
    }),
    spawnSync(command, args, options) {
      spawnCalls += 1;
      assert.equal(command, "npm");
      assert.deepEqual(args, ["install", "--omit=dev", "--no-audit", "--fund=false", "--ignore-scripts"]);
      assert.equal(options.cwd, "/workspace/ent-app-kit");
      assert.equal(options.env.PATH, "/bin");
      assert.equal(options.stdio, "inherit");
      return { status: 0 };
    },
  });
  assert.equal(installed, true);
  assert.match(stderr.content, /Installing ent-app-kit runtime dependencies/);

  assert.throws(() => ensureRuntimeDependencies({
    resolver: makeResolver(() => {
      throw new Error("missing");
    }),
    spawnSync: () => ({ error: new Error("spawn failed") }),
    stderr: makeWritable(),
  }), /failed to install ent-app-kit runtime dependencies: spawn failed/);

  assert.throws(() => ensureRuntimeDependencies({
    resolver: makeResolver(() => {
      throw new Error("missing");
    }),
    spawnSync: () => ({ status: 17 }),
    stderr: makeWritable(),
  }), /exit code 17/);

  assert.throws(() => ensureRuntimeDependencies({
    resolver: makeResolver(() => {
      throw new Error("missing");
    }),
    spawnSync: () => ({ status: 0 }),
    stderr: makeWritable(),
  }), /required modules are still unavailable/);

  let defaultResolveCalls = 0;
  const defaultCaptured = captureProcessStderr(() => {
    assert.equal(ensureRuntimeDependencies({
      resolver: makeResolver(() => {
        defaultResolveCalls += 1;
        if (defaultResolveCalls === 1) throw new Error("install first");
        return "/resolved";
      }),
      spawnSync(command, args, options) {
        assert.equal(command, npmCommand(process.platform));
        assert.equal(options.cwd, kitRoot);
        assert.equal(options.env, process.env);
        return { status: 0 };
      },
    }), true);
  });
  assert.match(defaultCaptured, /Installing ent-app-kit runtime dependencies/);
});

test("CLI error formatting normalizes Error, SetupError-like, and primitive throws", () => {
  assert.deepEqual(formatCliError(new Error("boom")), { message: "boom", exitCode: 1 });
  assert.deepEqual(formatCliError({ message: "canceled", exitCode: 130 }), { message: "canceled", exitCode: 130 });
  assert.deepEqual(formatCliError("plain failure"), { message: "plain failure", exitCode: 1 });
});

test("main command router prints root and setup help and rejects unknown commands", async () => {
  const rootHelp = makeIo();
  assert.equal(await main(["node", "ent-app-kit"], asProcessIo(rootHelp)), 0);
  assert.match(rootHelp.capture.stdout, /Enterprise App Kit CLI/);
  assert.match(rootHelp.capture.stdout, /ent-app-kit setup \[options\]/);

  const setupHelp = makeIo();
  assert.equal(await main(["node", "ent-app-kit", "setup", "--help"], asProcessIo(setupHelp)), 0);
  assert.match(setupHelp.capture.stdout, /Enterprise App Kit setup/);
  assert.match(setupHelp.capture.stdout, /--method <speckit\|openspec>/);

  const unknown = makeIo();
  await assert.rejects(
    () => main(["node", "ent-app-kit", "nope"], asProcessIo(unknown)),
    /unknown command: nope/,
  );
  assert.match(unknown.capture.stderr, /Commands:/);
});

test("option parsing rejects unknown flags and missing values", () => {
  assert.equal(parseSetupArgs(["--verbose-tools"]).verboseTools, true);
  assert.equal(parseSetupArgs(["--help"]).help, true);
  assert.equal(parseSetupArgs(["-h"]).help, true);
  assert.throws(() => parseSetupArgs(["--agent"]), /missing value for --agent/);
  assert.throws(() => parseSetupArgs(["--agent", "--method"]), /missing value for --agent/);

  const captured = captureProcessStderr(() => {
    assert.throws(() => parseSetupArgs(["--wat"]), /unknown option: --wat/);
  });
  assert.match(captured, /Enterprise App Kit setup/);
});

test("config helpers report read, root, schema id, and schema formatting failures", () => {
  const missing = path.join(makeTempDir("config"), "missing.yaml");
  assert.throws(() => readYamlFile(missing, "missing.yaml"), /failed to read missing\.yaml/);
  assert.throws(() => readJsonFile(missing, "missing.json"), /failed to read missing\.json/);

  const schema = {
    $id: "example-schema",
    type: "object",
    additionalProperties: false,
    required: ["schema", "mode", "name", "kind", "exact"],
    properties: {
      schema: { const: "example-schema" },
      mode: { enum: ["one", "two"] },
      name: { type: "string" },
      kind: { type: "string" },
      exact: { const: "fixed" },
    },
  };

  assert.throws(() => validateDocument(null, schema, "config.yaml"), /root document must be a mapping/);
  assert.throws(() => validateDocument({ schema: "other" }, schema, "config.yaml"), /schema id "other" does not match "example-schema"/);
  assert.throws(
    () => validateDocument({ schema: "example-schema", mode: "bad", extra: true }, schema, "config.yaml"),
    /missing required key "name"[\s\S]*unexpected key "extra"[\s\S]*expected one of \["one", "two"\]/,
  );
  assert.throws(
    () => validateDocument({ schema: "example-schema", mode: "one", name: 42, kind: "ok", exact: "wrong" }, schema, "config.yaml"),
    /must be string[\s\S]*expected "fixed"/,
  );
});

test("output formatting handles color, warnings, compile summaries, and plain lines", () => {
  const noColor = streamColors({ isTTY: false });
  assert.deepEqual(noColor, { reset: "", bold: "", cyan: "", yellow: "", reverse: "" });

  const originalNoColor = process.env.NO_COLOR;
  delete process.env.NO_COLOR;
  try {
    const colors = streamColors({ isTTY: true });
    assert.equal(colors.bold, "\x1b[1m");
    assert.equal(colors.reverse, "\x1b[7m");
  } finally {
    restoreEnvValue("NO_COLOR", originalNoColor);
  }

  const io = makeIo();
  status("Section", io);
  note("careful", io);
  formatToolOutput("WARN: first\nCompile check passed with 3 warnings\nCompile check passed cleanly\nplain\n", io);
  assert.match(io.capture.stdout, /Section/);
  assert.match(io.capture.stdout, /Checks passed with 3 setup note\(s\)/);
  assert.match(io.capture.stdout, /Compile check passed cleanly/);
  assert.match(io.capture.stdout, /plain/);
  assert.match(io.capture.stderr, /first/);
  assert.match(io.capture.stderr, /careful/);
});

test("path helpers cover empty, non-empty, copy, walk, and agent surface paths", () => {
  const root = makeTempDir("paths");
  const source = path.join(root, "source");
  const target = path.join(root, "target");
  fs.mkdirSync(path.join(source, "nested"), { recursive: true });
  fs.writeFileSync(path.join(source, "nested", "file.txt"), "hello");

  assert.equal(directoryHasContent(path.join(root, "missing")), false);
  fs.mkdirSync(target);
  assert.equal(directoryHasContent(target), false);
  copyReplace(source, target);
  assert.equal(directoryHasContent(target), true);
  assert.deepEqual([...walkFiles(target)].map((file) => path.basename(file)), ["file.txt"]);
  assert.equal(workspaceRelPath(root, root), ".");
  assert.equal(skillInstallDir("/workspace", "/workspace/ent-app-kit", "codex"), path.join("/workspace", ".agents", "skills"));
  assert.equal(skillRefRoot("kiro"), ".kiro/skills");
});

test("process helpers cover spawn and async child error paths", async () => {
  const missingCommand = path.join(makeTempDir("process"), "missing-command");
  assert.equal(commandExists("definitely-missing-command", { PATH: "" }), false);
  const windowsBin = makeTempDir("windows-bin");
  writeExecutable(windowsBin, "tool.CMD", "");
  assert.equal(commandExists("tool", { PATH: windowsBin, PATHEXT: ".CMD" }, "win32"), true);
  assert.throws(() => spawn(missingCommand, []), /failed to run/);
  assert.throws(() => spawn(process.execPath, ["-e", "process.exit(5)"], { label: "bad node" }), /bad node failed/);

  const io = makeIo();
  const completed = await runLoggedCommand(process.execPath, ["-e", ""], { io, detail: "extra", heartbeatMs: 0 });
  assert.equal(completed.status, 0);
  assert.match(io.capture.stdout, /node \(extra\)/);
  const failedAllowed = await runLoggedCommand(process.execPath, ["-e", "process.exit(3)"], { io, heartbeatMs: 0, allowFailure: true });
  assert.equal(failedAllowed.status, 3);
  await assert.rejects(
    () => runLoggedCommand(missingCommand, [], { io, heartbeatMs: 0 }),
    /failed to run/,
  );
  const allowed = await runLoggedCommand(missingCommand, [], { io, heartbeatMs: 0, allowFailure: true });
  assert.equal(allowed.status, 1);
  assert.ok(allowed.error);

  const env = isolatedNpmExecEnv({
    npm_config_package: "x",
    npm_config_packages: "x",
    npm_config_call: "x",
    npm_config_argv: "x",
    KEEP_ME: "yes",
  });
  assert.equal(env.KEEP_ME, "yes");
  assert.equal(env.npm_config_package, undefined);
  assert.equal(env.npm_config_packages, undefined);
  assert.equal(env.npm_config_call, undefined);
  assert.equal(env.npm_config_argv, undefined);
});

test("validation and workspace helpers reject invalid setup state early", () => {
  assert.throws(() => validateSetupSelection({ agent: "bad", method: "openspec", mode: "autopilot" }), /unsupported agent: bad/);
  assert.throws(() => validateSetupSelection({ agent: "codex", method: "openspec", mode: "bad" }), /unsupported mode: bad/);
  assert.throws(
    () => validateSetupSelection({ agent: "codex", method: "openspec", mode: "autopilot", replaceAgentInstructions: true, keepAgentInstructions: true }),
    /--replace-agent-instructions cannot be combined/,
  );

  const oldPath = process.env.PATH;
  process.env.PATH = "";
  try {
    assert.throws(() => requireCommands({}), /required command\(s\) missing/);
  } finally {
    restoreEnvValue("PATH", oldPath);
  }

  const workspace = makeTempDir("workspace");
  assert.throws(() => validateKitPackage(workspace), /package assets are incomplete/);
  assert.throws(() => resolveKitRoot(workspace), /direct parent directory/);

  const copiedKit = makeCopiedKit({ assembled: true });
  assert.throws(() => resolveKitRoot(copiedKit), /inside ent-app-kit/);
  const parent = makeTempDir("workspace-parent");
  fs.cpSync(copiedKit, path.join(parent, "ent-app-kit"), { recursive: true });
  assert.equal(resolveKitRoot(parent), path.join(parent, "ent-app-kit"));

  const missingPayloadKit = makeCopiedKit();
  fs.rmSync(path.join(missingPayloadKit, "payload", "repos.yaml"), { force: true });
  assert.throws(() => requireFiles(missingPayloadKit, { method: "openspec" }), /payload\/repos\.yaml is required/);
  fs.copyFileSync(path.join(kitRoot, "examples", "payload", "minimal", "repos.yaml"), path.join(missingPayloadKit, "payload", "repos.yaml"));
  fs.rmSync(path.join(missingPayloadKit, "src", "cli.js"));
  assert.throws(() => requireFiles(missingPayloadKit, { method: "openspec" }), /required file not found/);
});

test("repository materialization covers brownfield and existing greenfield branches", () => {
  const workspace = makeTempDir("repos");
  const io = makeIo();

  assert.throws(
    () => materializeRepo(workspace, { name: "bad", source: "weird", workspace_path: "repos/bad" }, io),
    /unknown source 'weird'/,
  );

  const existingGreenfield = path.join(workspace, "repos", "existing-greenfield");
  initGitRepo(existingGreenfield);
  materializeRepo(workspace, { name: "existing-greenfield", source: "greenfield", workspace_path: "repos/existing-greenfield" }, io);
  assert.match(io.capture.stdout, /already initialized at repos\/existing-greenfield/);

  assert.throws(
    () => materializeRepo(workspace, { name: "brown", source: "brownfield", workspace_path: "repos/missing-brown" }, io),
    /not an existing git repository/,
  );

  const existingBrownfield = path.join(workspace, "repos", "existing-brownfield");
  initGitRepo(existingBrownfield);
  materializeRepo(workspace, { name: "existing-brownfield", source: "brownfield", workspace_path: "repos/existing-brownfield" }, io);
  assert.match(io.capture.stdout, /using existing copy at repos\/existing-brownfield/);

  spawn("git", ["-C", existingBrownfield, "remote", "add", "origin", "git@example.com:repo.git"]);
  materializeRepo(workspace, {
    name: "existing-brownfield",
    source: "brownfield",
    workspace_path: "repos/existing-brownfield",
    remote: "git@example.com:repo.git",
  }, asProcessIo(io));
  assert.match(io.capture.stdout, /already cloned at repos\/existing-brownfield/);

  assert.throws(
    () => materializeRepo(workspace, {
      name: "existing-brownfield",
      source: "brownfield",
      workspace_path: "repos/existing-brownfield",
      remote: "git@example.com:other.git",
    }, io),
    /already has origin/,
  );

  const occupied = path.join(workspace, "repos", "occupied");
  fs.mkdirSync(occupied, { recursive: true });
  fs.writeFileSync(path.join(occupied, "README.md"), "not git");
  assert.throws(
    () => materializeRepo(workspace, {
      name: "occupied",
      source: "brownfield",
      workspace_path: "repos/occupied",
      remote: "git@example.com:occupied.git",
    }, io),
    /non-empty directory without \.git/,
  );

  assert.throws(
    () => materializeRepo(workspace, {
      name: "clone-fail",
      source: "brownfield",
      workspace_path: "repos/clone-fail",
      remote: "/definitely/missing/repo.git",
      branch: "main",
    }, io),
    /failed to clone '\/definitely\/missing\/repo.git'/,
  );
});

test("compile checks cover command output, schema, skill, manifest, method, and adapter failures", () => {
  const workspace = makeTempDir("compile-workspace");
  const assembledKit = makeCopiedKit({ assembled: true });
  writeBootstrapStateForTest(assembledKit, workspace, { agent: "codex", method: "openspec", mode: "autopilot" });

  const io = makeIo();
  runCompileCheck(assembledKit, workspace, io);
  assert.match(io.capture.stdout, /Checks passed/);
  assert.equal(loadState(workspace).compile_check.status, "pass");

  const brokenRuntime = makeCopiedKit({ assembled: true });
  fs.rmSync(path.join(brokenRuntime, "src", "setup", "config.js"));
  assert.throws(() => runCompileCheck(brokenRuntime, workspace, makeIo()), /Compile check failed/);

  const emptyPayloadKit = makeCopiedKit({ assembled: true });
  emptyPayloadExceptRepos(emptyPayloadKit);
  const emptyPayloadResult = runChecks(emptyPayloadKit, workspace).toState();
  assert.equal(emptyPayloadResult.checks.payload, "warn");
  assert.match(emptyPayloadResult.warning_details.join("\n"), /contains no content beyond repos\.yaml/);

  const missingSkill = makeCopiedKit({ assembled: true });
  fs.rmSync(path.join(missingSkill, "skills", "kit-conformance", "SKILL.md"));
  const missingSkillResult = runChecks(missingSkill, workspace).toState();
  assert.equal(missingSkillResult.checks.skills, "fail");
  assert.match(missingSkillResult.error_details.join("\n"), /missing required skill/);

  const badManifest = makeCopiedKit({ assembled: true });
  fs.writeFileSync(path.join(badManifest, "manifest.yaml"), "[]\n");
  const badManifestResult = runChecks(badManifest, workspace).toState();
  assert.match(badManifestResult.error_details.join("\n"), /manifest\.yaml did not parse as a mapping/);

  const missingMethodSkill = makeCopiedKit({ assembled: true });
  fs.rmSync(path.join(missingMethodSkill, "skills", "kit-method-openspec", "SKILL.md"));
  const missingMethodResult = runChecks(missingMethodSkill, workspace).toState();
  assert.match(missingMethodResult.error_details.join("\n"), /selected method skill is missing: kit-method-openspec/);

  const unsupportedAgentWorkspace = makeTempDir("compile-agent");
  writeYamlFile(path.join(unsupportedAgentWorkspace, ".kit-state", "state.yaml"), {
    schema: "appkit-state-v1",
    selected: { agent: "unknown", method: "openspec" },
  });
  const unsupportedAgentResult = runChecks(assembledKit, unsupportedAgentWorkspace).toState();
  assert.match(unsupportedAgentResult.error_details.join("\n"), /selected agent 'unknown' is not supported/);

  const originalValidate = codexAdapter.validate;
  codexAdapter.validate = () => ({ ok: false, errors: [] });
  try {
    const adapterFailure = runChecks(assembledKit, workspace).toState();
    assert.match(adapterFailure.error_details.join("\n"), /selected agent 'codex' adapter validation failed/);
  } finally {
    codexAdapter.validate = originalValidate;
  }
});

test("setup tools select, probe, and prepare installed tools", async () => {
  assert.deepEqual(selectedSetupToolIds({ method: "openspec", agent: "codex", installImpeccable: true }), ["openspec", "impeccable"]);
  assert.deepEqual(selectedSetupToolIds({ method: "speckit", agent: "codex", installImpeccable: false }), ["speckit"]);
  await ensureSetupTools({ method: undefined, installImpeccable: false }, makeIo());

  const ensureBin = makeFakeBin();
  writeExecutable(ensureBin, "openspec", toolSource("openspec", getSetupTool("openspec").version));
  await withPath(ensureBin, async () => {
    const ensureIo = makeIo();
    await ensureSetupTools({
      method: "openspec",
      agent: "codex",
      installImpeccable: false,
      noToolDownloads: true,
      verboseTools: false,
    }, ensureIo);
    assert.match(ensureIo.capture.stdout, /matches pinned/);
  });

  assert.throws(() => getSetupTool("missing"), /unknown setup tool/);
  assert.throws(() => buildToolInvocation({ id: "bad", runner: "bad" }), /unsupported runner/);
  assert.throws(() => buildToolInstallInvocation({ id: "bad", runner: "npx" }), /does not support persistent installation/);

  await withPath("", async () => {
    assert.deepEqual(probeToolVersion(getSetupTool("impeccable")), { status: "missing", version: null, output: "" });
    assert.deepEqual(probeToolVersion(getSetupTool("openspec")), { status: "missing", version: null, output: "" });
    await assert.rejects(
      () => prepareSetupTool("openspec", { noToolDownloads: true }, makeIo()),
      /OpenSpec is required but 'openspec' is not installed/,
    );
    await assert.rejects(
      () => prepareSetupTool("openspec", { ensureTools: true }, makeIo()),
      /npm is required for OpenSpec/,
    );
    await assert.rejects(
      () => prepareSetupTool("impeccable", { noToolDownloads: false }, makeIo()),
      /npx is required to run pinned Impeccable package/,
    );
  });

  const packageBin = makeFakeBin();
  writeExecutable(packageBin, "impeccable", "#!/usr/bin/env node\nprocess.exit(0);\n");
  await withPath(packageBin, async () => {
    assert.deepEqual(probeToolVersion(getSetupTool("impeccable")), { status: "present", version: null, output: "" });
    const prepared = await prepareSetupTool("impeccable", { noToolDownloads: true }, makeIo());
    assert.equal(prepared.mode, "installed");
    assert.equal(prepared.unpinned, true);
  });

  const versionBin = makeFakeBin();
  writeExecutable(versionBin, "openspec", "#!/usr/bin/env node\nconsole.log(process.argv.includes('--version') ? 'openspec version unknown' : 'run');\n");
  await withPath(versionBin, async () => {
    assert.equal(probeToolVersion(getSetupTool("openspec")).status, "unknown");
  });

  const defaultInstallBin = makeFakeBin();
  writeExecutable(defaultInstallBin, "openspec", toolSource("openspec", getSetupTool("openspec").version));
  await withPath(defaultInstallBin, async () => {
    const runIo = makeIo();
    const result = await runSetupTool("openspec", [], {
      noToolDownloads: true,
      verboseTools: false,
    }, runIo, { allowFailure: true });
    assert.equal(result.status, 0);
    assert.match(runIo.capture.stdout, /running command via installed 'openspec'/);
  });

  const badExecutableBin = makeFakeBin();
  fs.mkdirSync(path.join(badExecutableBin, "openspec"));
  fs.chmodSync(path.join(badExecutableBin, "openspec"), 0o755);
  await withPath(badExecutableBin, async () => {
    const probe = probeToolVersion(getSetupTool("openspec"));
    assert.equal(probe.status, "unknown");
    assert.match(probe.output, /EACCES|permission denied|Unknown system error/);
  });
});

test("setup tools report persistent install verification failures", async () => {
  const installFailBin = makeFakeBin();
  writeExecutable(installFailBin, "npm", "#!/usr/bin/env node\nconsole.log('install stdout'); console.error('install stderr'); process.exit(9);\n");
  await withPath(installFailBin, async () => {
    await assert.rejects(
      () => prepareSetupTool("openspec", { ensureTools: true }, makeIo()),
      /OpenSpec installation failed:[\s\S]*install stdout[\s\S]*install stderr/,
    );
  });

  const unknownAfterInstallBin = makeFakeBin();
  writeExecutable(unknownAfterInstallBin, "npm", installerSource("openspec", "openspec version unknown"));
  await withPath(unknownAfterInstallBin, async () => {
    await assert.rejects(
      () => prepareSetupTool("openspec", { ensureTools: true }, makeIo()),
      /version could not be verified/,
    );
  });
});

test("setup tools handle interactive update and abort decisions", async () => {
  const promptUpdateBin = makeFakeBin();
  writeExecutable(promptUpdateBin, "openspec", toolSource("openspec", "0.0.1"));
  writeExecutable(promptUpdateBin, "npm", installerSource("openspec", `openspec ${getSetupTool("openspec").version}`));
  await withPath(promptUpdateBin, async () => {
    const io = makePromptIo();
    const promise = prepareSetupTool("openspec", { noToolDownloads: false }, io);
    writePromptKeys(io, ["\x1B[B", "\r"]);
    const prepared = await promise;
    assert.equal(prepared.mode, "installed");
    assert.match(io.capture.stderr, /Updating to/);
  });

  const promptAbortBin = makeFakeBin();
  writeExecutable(promptAbortBin, "openspec", toolSource("openspec", "0.0.1"));
  await withPath(promptAbortBin, async () => {
    const io = makePromptIo();
    const promise = prepareSetupTool("openspec", { noToolDownloads: false }, io);
    writePromptKeys(io, ["\x1B[B", "\x1B[B", "\r"]);
    await assert.rejects(promise, /OpenSpec setup aborted by user/);
  });

  const missingAbortBin = makeFakeBin();
  writeExecutable(missingAbortBin, "npm", "#!/usr/bin/env node\nprocess.exit(0);\n");
  await withPath(missingAbortBin, async () => {
    const io = makePromptIo();
    const promise = prepareSetupTool("openspec", { noToolDownloads: false }, io);
    writePromptKeys(io, ["\x1B[B", "\r"]);
    await assert.rejects(promise, /OpenSpec setup aborted by user/);
  });
});

test("setup tool runs surface installed command failures", async () => {
  const runFailBin = makeFakeBin();
  writeExecutable(runFailBin, "openspec", toolSource("openspec", getSetupTool("openspec").version, "process.exit(6);"));
  await withPath(runFailBin, async () => {
    const result = await runSetupTool("openspec", ["command"], {
      noToolDownloads: true,
      verboseTools: false,
    }, makeIo(), { allowFailure: true });
    assert.equal(result.status, 6);
  });

  const unpinnedRunFailBin = makeFakeBin();
  writeExecutable(unpinnedRunFailBin, "openspec", toolSource("openspec", "0.0.1", "process.exit(7);"));
  await withPath(unpinnedRunFailBin, async () => {
    const runIo = makeIo();
    const result = await runSetupTool("openspec", ["command"], {
      noToolDownloads: true,
      verboseTools: false,
    }, runIo, { allowFailure: true });
    assert.equal(result.status, 7);
    assert.match(runIo.capture.stderr, /unpinned installed command/);
  });
});

test("method initialization covers no-op and failed setup tool output paths", async () => {
  const workspace = makeTempDir("methods");
  const kit = makeCopiedKit({ assembled: true });
  const io = makeIo();

  await initSpeckitWorkspace(kit, workspace, { method: "openspec" }, io);
  await initOpenSpecWorkspace(workspace, { method: "speckit" }, io);

  const speckitBin = makeFakeBin();
  writeExecutable(speckitBin, "specify", toolSource("specify-cli", getSetupTool("speckit").version, "console.log('bad init'); process.exit(7);"));
  await withPath(speckitBin, async () => {
    await assert.rejects(
      () => initSpeckitWorkspace(kit, workspace, {
        agent: "codex",
        method: "speckit",
        noToolDownloads: true,
        verboseTools: false,
      }, makeIo()),
      /Spec Kit initialization failed/,
    );
  });

  const openspecBin = makeFakeBin();
  writeExecutable(openspecBin, "openspec", toolSource("openspec", getSetupTool("openspec").version, "console.log('bad init'); process.exit(8);"));
  await withPath(openspecBin, async () => {
    await assert.rejects(
      () => initOpenSpecWorkspace(workspace, {
        agent: "codex",
        method: "openspec",
        noToolDownloads: true,
        verboseTools: false,
      }, makeIo()),
      /OpenSpec initialization failed/,
    );
  });
});

test("runSetup executes compile check branch in-process", async () => {
  const workspace = makeTempDir("run-setup");
  const copiedKit = path.join(workspace, "ent-app-kit");
  fs.cpSync(makeCopiedKit({ assembled: true }), copiedKit, { recursive: true });
  fs.mkdirSync(path.join(workspace, "openspec"), { recursive: true });

  const io = makeIo();
  await runSetup({
    workspaceRoot: workspace,
    agent: "codex",
    method: "openspec",
    mode: "autopilot",
    agentSet: true,
    methodSet: true,
    modeSet: true,
    nonInteractive: true,
    replaceAgentInstructions: false,
    keepAgentInstructions: false,
    installImpeccable: false,
    ensureTools: false,
    noToolDownloads: true,
    verboseTools: false,
    runCompileCheck: true,
  }, asProcessIo(io));

  assert.match(io.capture.stdout, /Setup checks/);
  assert.equal(loadState(workspace).compile_check.status, "pass");
});

test("impeccable setup covers skipped, provider, failure, and missing skill-only outputs", async () => {
  await initImpeccable(makeTempDir("impeccable-skip"), { installImpeccable: false, agent: "codex" }, makeIo());

  const originalCodexImpeccable = codexAdapter.impeccable;
  codexAdapter.impeccable = null;
  try {
    const io = makeIo();
    await initImpeccable(makeTempDir("impeccable-no-provider"), { installImpeccable: true, agent: "codex" }, io);
    assert.match(io.capture.stderr, /no provider mapping for agent 'codex'/);
  } finally {
    codexAdapter.impeccable = originalCodexImpeccable;
  }

  const providerBin = makeFakeBin();
  writeExecutable(providerBin, "npx", "#!/usr/bin/env node\nprocess.exit(0);\n");
  await withPath(providerBin, async () => {
    const io = makeIo();
    await initImpeccable(makeTempDir("impeccable-provider"), {
      installImpeccable: true,
      agent: "codex",
      noToolDownloads: false,
      verboseTools: false,
    }, io);
    assert.match(io.capture.stdout, /Installed Impeccable for provider: codex/);
  });

  const failBin = makeFakeBin();
  writeExecutable(failBin, "npx", "#!/usr/bin/env node\nconsole.error('nope'); process.exit(4);\n");
  await withPath(failBin, async () => {
    await assert.rejects(
      () => initImpeccable(makeTempDir("impeccable-fail"), {
        installImpeccable: true,
        agent: "codex",
        noToolDownloads: false,
        verboseTools: false,
      }, makeIo()),
      /Impeccable installation failed/,
    );
  });

  const missingSkillBin = makeFakeBin();
  writeExecutable(missingSkillBin, "npx", "#!/usr/bin/env node\nprocess.exit(0);\n");
  await withPath(missingSkillBin, async () => {
    await assert.rejects(
      () => initImpeccable(makeTempDir("impeccable-missing-skill"), {
        installImpeccable: true,
        agent: "ibm-bob",
        noToolDownloads: false,
        verboseTools: false,
      }, makeIo()),
      /did not produce expected skill/,
    );
  });

  const skillOnlySuccessBin = makeFakeBin();
  writeExecutable(skillOnlySuccessBin, "npx", `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const target = path.join(process.cwd(), ".agents", "skills", "impeccable");
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, "SKILL.md"), "Use .agents/skills/impeccable.\\n");
fs.writeFileSync(path.join(target, "asset.txt"), ".agents/skills/impeccable should remain here.\\n");
`);
  await withPath(skillOnlySuccessBin, async () => {
    const workspace = makeTempDir("impeccable-skill-only-success");
    await initImpeccable(workspace, {
      installImpeccable: true,
      agent: "ibm-bob",
      noToolDownloads: false,
      verboseTools: false,
    }, makeIo());
    assert.match(fs.readFileSync(path.join(workspace, ".bob", "skills", "impeccable", "SKILL.md"), "utf8"), /\.bob\/skills\/impeccable/);
    assert.match(fs.readFileSync(path.join(workspace, ".bob", "skills", "impeccable", "asset.txt"), "utf8"), /\.agents\/skills\/impeccable/);
  });

  const skillOnlyFailBin = makeFakeBin();
  writeExecutable(skillOnlyFailBin, "npx", "#!/usr/bin/env node\nconsole.error('skill only failed'); process.exit(5);\n");
  await withPath(skillOnlyFailBin, async () => {
    await assert.rejects(
      () => initImpeccable(makeTempDir("impeccable-skill-only-fail"), {
        installImpeccable: true,
        agent: "ibm-bob",
        noToolDownloads: false,
        verboseTools: false,
      }, makeIo()),
      /Impeccable installation failed/,
    );
  });
});

test("skills, state, driver, summary, and adapter helpers cover alternate branches", async () => {
  assert.equal(isSupportedAgent("codex"), true);
  assert.equal(isSupportedAgent("nope"), false);
  assert.throws(() => getAgentAdapter("nope"), /unsupported agent: nope/);
  for (const adapter of [codexAdapter, claudeCodeAdapter, ibmBobAdapter, kiroAdapter]) {
    assert.deepEqual(adapter.validate({ workspaceRoot: "/w", kitRoot: "/w/ent-app-kit" }), { ok: true, errors: [] });
  }

  const kit = makeCopiedKit({ assembled: true });
  const workspace = makeTempDir("state");
  const externalKit = makeCopiedKit({ assembled: true });
  const state = baseState(externalKit, workspace);
  assert.equal(path.isAbsolute(state.paths.kit), true);

  writeYamlFile(path.join(workspace, ".kit-state", "state.yaml"), ["not", "mapping"]);
  assert.deepEqual(loadState(workspace), {});
  writeCompileState(kit, workspace, { status: "pass" });
  assert.equal(loadState(workspace).compile_check.status, "pass");

  const payloadKit = makeCopiedKit({ assembled: true });
  fs.writeFileSync(path.join(payloadKit, "payload", "custom.txt"), "content");
  fs.writeFileSync(path.join(payloadKit, "payload", "air"), "file content");
  fs.mkdirSync(path.join(payloadKit, "payload", "connectivity"), { recursive: true });
  fs.writeFileSync(path.join(payloadKit, "payload", "connectivity", ".gitkeep"), "");
  fs.mkdirSync(path.join(payloadKit, "payload", "nfr"), { recursive: true });
  fs.writeFileSync(path.join(payloadKit, "payload", "nfr", "notes.md"), "nfr");
  const detectedPayload = detectPayload(payloadKit);
  assert.ok(detectedPayload.domains.includes("air"));
  assert.ok(detectedPayload.domains.includes("nfr"));
  assert.ok(detectedPayload.content.includes("custom.txt"));
  assert.deepEqual(detectPayload(path.join(makeTempDir("no-payload"), "kit")), { domains: [], content: [] });

  writeWorkspaceState(kit, workspace);
  assert.equal(loadState(workspace).schema, "appkit-state-v1");

  const skillsWorkspace = makeTempDir("skills");
  const originalMaterialized = codexAdapter.materialized;
  codexAdapter.materialized = false;
  try {
    assert.equal(installSkills(kit, skillsWorkspace, { agent: "codex" }), path.join(skillsWorkspace, ".agents", "skills"));
  } finally {
    codexAdapter.materialized = originalMaterialized;
  }

  fs.mkdirSync(path.join(kit, "payload", "skills", "custom-skill"), { recursive: true });
  fs.writeFileSync(path.join(kit, "payload", "skills", "custom-skill", "SKILL.md"), "custom");
  const skillsPath = installSkills(kit, skillsWorkspace, { agent: "codex" });
  assert.equal(fs.existsSync(path.join(skillsPath, "custom-skill", "SKILL.md")), true);
  fs.mkdirSync(path.join(kit, "payload", "skills", "kit-orchestrator"), { recursive: true });
  assert.throws(() => installSkills(kit, makeTempDir("skills-collision"), { agent: "codex" }), /collides with an engine skill/);

  const repos = { topology: "single", repositories: [] };
  const driverIo = makeIo();
  const driver = await installDriver(kit, workspace, {
    agent: "kiro",
    method: "openspec",
    mode: "interactive",
  }, repos, driverIo);
  assert.match(fs.readFileSync(driver, "utf8"), /Kiro steering document/);
  assert.match(fs.readFileSync(driver, "utf8"), /Mode behavior: interactive/);
  assert.match(driverIo.capture.stdout, /Wrote project-local/);

  const promptRequiredWorkspace = makeTempDir("driver-prompt-required");
  fs.writeFileSync(path.join(promptRequiredWorkspace, "AGENTS.md"), "existing");
  await assert.rejects(
    () => installDriver(kit, promptRequiredWorkspace, {
      agent: "codex",
      method: "speckit",
      mode: "autopilot",
    }, repos, makeIo()),
    /needs an explicit agent-instructions policy/,
  );

  const policyWorkspace = makeTempDir("policy");
  fs.writeFileSync(path.join(policyWorkspace, "AGENTS.md"), "existing");
  await assert.rejects(
    () => resolveAgentInstructionsPolicy(policyWorkspace, { agent: "codex", nonInteractive: true }, makeIo()),
    /needs an explicit agent-instructions policy/,
  );
  const promptPolicyIo = makePromptIo();
  const policyPromise = resolveAgentInstructionsPolicy(policyWorkspace, { agent: "codex" }, promptPolicyIo);
  writePromptKeys(promptPolicyIo, ["\r"]);
  assert.equal(await policyPromise, "replace");

  const badDecision = await resolveBadAgentInstructionDecision(policyWorkspace);
  assert.match(badDecision.message, /needs an explicit agent-instructions policy/);

  const summaryIo = makeIo();
  printSetupSummary(kit, workspace, { agent: "codex", method: "speckit", mode: "autopilot" }, {
    repositories: [{ name: "api" }],
  }, path.join(workspace, ".agents", "skills"), path.join(workspace, "AGENTS.md"), summaryIo);
  assert.match(summaryIo.capture.stdout, /repos\s+repos\/api \(greenfield\)/);
});

test("prompt helpers cover noninteractive, cancellation, missing-tool install, and prompt failure paths", async () => {
  await promptMissingOptions({
    agent: "codex",
    method: "openspec",
    mode: "autopilot",
    agentSet: true,
    methodSet: true,
    modeSet: true,
  }, makeIo());

  assert.equal(await promptToolDecision(makeIo(), getSetupTool("openspec"), { status: "missing" }), "");
  const missingIo = makePromptIo();
  const missingPromise = promptToolDecision(missingIo, getSetupTool("openspec"), { status: "missing" });
  writePromptKeys(missingIo, ["\r"]);
  assert.equal(await missingPromise, "install");

  const cancelIo = makePromptIo();
  const cancelPromise = promptAgentInstructionsDecision(cancelIo, "AGENTS.md");
  writePromptKeys(cancelIo, ["\x1B[B", "\x1B[B", "\r"]);
  await assert.rejects(cancelPromise, /setup canceled before changing agent instructions/);

  const failedToolIo = makePromptIo();
  failedToolIo.stdin.setRawMode = () => {
    throw new Error("raw mode broke");
  };
  await assert.rejects(
    () => promptToolDecision(failedToolIo, getSetupTool("openspec"), { status: "missing" }),
    /OpenSpec prompt failed: raw mode broke/,
  );

  const failedAgentIo = makePromptIo();
  failedAgentIo.stdin.setRawMode = () => {
    throw new Error("raw mode broke");
  };
  await assert.rejects(
    () => promptAgentInstructionsDecision(failedAgentIo, "AGENTS.md"),
    /agent-instructions prompt failed: raw mode broke/,
  );
});

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

function makeWritable() {
  return {
    content: "",
    write(value) {
      this.content += value;
    },
  };
}

function makeResolver(resolve) {
  return Object.assign(resolve, {
    paths() {
      return [];
    },
  });
}

function asProcessIo(io) {
  return /** @type {NodeJS.Process} */ (/** @type {unknown} */ (io));
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

function writePromptKeys(io, keys) {
  keys.forEach((key, index) => {
    setTimeout(() => {
      io.stdin.write(key);
    }, index * 10);
  });
}

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `ent-app-kit-${prefix}.`));
}

function makeCopiedKit(options = {}) {
  const workspace = makeTempDir("copied-kit");
  fs.cpSync(kitRoot, workspace, {
    recursive: true,
    filter: shouldCopyFixtureSource,
  });
  if (options.assembled) {
    fs.copyFileSync(
      path.join(workspace, "examples", "payload", "minimal", "repos.yaml"),
      path.join(workspace, "payload", "repos.yaml"),
    );
  }
  return workspace;
}

function shouldCopyFixtureSource(source) {
  const relative = path.relative(kitRoot, source);
  if (relative === "") return true;

  const parts = relative.split(path.sep);
  if (parts.includes(".git") || parts.includes("node_modules")) return false;
  if ([".kit-state", "graphify-out", "out"].includes(parts[0])) return false;

  const base = path.basename(source);
  if (base === ".DS_Store" || base.startsWith("PR_")) return false;
  return true;
}

function writeBootstrapStateForTest(kit, workspace, options) {
  writeYamlFile(path.join(workspace, ".kit-state", "state.yaml"), {
    schema: "appkit-state-v1",
    selected: options,
  });
}

function emptyPayloadExceptRepos(kit) {
  const payload = path.join(kit, "payload");
  for (const entry of fs.readdirSync(payload)) {
    if (entry === "repos.yaml" || entry === ".gitkeep") continue;
    fs.rmSync(path.join(payload, entry), { recursive: true, force: true });
  }
}

function initGitRepo(repoDir) {
  fs.mkdirSync(repoDir, { recursive: true });
  spawn("git", ["init", "--quiet", "--initial-branch=main", repoDir], { label: "git init" });
}

function makeFakeBin() {
  const fakeBin = makeTempDir("fake-bin");
  symlinkOrCopy(process.execPath, path.join(fakeBin, process.platform === "win32" ? "node.exe" : "node"));
  return fakeBin;
}

function writeExecutable(directory, command, source) {
  const executable = path.join(directory, process.platform === "win32" ? `${command}.cmd` : command);
  fs.writeFileSync(executable, source);
  fs.chmodSync(executable, 0o755);
  return executable;
}

function symlinkOrCopy(source, target) {
  try {
    fs.symlinkSync(source, target);
  } catch {
    fs.copyFileSync(source, target);
    fs.chmodSync(target, 0o755);
  }
}

function toolSource(name, version, runBody = "process.exit(0);") {
  return `#!/usr/bin/env node
if (process.argv.includes("--version")) {
  console.log(${JSON.stringify(`${name} ${version}`)});
  process.exit(0);
}
${runBody}
`;
}

function installerSource(command, versionLine) {
  return `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const command = path.join(path.dirname(process.argv[1]), ${JSON.stringify(process.platform === "win32" ? `${command}.cmd` : command)});
fs.writeFileSync(command, ${JSON.stringify(`#!/usr/bin/env node\nif (process.argv.includes("--version")) { console.log("${versionLine}"); process.exit(0); }\nprocess.exit(0);\n`)});
fs.chmodSync(command, 0o755);
`;
}

async function withPath(pathValue, callback) {
  const oldPath = process.env.PATH;
  process.env.PATH = pathValue;
  try {
    return await callback();
  } finally {
    restoreEnvValue("PATH", oldPath);
  }
}

function restoreEnvValue(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function captureProcessStderr(callback) {
  const originalWrite = process.stderr.write;
  let captured = "";
  process.stderr.write = (chunk, ...args) => {
    captured += String(chunk);
    const maybeCallback = args.find((arg) => typeof arg === "function");
    if (maybeCallback) maybeCallback();
    return true;
  };
  try {
    callback();
    return captured;
  } finally {
    process.stderr.write = originalWrite;
  }
}

async function resolveBadAgentInstructionDecision(workspace) {
  const io = {
    ...makeIo(),
    stdin: { isTTY: true },
    stderr: { isTTY: false, write() {} },
  };
  try {
    await resolveAgentInstructionsPolicy(workspace, { agent: "codex" }, io);
  } catch (error) {
    return error;
  }
  throw new Error("expected policy resolution to fail");
}
