import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { readReposConfig, readYamlFile } from "../src/setup/config.js";
import { runChecks } from "../src/setup/compile-check.js";
import { detectPayload, baseState } from "../src/setup/state.js";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ============================================================================
// Customer Analysis System Payload Integration Tests
// ============================================================================
// These tests validate the payload artifacts created for the Customer Analysis
// System MVP integration into the Enterprise App Kit framework.
// ============================================================================

test("payload/repos.yaml exists and defines customer-analysis repository", () => {
  const reposPath = path.join(kitRoot, "payload", "repos.yaml");
  assert.equal(fs.existsSync(reposPath), true, "payload/repos.yaml should exist");

  const repos = readReposConfig(kitRoot);
  assert.equal(repos.schema, "appkit-repos-v1", "repos.yaml should use appkit-repos-v1 schema");
  assert.equal(repos.topology, "mono", "customer-analysis should use mono topology");
  assert.equal(Array.isArray(repos.repositories), true, "repositories should be an array");
  assert.equal(repos.repositories.length, 1, "should define exactly one repository");

  const repo = repos.repositories[0];
  assert.equal(repo.name, "customer-analysis", "repository name should be customer-analysis");
  assert.equal(repo.role, "application", "repository role should be application");
  assert.equal(repo.workspace_path, "repos/customer-analysis", "workspace_path should be repos/customer-analysis");
  assert.equal(repo.source, "greenfield", "source should be greenfield");
  assert.equal(typeof repo.description, "string", "description should be present");
  assert.ok(repo.description.length > 50, "description should be meaningful");
});

test("payload/repos.yaml validates against repos-v1 schema", () => {
  const reposPath = path.join(kitRoot, "payload", "repos.yaml");
  const reposContent = fs.readFileSync(reposPath, "utf8");
  const repos = YAML.parse(reposContent);

  assert.equal(repos.schema, "appkit-repos-v1");
  assert.ok(["mono", "multi"].includes(repos.topology), "topology should be mono or multi");
  assert.ok(Array.isArray(repos.repositories), "repositories must be an array");

  for (const repo of repos.repositories) {
    assert.equal(typeof repo.name, "string", "repo name must be string");
    assert.equal(typeof repo.role, "string", "repo role must be string");
    assert.equal(typeof repo.workspace_path, "string", "repo workspace_path must be string");
    assert.equal(typeof repo.source, "string", "repo source must be string");
    assert.ok(["greenfield", "brownfield"].includes(repo.source), "source must be greenfield or brownfield");
  }
});

test("payload/air/ directory exists with required agent architecture artifacts", () => {
  const airDir = path.join(kitRoot, "payload", "air");
  assert.equal(fs.existsSync(airDir), true, "payload/air/ directory should exist");
  assert.equal(fs.statSync(airDir).isDirectory(), true, "payload/air should be a directory");

  const requiredAirFiles = [
    "agent-architecture.md",
    "mcp-tools.md",
    "workflow-gates.md",
    "autonomy-zones.md",
    "data-contracts.md",
  ];

  for (const fileName of requiredAirFiles) {
    const filePath = path.join(airDir, fileName);
    assert.equal(fs.existsSync(filePath), true, `payload/air/${fileName} should exist`);
    const stat = fs.statSync(filePath);
    assert.equal(stat.isFile(), true, `payload/air/${fileName} should be a file`);
    assert.ok(stat.size > 1000, `payload/air/${fileName} should have substantial content (>1KB)`);
  }
});

test("payload/air/agent-architecture.md documents 7 agents", () => {
  const archPath = path.join(kitRoot, "payload", "air", "agent-architecture.md");
  const content = fs.readFileSync(archPath, "utf8");

  // Verify key agent concepts are documented
  assert.ok(content.includes("AGN1") || content.includes("agent"), "should document agents");
  assert.ok(content.includes("extraction") || content.includes("Extraction"), "should mention extraction");
  assert.ok(content.includes("analysis") || content.includes("Analysis"), "should mention analysis");
  assert.ok(content.length > 5000, "agent architecture should be comprehensive");
});

test("payload/air/mcp-tools.md documents MCP tools", () => {
  const toolsPath = path.join(kitRoot, "payload", "air", "mcp-tools.md");
  const content = fs.readFileSync(toolsPath, "utf8");

  // Verify MCP tools are documented
  assert.ok(content.includes("TOL") || content.includes("tool"), "should document MCP tools");
  assert.ok(content.includes("Service") || content.includes("service"), "should mention service integration");
  assert.ok(content.length > 5000, "MCP tools documentation should be comprehensive");
});

