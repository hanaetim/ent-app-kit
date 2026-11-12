import { workspaceRelPath } from "./paths.js";
import { streamColors } from "./output.js";

export function printSetupSummary(kitRoot, workspaceRoot, options, repos, skillsPath, driverPath, io) {
  const out = io.stdout;
  const colors = streamColors(out);
  out.write(`\n${colors.bold}${colors.cyan}Enterprise App Kit setup complete${colors.reset}\n`);
  out.write("------------------------------------------------------------\n");
  summaryLine(out, "workspace", workspaceRoot);
  summaryLine(out, "agent", options.agent);
  summaryLine(out, "method", options.method);
  summaryLine(out, "mode", options.mode);
  summaryLine(out, "skills", workspaceRelPath(skillsPath, workspaceRoot));
  summaryLine(out, "driver", workspaceRelPath(driverPath, workspaceRoot));
  repos.repositories.forEach((repo, index) => {
    const repoPath = repo.workspace_path || `repos/${repo.name}`;
    summaryLine(out, index === 0 ? "repos" : "", `${repoPath} (${repo.source || "greenfield"})`);
  });
  out.write(`\n${colors.bold}${colors.cyan}Usage note${colors.reset}\n`);
  out.write("  Starting the application build can trigger a long-running autonomous workflow. Monitor assistant usage and cost while it is running.\n");
  out.write(`\n${colors.bold}${colors.cyan}Next steps${colors.reset}\n`);
  out.write("  1. Start a new coding-agent session from the workspace root:\n");
  out.write(`     cd ${workspaceRoot}\n`);
  out.write("  2. If you use an IDE integration, restart the IDE so slash commands and skills are refreshed.\n");
  out.write("  3. Paste this prompt into the agent:\n");
  out.write("     Build the app kit.\n\n");
}

function summaryLine(out, label, value) {
  out.write(`  ${label.padEnd(12, " ")} ${value}\n`);
}
