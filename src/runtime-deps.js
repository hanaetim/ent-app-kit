import { spawnSync as defaultSpawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultResolve = createRequire(import.meta.url).resolve;

export const RUNTIME_DEPENDENCIES = Object.freeze([
  "ajv",
  "@clack/prompts",
  "yaml",
]);

export function ensureRuntimeDependencies(options = {}) {
  const resolver = options.resolver || defaultResolve;
  if (hasRuntimeDependencies(resolver)) return false;

  const stderr = options.stderr || process.stderr;
  const spawnSync = options.spawnSync || defaultSpawnSync;
  const root = options.packageRoot || packageRoot;
  const env = options.env || process.env;
  const platform = options.platform || process.platform;

  stderr.write("Installing ent-app-kit runtime dependencies...\n");
  const result = spawnSync(npmCommand(platform), ["install", "--omit=dev", "--no-audit", "--fund=false", "--ignore-scripts"], {
    cwd: root,
    stdio: "inherit",
    env,
  });

  if (result.error) {
    throw new Error(`failed to install ent-app-kit runtime dependencies: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`failed to install ent-app-kit runtime dependencies with exit code ${result.status}`);
  }
  if (!hasRuntimeDependencies(resolver)) {
    throw new Error("installed ent-app-kit runtime dependencies, but required modules are still unavailable");
  }
  return true;
}

export function hasRuntimeDependencies(resolver = defaultResolve) {
  try {
    for (const dependency of RUNTIME_DEPENDENCIES) {
      resolver(`${dependency}/package.json`);
    }
    return true;
  } catch {
    return false;
  }
}

export function npmCommand(platform = process.platform) {
  return platform === "win32" ? "npm.cmd" : "npm";
}
