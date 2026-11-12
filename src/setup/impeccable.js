import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getAgentAdapter } from "../adapters/registry.js";
import { formatToolOutput, note, status } from "./output.js";
import { copyReplace, mkdirp, walkFiles } from "./paths.js";
import { SetupError } from "./process.js";
import { runSetupTool } from "./tools.js";

export async function initImpeccable(workspaceRoot, options, io) {
  status("Impeccable", io);
  if (!options.installImpeccable) {
    note("Skipped by --skip-impeccable.", io);
    return;
  }
  const adapter = getAgentAdapter(options.agent);
  if (!adapter.impeccable) {
    note(`Impeccable install skipped: no provider mapping for agent '${options.agent}'.`, io);
    return;
  }
  if (adapter.impeccable.skillOnlyFromCodex) {
    await installImpeccableSkillOnlyFromCodex(workspaceRoot, options, io, adapter);
    return;
  }
  const provider = adapter.impeccable.provider;
  const result = await runImpeccableInstall(workspaceRoot, options, ["--providers", provider, "--scope=project"], io);
  if (result.status !== 0) {
    formatToolOutput(result.combined, io);
    throw new SetupError("ERROR: Impeccable installation failed");
  }
  io.stdout.write(`  Installed Impeccable for provider: ${provider}\n`);
}

function runImpeccableInstall(cwd, options, args, io) {
  return runSetupTool("impeccable", ["install", "--yes", ...args], options, io, {
    cwd,
    allowFailure: true,
  });
}

async function installImpeccableSkillOnlyFromCodex(workspaceRoot, options, io, adapter) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ent-app-kit-impeccable."));
  try {
    const result = await runImpeccableInstall(tmpRoot, options, ["--providers=codex", "--scope=project", "--no-hooks"], io);
    if (result.status !== 0) {
      formatToolOutput(result.combined, io);
      throw new SetupError("ERROR: Impeccable installation failed");
    }
    const sourceDir = path.join(tmpRoot, ".agents", "skills", "impeccable");
    if (!fs.existsSync(sourceDir)) {
      throw new SetupError("ERROR: Impeccable installer did not produce expected skill at .agents/skills/impeccable");
    }
    const skillSurface = adapter.skillSurface({ workspaceRoot, kitRoot: path.join(workspaceRoot, "ent-app-kit") });
    const targetDir = path.join(skillSurface.installDir, "impeccable");
    mkdirp(path.dirname(targetDir));
    copyReplace(sourceDir, targetDir);
    normalizeSkillOnlyMarkdown(targetDir, skillSurface.refRoot);
    io.stdout.write(`  Installed Impeccable skill for ${adapter.label}\n`);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

function normalizeSkillOnlyMarkdown(targetDir, skillRefRoot) {
  for (const file of walkFiles(targetDir)) {
    if (!file.endsWith(".md")) continue;
    const content = fs.readFileSync(file, "utf8").replaceAll(".agents/skills/impeccable", `${skillRefRoot}/impeccable`);
    fs.writeFileSync(file, content);
  }
}
