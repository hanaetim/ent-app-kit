import assert from "node:assert/strict";
import test from "node:test";
import { SetupError } from "../src/setup/process.js";

// Dynamic import to load ES modules
let validateWorkspacePath, validatePathBoundary;

test.before(async () => {
  const reposModule = await import("../src/setup/repos.js");
  validateWorkspacePath = reposModule.validateWorkspacePath;
  validatePathBoundary = reposModule.validatePathBoundary;
});

// ============================================================================
// Security Validation Tests
// Tests for CWE-22 (Path Traversal) and CWE-78 (Command Injection) fixes
// ============================================================================

test("validateWorkspacePath rejects absolute paths", () => {
  assert.throws(
    () => validateWorkspacePath("test", "/etc/passwd"),
    SetupError,
    "should reject absolute Unix path"
  );
  assert.throws(
    () => validateWorkspacePath("test", "C:\\Windows\\System32"),
    SetupError,
    "should reject absolute Windows path"
  );
});

test("validateWorkspacePath rejects parent directory traversal", () => {
  assert.throws(
    () => validateWorkspacePath("test", "../etc/passwd"),
    SetupError,
    "should reject .. traversal"
  );
  assert.throws(
    () => validateWorkspacePath("test", "repos/../../etc/passwd"),
    SetupError,
    "should reject nested .. traversal"
  );
  assert.throws(
    () => validateWorkspacePath("test", "repos/../etc/passwd"),
    SetupError,
    "should reject .. in middle of path"
  );
});

test("validateWorkspacePath rejects double slashes", () => {
  assert.throws(
    () => validateWorkspacePath("test", "repos//app"),
    SetupError,
    "should reject double forward slashes"
  );
});

test("validateWorkspacePath rejects null bytes", () => {
  assert.throws(
    () => validateWorkspacePath("test", "repos/app\0malicious"),
    SetupError,
    "should reject null bytes in path"
  );
});

test("validateWorkspacePath accepts valid relative paths", () => {
  assert.doesNotThrow(() => validateWorkspacePath("test", "repos/app"));
  assert.doesNotThrow(() => validateWorkspacePath("test", "repos/my-app"));
  assert.doesNotThrow(() => validateWorkspacePath("test", "repos/app/nested"));
  assert.doesNotThrow(() => validateWorkspacePath("test", "repos/app_name"));
});

test("validateWorkspacePath normalizes paths before validation", () => {
  // Should reject paths that normalize to contain ..
  assert.throws(
    () => validateWorkspacePath("test", "repos/./../../etc/passwd"),
    SetupError,
    "should reject paths that normalize to contain .."
  );
});

test("validatePathBoundary prevents escaping workspace", () => {
  const workspaceRoot = "/tmp/workspace";
  
  assert.throws(
    () => validatePathBoundary(workspaceRoot, "/tmp/workspace/../etc/passwd", "test"),
    SetupError,
    "should reject path that escapes workspace via .."
  );
  
  assert.throws(
    () => validatePathBoundary(workspaceRoot, "/etc/passwd", "test"),
    SetupError,
    "should reject path outside workspace"
  );
  
  // Valid paths within workspace
  assert.doesNotThrow(
    () => validatePathBoundary(workspaceRoot, "/tmp/workspace/repos/app", "test"),
    "should accept path within workspace"
  );
});

test("validatePathBoundary handles symbolic link-like paths", () => {
  const workspaceRoot = "/tmp/workspace";
  
  // Even if the path looks normal, it should be resolved first
  assert.doesNotThrow(
    () => validatePathBoundary(workspaceRoot, "/tmp/workspace/repos/../repos/app", "test"),
    "should handle normalized paths correctly"
  );
});