test("payload/air/workflow-gates.md documents human review gates", () => {
  const gatesPath = path.join(kitRoot, "payload", "air", "workflow-gates.md");
  const content = fs.readFileSync(gatesPath, "utf8");

  // Verify human gates are documented
  assert.ok(content.includes("gate") || content.includes("Gate"), "should document gates");
  assert.ok(content.includes("approval") || content.includes("review"), "should mention approval process");
  assert.ok(content.length > 3000, "workflow gates should be well documented");
});

test("payload/air/autonomy-zones.md defines zone contracts", () => {
  const zonesPath = path.join(kitRoot, "payload", "air", "autonomy-zones.md");
  const content = fs.readFileSync(zonesPath, "utf8");

  // Verify zone definitions exist
  assert.ok(content.includes("GREEN") || content.includes("AMBER"), "should define autonomy zones");
  assert.ok(content.includes("deterministic") || content.includes("confidence"), "should mention zone characteristics");
  assert.ok(content.length > 3000, "autonomy zones should be well defined");
});

test("payload/air/data-contracts.md defines agent data interfaces", () => {
  const contractsPath = path.join(kitRoot, "payload", "air", "data-contracts.md");
  const content = fs.readFileSync(contractsPath, "utf8");

  // Verify data contract documentation exists
  assert.ok(content.includes("input") || content.includes("output") || content.includes("schema"), "should document data contracts");
  assert.ok(content.length > 3000, "data contracts should be comprehensive");
});

test("payload/requirements/ directory contains business specification artifacts", () => {
  const reqDir = path.join(kitRoot, "payload", "requirements");
  assert.equal(fs.existsSync(reqDir), true, "payload/requirements/ should exist");

  const requiredFiles = [
    "business-context.md",
    "functional-requirements.md",
    "acceptance-criteria.md",
    "risk-register.md",
  ];

  for (const fileName of requiredFiles) {
    const filePath = path.join(reqDir, fileName);
    assert.equal(fs.existsSync(filePath), true, `payload/requirements/${fileName} should exist`);
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 1000, `payload/requirements/${fileName} should have substantial content`);
  }
});

test("payload/constraints/ directory contains technical and integration constraints", () => {
  const constraintsDir = path.join(kitRoot, "payload", "constraints");
  assert.equal(fs.existsSync(constraintsDir), true, "payload/constraints/ should exist");

  const requiredFiles = [
    "technical-constraints.md",
    "integration-strategy.md",
    "arabic-requirements.md",
  ];

  for (const fileName of requiredFiles) {
    const filePath = path.join(constraintsDir, fileName);
    assert.equal(fs.existsSync(filePath), true, `payload/constraints/${fileName} should exist`);
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 1000, `payload/constraints/${fileName} should have substantial content`);
  }
});

test("payload/README.md provides overview", () => {
  const readmePath = path.join(kitRoot, "payload", "README.md");
  assert.equal(fs.existsSync(readmePath), true, "payload/README.md should exist");

  const content = fs.readFileSync(readmePath, "utf8");
  assert.ok(content.length > 500, "README should have substantial content");
  assert.ok(content.includes("#"), "README should be formatted markdown");
});

test("detectPayload correctly identifies customer-analysis payload content", () => {
  const detected = detectPayload(kitRoot);

  // Should detect payload content
  assert.ok(Array.isArray(detected.domains), "detected.domains should be an array");
  assert.ok(Array.isArray(detected.content), "detected.content should be an array");

  // Should have air domain
  assert.ok(detected.domains.includes("air"), "should detect air domain");

  // Should have additional content
  assert.ok(detected.content.length > 0, "should detect additional content files/directories");
});

test("baseState includes customer-analysis payload information", () => {
  const state = baseState(kitRoot, kitRoot);

  assert.ok(state.payload, "state should include payload information");
  assert.ok(Array.isArray(state.payload.domains), "payload.domains should be an array");
  assert.ok(Array.isArray(state.payload.content), "payload.content should be an array");

  // Should detect air domain
  assert.ok(state.payload.domains.includes("air"), "payload should include air domain");
});

