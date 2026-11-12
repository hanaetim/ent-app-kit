import fs from "node:fs";
import path from "node:path";
import { getAgentAdapter } from "../adapters/registry.js";
import { formatToolOutput, note, status } from "./output.js";
import { workspaceRelPath } from "./paths.js";
import { SetupError } from "./process.js";
import { runSetupTool } from "./tools.js";

export async function initSpeckitWorkspace(kitRoot, workspaceRoot, options, io) {
  if (options.method !== "speckit") return;
  status("Spec Kit", io);
  if (fs.existsSync(path.join(workspaceRoot, ".specify"))) {
    io.stdout.write(`  Existing .specify project found at ${workspaceRelPath(path.join(workspaceRoot, ".specify"), workspaceRoot)}\n`);
    return;
  }
  const method = getAgentAdapter(options.agent).methods.speckit;
  const integration = method.integration;
  const args = ["init", "--here", "--force", "--script", "py", "--integration", integration];
  if (method.integrationOptions.length > 0) args.push("--integration-options", ...method.integrationOptions);
  io.stdout.write(`  Initializing .specify at workspace root with integration: ${integration}\n`);
  const result = await runSetupTool("speckit", args, options, io, {
    cwd: workspaceRoot,
    allowFailure: true,
    env: { CI: "1" },
  });
  if (result.status !== 0) {
    note("Spec Kit initialization failed.", io);
    formatToolOutput(result.combined, io);
    throw new SetupError("ERROR: Spec Kit initialization failed");
  }
  io.stdout.write("  Initialized .specify at workspace root.\n");
}

export async function initOpenSpecWorkspace(workspaceRoot, options, io) {
  if (options.method !== "openspec") return;
  status("OpenSpec", io);
  if (fs.existsSync(path.join(workspaceRoot, "openspec"))) {
    io.stdout.write(`  Existing openspec project found at ${workspaceRelPath(path.join(workspaceRoot, "openspec"), workspaceRoot)}\n`);
    return;
  }
  const tool = getAgentAdapter(options.agent).methods.openspec.tool;
  io.stdout.write(`  Initializing openspec at workspace root with tool: ${tool}\n`);
  const result = await runSetupTool("openspec", ["init", workspaceRoot, "--tools", tool, "--profile", "core", "--force"], options, io, { allowFailure: true });
  if (result.status !== 0) {
    note("OpenSpec initialization failed.", io);
    formatToolOutput(result.combined, io);
    throw new SetupError("ERROR: OpenSpec initialization failed");
  }
  io.stdout.write("  Initialized openspec at workspace root.\n");
}
