import fs from "node:fs";
import path from "node:path";
import { readReposConfig } from "./config.js";
import { directoryHasContent, mkdirp } from "./paths.js";
import { SetupError, spawn } from "./process.js";

export function readRepos(kitRoot) {
  return readReposConfig(kitRoot);
}

export function materializeRepo(workspaceRoot, repo, io) {
  const repoPath = repo.workspace_path || `repos/${repo.name}`;
  validateWorkspacePath(repo.name, repoPath);
  const repoDir = path.join(workspaceRoot, repoPath);
  const source = repo.source || "greenfield";

  if (source === "brownfield") {
    if (repo.remote) {
      if (fs.existsSync(path.join(repoDir, ".git"))) {
        const existing = spawn("git", ["-C", repoDir, "remote", "get-url", "origin"], { allowFailure: true }).stdout.trim();
        if (existing !== repo.remote) {
          throw new SetupError(`ERROR: repo '${repo.name}' at ${repoPath} already has origin '${existing}', expected '${repo.remote}'`);
        }
        io.stdout.write(`  repo ${repo.name} (${source}): already cloned at ${repoPath}\n`);
      } else if (directoryHasContent(repoDir)) {
        throw new SetupError(`ERROR: repo '${repo.name}' target ${repoPath} is a non-empty directory without .git; refusing to clone over it`);
      } else {
        mkdirp(path.dirname(repoDir));
        const args = ["clone", "--quiet"];
        if (repo.branch) args.push("--branch", repo.branch);
        args.push(repo.remote, repoDir);
        const result = spawn("git", args, {
          allowFailure: true,
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        });
        if (result.status !== 0) {
          throw new SetupError(
            [
              `ERROR: failed to clone '${repo.remote}' for repo '${repo.name}'.`,
              "  Likely causes: no network access, or missing git credentials for that host.",
              "  Remediation: configure SSH keys or a token for the host, then re-run setup.",
            ].join("\n"),
          );
        }
        io.stdout.write(`  repo ${repo.name} (${source}): cloned into ${repoPath}\n`);
      }
    } else {
      if (!fs.existsSync(path.join(repoDir, ".git"))) {
        throw new SetupError(
          `ERROR: repo '${repo.name}' has source 'brownfield' with no 'remote' declared, but ${repoPath} is not an existing git repository (no .git found).`,
        );
      }
      io.stdout.write(`  repo ${repo.name} (${source}): using existing copy at ${repoPath}\n`);
    }
    return;
  }

  if (source !== "greenfield") {
    throw new SetupError(`ERROR: repo '${repo.name}' has unknown source '${source}' (expected 'greenfield' or 'brownfield')`);
  }

  mkdirp(repoDir);
  const gitkeep = path.join(repoDir, ".gitkeep");
  if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, "");
  if (fs.existsSync(path.join(repoDir, ".git"))) {
    io.stdout.write(`  repo ${repo.name} (${source}): already initialized at ${repoPath}\n`);
  } else {
    spawn("git", ["init", "--quiet", "--initial-branch=main", repoDir], { label: `git init for ${repo.name}` });
    io.stdout.write(`  repo ${repo.name} (${source}): initialized empty git repo on 'main' at ${repoPath}\n`);
  }
}

export function validateWorkspacePath(repoName, repoPath) {
  if (path.isAbsolute(repoPath) || repoPath.split(/[\\/]+/).includes("..") || repoPath.includes("//")) {
    throw new SetupError(`ERROR: invalid workspace_path for repo '${repoName}': ${repoPath} (must be workspace-relative, no '..')`);
  }
}