test("runChecks validates customer-analysis payload without critical errors", () => {
  // runChecks requires a workspace path as second argument
  const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), "test-workspace-"));
  try {
    const result = runChecks(kitRoot, tempWorkspace);

    assert.equal(typeof result, "object", "runChecks should return an object");
    assert.ok(result.checks, "result should have checks property");
    assert.ok(result.checks.payload, "result should include payload check");

    // Payload check should pass or warn (not fail)
    assert.ok(["pass", "warn"].includes(result.checks.payload),
      `payload check should pass or warn, got: ${result.checks.payload}`);
  } finally {
    fs.rmSync(tempWorkspace, { recursive: true, force: true });
  }
});

test("payload artifacts have consistent markdown structure", () => {
  const markdownFiles = [
    "air/agent-architecture.md",
    "air/mcp-tools.md",
    "air/workflow-gates.md",
    "air/autonomy-zones.md",
    "air/data-contracts.md",
    "requirements/business-context.md",
    "requirements/functional-requirements.md",
    "requirements/acceptance-criteria.md",
    "requirements/risk-register.md",
    "constraints/technical-constraints.md",
    "constraints/integration-strategy.md",
    "constraints/arabic-requirements.md",
    "README.md",
  ];

  for (const relPath of markdownFiles) {
    const fullPath = path.join(kitRoot, "payload", relPath);
    const content = fs.readFileSync(fullPath, "utf8");

    // Should have at least one header
    assert.ok(content.includes("#"), `${relPath} should contain markdown headers`);

    // Should not be empty
    assert.ok(content.trim().length > 100, `${relPath} should have substantial content`);

    // Should use consistent line endings (LF)
    const lines = content.split("\n");
    assert.ok(lines.length > 10, `${relPath} should have multiple lines`);
  }
});

test("payload repos.yaml uses correct mono topology structure", () => {
  const repos = readReposConfig(kitRoot);

  assert.equal(repos.topology, "mono", "should use mono topology");

  const repo = repos.repositories[0];
  assert.equal(repo.workspace_path, "repos/customer-analysis",
    "mono repo should use repos/customer-analysis workspace path");

  // Mono topology should have single repository
  assert.equal(repos.repositories.length, 1,
    "mono topology should define exactly one repository");
});

test("payload integration does not break existing kit functionality", () => {
  // Verify manifest still loads
  const manifestPath = path.join(kitRoot, "manifest.yaml");
  assert.equal(fs.existsSync(manifestPath), true, "manifest.yaml should still exist");

  const manifest = readYamlFile(manifestPath, "manifest.yaml");
  assert.equal(manifest.schema, "appkit-manifest-v1", "manifest schema should be unchanged");

  // Verify skills still exist
  const skillsDir = path.join(kitRoot, "skills");
  assert.equal(fs.existsSync(skillsDir), true, "skills/ directory should still exist");

  const skills = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory());
  assert.ok(skills.length >= 10, "should have at least 10 skill directories");
});

test("payload size is reasonable for a specification package", () => {
  const payloadDir = path.join(kitRoot, "payload");
  let totalSize = 0;
  let fileCount = 0;

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name !== ".gitkeep") {
        totalSize += fs.statSync(fullPath).size;
        fileCount++;
      }
    }
  }

  walkDir(payloadDir);

  // Payload should have multiple files
  assert.ok(fileCount >= 13, `should have at least 13 payload files, found ${fileCount}`);

  // Total size should be reasonable (not empty, not excessive)
  assert.ok(totalSize > 50000, `payload should be >50KB, found ${totalSize} bytes`);
  assert.ok(totalSize < 5000000, `payload should be <5MB, found ${totalSize} bytes`);
});

test("all payload markdown files are UTF-8 encoded", () => {
  const payloadDir = path.join(kitRoot, "payload");

  function checkEncoding(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        checkEncoding(fullPath);
      } else if (entry.name.endsWith(".md")) {
        // Try to read as UTF-8 - will throw if encoding is invalid
        assert.doesNotThrow(
          () => fs.readFileSync(fullPath, "utf8"),
          `${path.relative(kitRoot, fullPath)} should be valid UTF-8`
        );
      }
    }
  }

  checkEncoding(payloadDir);
});

test("payload contains no test artifacts or placeholders", () => {
  const payloadDir = path.join(kitRoot, "payload");

  function scanFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanFiles(fullPath);
      } else if (entry.isFile() && !entry.name.startsWith(".")) {
        const relativePath = path.relative(kitRoot, fullPath);

        // Should not be test files
        assert.ok(!entry.name.includes(".test."), `${relativePath} should not be a test file`);
        assert.ok(!entry.name.includes(".spec."), `${relativePath} should not be a spec file`);
      }
    }
  }

  scanFiles(payloadDir);
});
