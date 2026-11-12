import fs from "node:fs";
import path from "node:path";
import { readReposConfig } from "./config.js";
import { directoryHasContent, mkdirp } from "./paths.js";
import { SetupError, spawn } from "./process.js";

// SECURITY: Valid git URL patterns to prevent command injection (CWE-78)
const GIT_URL_PATTERN = /^(https?:\/\/|git@[\w.-]+:|ssh:\/\/|file:\/\/|[\w.-]+@[\w.-]+:)/;
const GIT_REF_PATTERN = /^[a-zA-Z0-9/_.-]+$/;

/**
 * Validate git remote URL format to prevent command injection.
 * @param {string} url - The git remote URL to validate
 * @param {string} repoName - Repository name for error messages
 */
function validateGitUrl(url, repoName) {
  if (!url || typeof url !== "string") {
    throw new SetupError(`ERROR: repo '${repoName}' has invalid remote URL (must be a string)`);
  }
  
  // Reject URLs that look like git command arguments
  if (url.startsWith("-") || url.startsWith("--")) {
    throw new SetupError(`ERROR: repo '${repoName}' remote URL cannot start with '-' (potential command injection)`);
  }
  
  // Validate URL matches expected git URL patterns
  if (!GIT_URL_PATTERN.test(url)) {
    throw new SetupError(`ERROR: repo '${repoName}' has invalid remote URL format (expected https://, git@, ssh://, or file://)`);
  }
  
  // Reject URLs with shell metacharacters that could cause issues
  if (/[`$();<>|&]/.test(url)) {
    throw new SetupError(`ERROR: repo '${repoName}' remote URL contains invalid characters`);
  }
}

/**
 * Validate git branch/ref name format.
 * @param {string} branch - The branch name to validate
 * @param {string} repoName - Repository name for error messages
 */
function validateGitRef(branch, repoName) {
  if (!branch || typeof branch !== "string") {
    throw new SetupError(`ERROR: repo '${repoName}' has invalid branch name (must be a string)`);
  }
  
  // Reject refs that look like git command arguments
  if (branch.startsWith("-") || branch.startsWith("--")) {
    throw new SetupError(`ERROR: repo '${repoName}' branch name cannot start with '-'`);
  }
  
  // Validate branch name matches git ref naming rules
  if (!GIT_REF_PATTERN.test(branch)) {
    throw new SetupError(`ERROR: repo '${repoName}' branch name contains invalid characters (allowed: a-z A-Z 0-9 / _ . -)`);
  }
}

/**
 * Sanitize git URL for display in error messages to prevent credential exposure.
 * @param {string} url - The git URL to sanitize
 * @returns {string} - Sanitized URL with credentials masked
 */
function sanitizeGitUrl(url) {
  // SECURITY: Mask credentials in URLs to prevent exposure in logs (CWE-209)
  if (!url) return url;
  // Replace user:pass@ or token@ patterns with ***@
  return url.replace(/:\/\/[^@/]+@/g, "://***@");
}

export function readRepos(kitRoot) {
  return readReposConfig(kitRoot);
}

export function materializeRepo(workspaceRoot, repo, io) {
  const repoPath = repo.workspace_path || `repos/${repo.name}`;
  validateWorkspacePath(repo.name, repoPath);
  const repoDir = path.join(workspaceRoot, repoPath);
  // SECURITY: Verify the constructed path doesn't escape workspace boundary
  validatePathBoundary(workspaceRoot, repoDir, repo.name);
  const source = repo.source || "greenfield";

  if (source === "brownfield") {
    if (repo.remote) {
      // SECURITY: Validate git URL and branch to prevent command injection
      validateGitUrl(repo.remote, repo.name);
      if (repo.branch) {
        validateGitRef(repo.branch, repo.name);
      }
      
      if (fs.existsSync(path.join(repoDir, ".git"))) {
        const existing = spawn("git", ["-C", repoDir, "remote", "get-url", "origin"], { allowFailure: true }).stdout.trim();
        if (existing !== repo.remote) {
          throw new SetupError(`ERROR: repo '${repo.name}' at ${repoPath} already has origin '${sanitizeGitUrl(existing)}', expected '${sanitizeGitUrl(repo.remote)}'`);
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
              `ERROR: failed to clone '${sanitizeGitUrl(repo.remote)}' for repo '${repo.name}'.`,
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
  // SECURITY: Protect against path traversal attacks (CWE-22)
  
  // Reject absolute paths (both Unix and Windows styles)
  if (path.isAbsolute(repoPath)) {
    throw new SetupError(`ERROR: invalid workspace_path for repo '${repoName}': ${repoPath} (must be workspace-relative, no '..')`);
  }
  
  // Check for Windows absolute paths (e.g., C:\ or \\server\share)
  if (/^[a-zA-Z]:[/\\]/.test(repoPath) || /^\\\\/.test(repoPath)) {
    throw new SetupError(`ERROR: invalid workspace_path for repo '${repoName}': ${repoPath} (must be workspace-relative, no '..')`);
  }
  
  // Reject .. in the original path BEFORE normalization
  // This catches "repos/../etc/passwd" before it normalizes to "etc/passwd"
  if (repoPath.split(/[\\/]+/).includes("..")) {
    throw new SetupError(`ERROR: invalid workspace_path for repo '${repoName}': ${repoPath} (must be workspace-relative, no '..')`);
  }
  
  // Also check after normalization in case of complex paths
  const normalized = path.normalize(repoPath);
  if (normalized.split(/[\\/]+/).includes("..")) {
    throw new SetupError(`ERROR: invalid workspace_path for repo '${repoName}': ${repoPath} (must be workspace-relative, no '..')`);
  }
  
  // Reject double slashes in original path
  if (repoPath.includes("//") || repoPath.includes("\\\\")) {
    throw new SetupError(`ERROR: invalid workspace_path for repo '${repoName}': ${repoPath} (must be workspace-relative, no '..')`);
  }
  
  // Reject null bytes
  if (repoPath.includes("\0")) {
    throw new SetupError(`ERROR: invalid workspace_path for repo '${repoName}': ${repoPath} (must be workspace-relative, no '..')`);
  }
}

/**
 * Validate that a constructed absolute path is within the workspace boundary.
 * Call this after joining workspaceRoot with a user-provided path.
 * @param {string} workspaceRoot - The trusted workspace root directory
 * @param {string} fullPath - The constructed absolute path to validate
 * @param {string} repoName - Repository name for error messages
 */
export function validatePathBoundary(workspaceRoot, fullPath, repoName) {
  // SECURITY: Verify the resolved path is a subdirectory of workspace root
  const resolvedWorkspace = path.resolve(workspaceRoot);
  const resolvedPath = path.resolve(fullPath);
  const relativePath = path.relative(resolvedWorkspace, resolvedPath);
  
  // Path escapes if it starts with .. or is absolute after making it relative
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new SetupError(`ERROR: repo '${repoName}' path escapes workspace boundary`);
  }
}
