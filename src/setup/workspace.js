import fs from "node:fs";
import path from "node:path";
import { mkdirp } from "./paths.js";
import { SetupError } from "./process.js";
import { materializeRepo } from "./repos.js";
import { writeWorkspaceState } from "./state.js";

export function validateKitPackage(kitRoot) {
  if (!fs.existsSync(path.join(kitRoot, "manifest.yaml"))) {
    throw new SetupError(
      [
        "ERROR: ent-app-kit package assets are incomplete.",
        `Expected manifest at: ${path.join(kitRoot, "manifest.yaml")}`,
        "Reinstall or restore the ent-app-kit package, then rerun setup.",
      ].join("\n"),
    );
  }
}

export function resolveKitRoot(workspaceRoot) {
  const resolvedWorkspaceRoot = path.resolve(workspaceRoot);
  if (looksLikeKitRoot(resolvedWorkspaceRoot)) {
    throw new SetupError(
      [
        "ERROR: setup is running from inside ent-app-kit/.",
        "Run setup from the parent workspace root that contains ent-app-kit/.",
      ].join("\n"),
    );
  }

  const localKitRoot = path.join(resolvedWorkspaceRoot, "ent-app-kit");
  if (!looksLikeKitRoot(localKitRoot)) {
    throw new SetupError(
      [
        "ERROR: setup must be run from the direct parent directory of ent-app-kit/.",
        "Expected to find ent-app-kit/manifest.yaml in the current directory.",
      ].join("\n"),
    );
  }

  return localKitRoot;
}

export function initializeWorkspace(kitRoot, workspaceRoot, repos, io) {
  mkdirp(path.join(workspaceRoot, ".kit-state"));
  mkdirp(path.join(workspaceRoot, "repos"));
  mkdirp(path.join(workspaceRoot, "out"));

  for (const repo of repos.repositories) {
    materializeRepo(workspaceRoot, repo, io);
  }

  writeWorkspaceState(kitRoot, workspaceRoot);
}

function looksLikeKitRoot(target) {
  return fs.existsSync(path.join(target, "manifest.yaml"));
}
