#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const keepWorkspace = process.argv.includes("--keep");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ent app kit smoke "));
const npmCache = path.join(tmpRoot, "npm-cache");
const workspaceRoot = path.join(tmpRoot, "workspace with spaces");
const copiedKitRoot = path.join(workspaceRoot, "ent-app-kit");

const requiredFrameworkPackageFiles = [
  "package.json",
  "bin/ent-app-kit.js",
  "src/cli.js",
  "src/setup/index.js",
  "src/setup/tools.js",
  "manifest.yaml",
  "payload/.gitkeep",
  "payload/design/.gitkeep",
  "payload/skills/.gitkeep",
  "examples/payload/minimal/README.md",
  "examples/payload/minimal/repos.yaml",
  "schemas/manifest-v1.json",
  "schemas/repos-v1.json",
  "skills/kit-orchestrator/SKILL.md",
];

const forbiddenPackageFiles = [
  "payload/.DS_Store",
  "payload/repos.yaml",
];
const allowedPayloadPackageFiles = new Set([
  "payload/.gitkeep",
  "payload/design/.gitkeep",
  "payload/skills/.gitkeep",
]);
const allowedPayloadPackageDirectories = new Set([
  "payload/design",
  "payload/skills",
]);

const forbiddenPackagePrefixes = [
  "node_modules/",
  "test/",
  "openspec/",
  ".git/",
];

const requiredWorkspaceArtifacts = [
  ".kit-state/state.yaml",
  "AGENTS.md",
  ".agents/skills/kit-orchestrator/SKILL.md",
  ".agents/skills/kit-method-speckit/SKILL.md",
  ".agents/skills/kit-method-openspec/SKILL.md",
  ".agents/skills/kit-conformance/SKILL.md",
  "repos/backend/.git",
  "repos/frontend/.git",
];

try {
  fs.mkdirSync(workspaceRoot, { recursive: true });
  verifyPackManifest();
  copyKit();
  injectSmokePayload();
  verifyCopiedKit();
  runSetup();
  verifyWorkspace();
  console.log(`Smoke test passed: ${workspaceRoot}`);
} finally {
  if (!keepWorkspace) {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } else {
    console.log(`Kept smoke workspace: ${workspaceRoot}`);
  }
}

function verifyPackManifest() {
  const result = run(npmCommand(), ["pack", "--dry-run", "--json"], { cwd: kitRoot });
  const pack = parsePackOutput(result.stdout);
  const files = new Set(pack.files.map((file) => normalizePath(file.path)));

  const missing = requiredFrameworkPackageFiles.filter((file) => !files.has(file));
  if (missing.length > 0) {
    throw new Error(`npm package would miss required framework file(s): ${missing.join(", ")}`);
  }

  const forbiddenFiles = forbiddenPackageFiles.filter((file) => files.has(file));
  if (forbiddenFiles.length > 0) {
    throw new Error(`npm package would include payload-specific file(s): ${forbiddenFiles.join(", ")}`);
  }

  const unexpectedPayloadFiles = [...files].filter((file) => file.startsWith("payload/") && !allowedPayloadPackageFiles.has(file));
  if (unexpectedPayloadFiles.length > 0) {
    throw new Error(`npm package would include non-placeholder payload file(s): ${unexpectedPayloadFiles.join(", ")}`);
  }

  const forbidden = [...files].filter((file) => forbiddenPackagePrefixes.some((prefix) => file.startsWith(prefix)));
  if (forbidden.length > 0) {
    throw new Error(`npm package would include non-runtime file(s): ${forbidden.join(", ")}`);
  }
}

function copyKit() {
  fs.cpSync(kitRoot, copiedKitRoot, {
    recursive: true,
    filter(source) {
      const relative = normalizePath(path.relative(kitRoot, source));
      if (!relative) return true;
      if (relative.startsWith("payload/")) {
        return allowedPayloadPackageFiles.has(relative) || allowedPayloadPackageDirectories.has(relative);
      }
      return ![
        ".git",
        "node_modules",
        "openspec",
        ".kit-state",
        "repos",
        "out",
      ].some((entry) => relative === entry || relative.startsWith(`${entry}/`));
    },
  });
}

function verifyCopiedKit() {
  const requiredAssembledFiles = [
    ...requiredFrameworkPackageFiles,
    "payload/repos.yaml",
  ];
  const missing = requiredAssembledFiles.filter((file) => !fs.existsSync(path.join(copiedKitRoot, file)));
  if (missing.length > 0) {
    throw new Error(`copied assembled kit is missing required runtime file(s): ${missing.join(", ")}`);
  }
}

function injectSmokePayload() {
  fs.mkdirSync(path.join(copiedKitRoot, "payload"), { recursive: true });
  fs.copyFileSync(
    path.join(copiedKitRoot, "examples", "payload", "minimal", "repos.yaml"),
    path.join(copiedKitRoot, "payload", "repos.yaml"),
  );
}

function runSetup() {
  fs.mkdirSync(path.join(workspaceRoot, "openspec"), { recursive: true });
  run(npxCommand(), [
    "--yes",
    "--package",
    "./ent-app-kit",
    "ent-app-kit",
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
  ], { cwd: workspaceRoot });
}

function verifyWorkspace() {
  const missing = requiredWorkspaceArtifacts.filter((file) => !fs.existsSync(path.join(workspaceRoot, file)));
  if (missing.length > 0) {
    throw new Error(`setup did not create expected workspace artifact(s): ${missing.join(", ")}`);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || kitRoot,
    env: {
      ...process.env,
      npm_config_cache: npmCache,
      NPM_CONFIG_CACHE: npmCache,
    },
    text: true,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error([
      `command failed: ${command} ${args.join(" ")}`,
      `cwd: ${options.cwd || kitRoot}`,
      result.stdout.trim(),
      result.stderr.trim(),
    ].filter(Boolean).join("\n"));
  }

  return result;
}

function parsePackOutput(output) {
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (error) {
    throw new Error(`failed to parse npm pack --json output: ${error.message}\n${output}`);
  }

  if (!Array.isArray(parsed) || parsed.length !== 1 || !Array.isArray(parsed[0].files)) {
    throw new Error(`unexpected npm pack --json output:\n${output}`);
  }
  return parsed[0];
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function npxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}
