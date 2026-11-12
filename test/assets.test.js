import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { SUPPORTED_AGENT_IDS } from "../src/adapters/registry.js";
import { readJsonFile, readManifest } from "../src/setup/config.js";
import { SUPPORTED_METHODS } from "../src/setup/validate.js";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("package file list includes shipped runtime assets and excludes test-only assets", () => {
  const pkg = readJsonFile(path.join(kitRoot, "package.json"), "package.json");
  const files = new Set(pkg.files);

  for (const required of ["bin/", "src/", "skills/", "schemas/", "examples/", "manifest.yaml", "README.md"]) {
    assert.equal(files.has(required), true, `package files should include ${required}`);
  }

  assert.equal(files.has("test/"), false, "test directory should not be shipped as a runtime package asset");
  assert.equal(files.has("scripts/"), false, "test-only smoke scripts should not be shipped from scripts/");
  assert.equal([...files].some((entry) => entry === "!test/" || entry.startsWith("!test/")), true);
  assert.equal([...files].some((entry) => entry === "!openspec/" || entry.startsWith("!openspec/")), true);
});

test("required shipped asset directories and schemas are present", () => {
  for (const directory of ["bin", "src", "skills", "schemas", "examples"]) {
    assert.equal(fs.statSync(path.join(kitRoot, directory)).isDirectory(), true, `${directory}/ should exist`);
  }

  for (const schema of ["air-v1.json", "manifest-v1.json", "repos-v1.json"]) {
    const parsed = readJsonFile(path.join(kitRoot, "schemas", schema), `schemas/${schema}`);
    assert.equal(typeof parsed.$id, "string", `schemas/${schema} should declare $id`);
    assert.equal(parsed.$id.length > 0, true, `schemas/${schema} should declare a non-empty $id`);
  }
});

test("manifest asset matches setup registry contracts", () => {
  const manifest = readManifest(kitRoot);

  assert.deepEqual([...manifest.supported_agents].sort(), [...SUPPORTED_AGENT_IDS].sort());
  assert.deepEqual([...manifest.supported_sdd_methods].sort(), [...SUPPORTED_METHODS].sort());
  assert.equal(manifest.supported_agents.includes(manifest.defaults.agent), true);
  assert.equal(manifest.supported_sdd_methods.includes(manifest.defaults.method), true);
});

test("required engine skills are present", () => {
  for (const skill of ["kit-orchestrator", "kit-method-speckit", "kit-method-openspec", "kit-conformance"]) {
    assert.equal(fs.existsSync(path.join(kitRoot, "skills", skill, "SKILL.md")), true, `${skill} should include SKILL.md`);
  }
});

test("skill manifests have valid minimal frontmatter contracts", () => {
  const skillsRoot = path.join(kitRoot, "skills");
  const skillDirs = fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  assert.ok(skillDirs.length > 0, "skills/ should contain at least one skill");

  for (const entry of skillDirs) {
    const skillFile = path.join(skillsRoot, entry.name, "SKILL.md");
    assert.equal(fs.existsSync(skillFile), true, `${entry.name} should include SKILL.md`);

    const { frontmatter, body } = readSkill(skillFile);
    assert.equal(frontmatter.name, entry.name, `${entry.name} frontmatter name should match directory`);
    assert.equal(typeof frontmatter.description, "string", `${entry.name} should include a description`);
    assert.equal(frontmatter.description.trim().length > 0, true, `${entry.name} description should be non-empty`);
    assert.equal(body.trim().length > 0, true, `${entry.name} should include body content after frontmatter`);
  }
});

function readSkill(skillFile) {
  const relative = path.relative(kitRoot, skillFile);
  const text = fs.readFileSync(skillFile, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  assert.ok(match, `${relative} should start with YAML frontmatter`);

  let frontmatter;
  assert.doesNotThrow(() => {
    frontmatter = YAML.parse(match[1]);
  }, `${relative} frontmatter should parse as YAML`);

  assert.equal(frontmatter && typeof frontmatter === "object" && !Array.isArray(frontmatter), true, `${relative} frontmatter should be a mapping`);
  assert.equal(typeof frontmatter.name, "string", `${relative} should include a skill name`);
  assert.equal(frontmatter.name.trim().length > 0, true, `${relative} skill name should be non-empty`);

  return { frontmatter, body: match[2] };
}
