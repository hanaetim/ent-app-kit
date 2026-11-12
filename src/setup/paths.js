import fs from "node:fs";
import path from "node:path";
import { getAgentAdapter } from "../adapters/registry.js";

export function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function copyReplace(source, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true, force: true });
}

export function directoryHasContent(dir) {
  return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
}

export function* walkFiles(root) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) yield* walkFiles(fullPath);
    else if (entry.isFile()) yield fullPath;
  }
}

export function workspaceRelPath(target, workspaceRoot) {
  const relative = path.relative(workspaceRoot, target);
  return relative ? relative.split(path.sep).join("/") : ".";
}

export function skillInstallDir(workspaceRoot, kitRoot, agent) {
  return getAgentAdapter(agent).skillSurface({ workspaceRoot, kitRoot }).installDir;
}

export function skillRefRoot(agent) {
  return getAgentAdapter(agent).skillSurface({ workspaceRoot: ".", kitRoot: "ent-app-kit" }).refRoot;
}
