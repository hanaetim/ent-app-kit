import fs from "node:fs";
import path from "node:path";
import { findAgentAdapter } from "../adapters/registry.js";
import { readManifest, validatePackageSchemas } from "./config.js";
import { note, status } from "./output.js";
import { SetupError } from "./process.js";
import { detectPayload, loadState, writeCompileState } from "./state.js";

const NODE_RUNTIME_FILES = [
  "package.json",
  "bin/ent-app-kit.js",
  "src/cli.js",
  "src/setup/index.js",
  "src/adapters/registry.js",
  "src/adapters/types.js",
  "src/setup/config.js",
  "src/setup/state.js",
  "src/setup/compile-check.js",
  "src/setup/repos.js",
  "manifest.yaml",
  "schemas/manifest-v1.json",
  "schemas/repos-v1.json",
  "skills/kit-orchestrator/SKILL.md",
];

const REQUIRED_SKILLS = [
  "kit-orchestrator",
  "kit-method-speckit",
  "kit-method-openspec",
  "kit-conformance",
];

export function runCompileCheck(kitRoot, workspaceRoot, io) {
  status("Setup checks", io);
  const result = runChecks(kitRoot, workspaceRoot);
  writeCompileState(kitRoot, workspaceRoot, result.toState());

  if (result.errors.length > 0) {
    for (const error of result.errors) io.stderr.write(`ERROR: ${error}\n`);
    throw new SetupError(`ERROR: Compile check failed with ${result.errors.length} error(s) and ${result.warnings.length} warning(s).`);
  }

  io.stdout.write(`  Checks passed with ${result.warnings.length} setup note(s).\n`);
  for (const warning of result.warnings) note(warning, io);
}

export function runChecks(kitRoot, workspaceRoot) {
  const result = new CheckResult();
  checkSchemas(kitRoot, result);
  checkKitStructure(kitRoot, result);
  checkSkills(kitRoot, result);
  checkPayload(kitRoot, result);
  checkAdapter(kitRoot, workspaceRoot, result);
  checkSelectedMethod(kitRoot, workspaceRoot, result);
  return result;
}

class CheckResult {
  constructor() {
    this.checks = {};
    this.errors = [];
    this.warnings = [];
  }

  pass(name) {
    this.checks[name] = "pass";
  }

  fail(name, message) {
    this.checks[name] = "fail";
    this.errors.push(message);
  }

  toState() {
    const compileCheck = {
      schema: "appkit-compile-check-v1",
      status: this.errors.length > 0 ? "fail" : "pass",
      errors: this.errors.length,
      warnings: this.warnings.length,
      checks: this.checks,
    };
    if (this.errors.length > 0) compileCheck.error_details = this.errors;
    if (this.warnings.length > 0) compileCheck.warning_details = this.warnings;
    return compileCheck;
  }
}

function checkSchemas(kitRoot, result) {
  try {
    validatePackageSchemas(kitRoot);
    result.pass("schemas");
  } catch (error) {
    result.fail("schemas", error.message.replace(/^ERROR:\s*/, ""));
  }
}

function checkKitStructure(kitRoot, result) {
  let failed = false;
  for (const relative of NODE_RUNTIME_FILES) {
    if (!fs.existsSync(path.join(kitRoot, relative))) {
      result.errors.push(`missing required Node setup asset: ${relative}`);
      failed = true;
    }
  }
  result.checks.kit_structure = failed ? "fail" : "pass";
}

function checkSkills(kitRoot, result) {
  let failed = false;
  for (const skill of REQUIRED_SKILLS) {
    const relative = `skills/${skill}/SKILL.md`;
    if (!fs.existsSync(path.join(kitRoot, relative))) {
      result.errors.push(`missing required skill: ${relative}`);
      failed = true;
    }
  }
  result.checks.skills = failed ? "fail" : "pass";
}

function checkPayload(kitRoot, result) {
  const inventory = classifyPayload(kitRoot);
  let warned = false;
  for (const [name, kind] of Object.entries(inventory)) {
    if (kind === "empty") {
      result.warnings.push(`payload/${name} is empty and will be ignored`);
      warned = true;
    }
  }
  const detected = detectPayload(kitRoot);
  if (detected.domains.length === 0 && detected.content.length === 0) {
    result.warnings.push("payload/ contains no content beyond repos.yaml; the method has nothing to build from");
    warned = true;
  }
  result.checks.payload = warned ? "warn" : "pass";
}

function checkSelectedMethod(kitRoot, workspaceRoot, result) {
  let manifest;
  try {
    manifest = readManifest(kitRoot);
  } catch (error) {
    result.fail("selected_method", "manifest.yaml did not parse as a mapping");
    return;
  }

  const state = loadState(workspaceRoot);
  const method = state.selected?.method || manifest.defaults?.method;
  if (!Array.isArray(manifest.supported_sdd_methods) || !manifest.supported_sdd_methods.includes(method)) {
    result.fail("selected_method", `selected method '${method}' is not supported by manifest`);
    return;
  }
  if (!fs.existsSync(path.join(kitRoot, "skills", `kit-method-${method}`, "SKILL.md"))) {
    result.fail("selected_method", `selected method skill is missing: kit-method-${method}`);
    return;
  }
  result.pass("selected_method");
}

function checkAdapter(kitRoot, workspaceRoot, result) {
  let manifest;
  try {
    manifest = readManifest(kitRoot);
  } catch {
    result.fail("adapter", "manifest.yaml did not parse as a mapping");
    return;
  }

  const state = loadState(workspaceRoot);
  const agent = state.selected?.agent || manifest.defaults?.agent;
  const adapter = findAgentAdapter(agent);
  if (!adapter) {
    result.fail("adapter", `selected agent '${agent}' is not supported by an adapter`);
    return;
  }
  const validation = adapter.validate({ workspaceRoot, kitRoot });
  if (!validation.ok) {
    result.fail("adapter", validation.errors.join("; ") || `selected agent '${agent}' adapter validation failed`);
    return;
  }
  result.pass("adapter");
}

function classifyPayload(kitRoot) {
  const payload = path.join(kitRoot, "payload");
  const inventory = {};
  if (!fs.existsSync(payload)) return inventory;
  for (const entry of fs.readdirSync(payload, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if ([".gitkeep", ".DS_Store"].includes(entry.name)) continue;
    const target = path.join(payload, entry.name);
    if (!hasNonGitkeepFile(target)) inventory[entry.name] = "empty";
    else inventory[entry.name] = "content";
  }
  return inventory;
}

function hasNonGitkeepFile(target) {
  if (!fs.existsSync(target)) return false;
  const stat = fs.statSync(target);
  if (stat.isFile()) return true;
  if (!stat.isDirectory()) return false;
  for (const file of walk(target)) {
    if (path.basename(file) !== ".gitkeep") return true;
  }
  return false;
}

function* walk(root) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) yield* walk(fullPath);
    else if (entry.isFile()) yield fullPath;
  }
}
