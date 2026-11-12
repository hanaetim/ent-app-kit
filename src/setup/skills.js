import fs from "node:fs";
import path from "node:path";
import { getAgentAdapter } from "../adapters/registry.js";
import { copyReplace, mkdirp, skillInstallDir } from "./paths.js";
import { SetupError } from "./process.js";

export function installSkills(kitRoot, workspaceRoot, options) {
  const adapter = getAgentAdapter(options.agent);
  const targetDir = skillInstallDir(workspaceRoot, kitRoot, options.agent);
  if (!adapter.materialized) {
    return targetDir;
  }

  mkdirp(targetDir);
  copySkillSet(path.join(kitRoot, "skills"), targetDir);
  const payloadSkills = path.join(kitRoot, "payload", "skills");
  if (fs.existsSync(payloadSkills)) {
    for (const entry of fs.readdirSync(payloadSkills, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (fs.existsSync(path.join(kitRoot, "skills", entry.name))) {
        throw new SetupError(`ERROR: payload skill '${entry.name}' collides with an engine skill of the same name`);
      }
      copyReplace(path.join(payloadSkills, entry.name), path.join(targetDir, entry.name));
    }
  }

  return targetDir;
}

function copySkillSet(sourceRoot, targetRoot) {
  for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      copyReplace(path.join(sourceRoot, entry.name), path.join(targetRoot, entry.name));
    }
  }
}
