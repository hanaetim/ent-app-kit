import path from "node:path";
import { runCompileCheck } from "./compile-check.js";
import { validatePackageSchemas } from "./config.js";
import { installDriver, resolveAgentInstructionsPolicy } from "./driver.js";
import { initImpeccable } from "./impeccable.js";
import { initOpenSpecWorkspace, initSpeckitWorkspace } from "./methods.js";
import { promptMissingOptions } from "./prompt.js";
import { readRepos } from "./repos.js";
import { installSkills } from "./skills.js";
import { writeBootstrapState } from "./state.js";
import { printSetupSummary } from "./summary.js";
import { requireCommands, requireFiles, validateSetupSelection } from "./validate.js";
import { initializeWorkspace, resolveKitRoot, validateKitPackage } from "./workspace.js";
import { status } from "./output.js";

export async function runSetup(options, io = process) {
  const workspaceRoot = path.resolve(options.workspaceRoot);
  const kitRoot = resolveKitRoot(workspaceRoot);

  await promptMissingOptions(options, io);
  validateSetupSelection(options);

  validateKitPackage(kitRoot);

  requireCommands(options);
  requireFiles(kitRoot, options);
  await resolveAgentInstructionsPolicy(workspaceRoot, options, io);

  status("Package", io);
  validatePackageSchemas(kitRoot);
  io.stdout.write("  Schema validation passed\n");

  status("Workspace", io);
  const repos = readRepos(kitRoot);
  initializeWorkspace(kitRoot, workspaceRoot, repos, io);
  io.stdout.write(`  Initialized ${workspaceRoot}\n`);

  await initSpeckitWorkspace(kitRoot, workspaceRoot, options, io);
  await initOpenSpecWorkspace(workspaceRoot, options, io);
  const skillsPath = installSkills(kitRoot, workspaceRoot, options);
  status("Agent instructions", io);
  const driverPath = await installDriver(kitRoot, workspaceRoot, options, repos, io);
  writeBootstrapState(kitRoot, workspaceRoot, options);
  await initImpeccable(workspaceRoot, options, io);

  if (options.runCompileCheck) {
    runCompileCheck(kitRoot, workspaceRoot, io);
  }

  printSetupSummary(kitRoot, workspaceRoot, options, repos, skillsPath, driverPath, io);
}
