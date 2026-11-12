import fs from "node:fs";
import path from "node:path";
import { getAgentAdapter } from "../adapters/registry.js";
import { readManifest, readReposConfig, readYamlFile, writeYamlFile } from "./config.js";
import { mkdirp, skillRefRoot, workspaceRelPath } from "./paths.js";

const STALE_STATE_KEYS = new Set(["workspace", "artifacts"]);
const RECOGNIZED_DOMAINS = new Set(["design", "air", "connectivity", "nfr", "conformance", "deploy", "skills"]);

export function writeWorkspaceState(kitRoot, workspaceRoot) {
  writeState(workspaceRoot, mergeBase(loadState(workspaceRoot), baseState(kitRoot, workspaceRoot)));
}

export function writeBootstrapState(kitRoot, workspaceRoot, options) {
  mkdirp(path.join(workspaceRoot, ".kit-state", "methods", options.method));
  const state = mergeBase(loadState(workspaceRoot), baseState(kitRoot, workspaceRoot));
  const adapter = getAgentAdapter(options.agent);
  const skillSurface = adapter.skillSurface({ workspaceRoot, kitRoot });
  const instructionSurface = adapter.instructionSurface({ workspaceRoot, kitRoot });
  state.selected = {
    agent: options.agent,
    method: options.method,
    mode: options.mode,
  };
  state.skills = {
    orchestrator: `${skillRefRoot(options.agent)}/kit-orchestrator/SKILL.md`,
    method: `${skillRefRoot(options.agent)}/kit-method-${options.method}/SKILL.md`,
  };
  state.adapter = {
    id: adapter.id,
    label: adapter.label,
    version: adapter.version,
    installed_surfaces: {
      skills: skillSurface.refRoot,
      instructions: workspaceRelPath(instructionSurface.target, workspaceRoot),
    },
    native_surfaces: adapter.nativeSurfaces.map((surface) => ({
      id: surface.id,
      kind: surface.kind,
      optional: surface.optional,
    })),
  };
  state.method = {
    engine: options.method,
    status: "initialized",
  };
  writeState(workspaceRoot, state);
}

export function writeCompileState(kitRoot, workspaceRoot, compileCheck) {
  const state = mergeBase(loadState(workspaceRoot), baseState(kitRoot, workspaceRoot));
  state.compile_check = compileCheck;
  writeState(workspaceRoot, state);
}

export function baseState(kitRoot, workspaceRoot) {
  const manifest = readManifest(kitRoot);
  const repos = readReposConfig(kitRoot);
  const kit = isPlainObject(manifest.kit) ? manifest.kit : {};

  return {
    schema: "appkit-state-v1",
    paths: {
      relative_to: "workspace_root",
      workspace: ".",
      kit: relativePath(kitRoot, workspaceRoot),
      out: "out",
    },
    kit: {
      name: kit.name ?? null,
      version: kit.version ?? null,
      manifest_schema: manifest.schema,
      provider: manifest.provider,
    },
    payload: detectPayload(kitRoot),
    repos: {
      schema: repos.schema,
      topology: repos.topology,
      repositories: repos.repositories || [],
    },
  };
}

export function detectPayload(kitRoot) {
  const payload = path.join(kitRoot, "payload");
  const domains = [];
  const content = [];
  if (!fs.existsSync(payload)) return { domains, content };

  for (const entry of fs.readdirSync(payload, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if ([".gitkeep", ".DS_Store", "repos.yaml"].includes(entry.name)) continue;
    const fullPath = path.join(payload, entry.name);
    if (!hasContent(fullPath)) continue;
    if (RECOGNIZED_DOMAINS.has(entry.name)) domains.push(entry.name);
    else content.push(entry.name);
  }
  return { domains, content };
}

export function loadState(workspaceRoot) {
  const file = statePath(workspaceRoot);
  if (!fs.existsSync(file)) return {};
  const state = readYamlFile(file, ".kit-state/state.yaml");
  return isPlainObject(state) ? state : {};
}

function writeState(workspaceRoot, state) {
  writeYamlFile(statePath(workspaceRoot), state);
}

function statePath(workspaceRoot) {
  return path.join(workspaceRoot, ".kit-state", "state.yaml");
}

function mergeBase(existing, base) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(existing)) {
    if (STALE_STATE_KEYS.has(key) || Object.prototype.hasOwnProperty.call(base, key)) continue;
    merged[key] = value;
  }
  return merged;
}

function hasContent(target) {
  if (!fs.existsSync(target)) return false;
  const stat = fs.statSync(target);
  if (stat.isFile()) return true;
  if (!stat.isDirectory()) return false;
  for (const child of walk(target)) {
    if (fs.statSync(child).isFile() && path.basename(child) !== ".gitkeep") return true;
  }
  return false;
}

function* walk(root) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) yield* walk(fullPath);
    else yield fullPath;
  }
}

function relativePath(target, base) {
  const resolvedTarget = path.resolve(target);
  const resolvedBase = path.resolve(base);
  const relative = path.relative(resolvedBase, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return resolvedTarget;
  return relative ? relative.split(path.sep).join("/") : ".";
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
