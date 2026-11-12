import fs from "node:fs";
import path from "node:path";
import { isSupportedAgent, SUPPORTED_AGENT_IDS } from "../adapters/registry.js";
import { normalizeMode } from "./options.js";
import { commandExists, SetupError } from "./process.js";

export const SUPPORTED_AGENTS = SUPPORTED_AGENT_IDS;
export const SUPPORTED_METHODS = Object.freeze(["speckit", "openspec"]);
export const ROADMAP_METHODS = Object.freeze(["bmad"]);
export const SELECTABLE_METHODS = Object.freeze(["speckit", "openspec"]);
export const SUPPORTED_MODES = Object.freeze(["autopilot", "interactive"]);

const METHODS = new Set(SELECTABLE_METHODS);
const MODES = new Set(SUPPORTED_MODES);

export function validateSetupSelection(options) {
  if (!isSupportedAgent(options.agent)) {
    throw new SetupError(`ERROR: unsupported agent: ${options.agent}`);
  }
  if (!METHODS.has(options.method)) {
    if (ROADMAP_METHODS.includes(options.method)) {
      throw new SetupError(`ERROR: method '${options.method}' is coming soon and cannot be selected by setup.`);
    }
    throw new SetupError(`ERROR: unsupported method: ${options.method}`);
  }
  options.mode = normalizeMode(options.mode);
  if (!MODES.has(options.mode)) {
    throw new SetupError(`ERROR: unsupported mode: ${options.mode}`);
  }
  if (options.ensureTools && options.noToolDownloads) {
    throw new SetupError("ERROR: --ensure-tools cannot be combined with --no-tool-downloads; choose pinned tool enforcement or locked-down setup.");
  }
  if (options.replaceAgentInstructions && options.keepAgentInstructions) {
    throw new SetupError("ERROR: --replace-agent-instructions cannot be combined with --keep-agent-instructions; choose one agent-instructions policy.");
  }
}

export function requireCommands(options) {
  const missing = [];
  const check = (name, remediation) => {
    if (!commandExists(name)) missing.push(`  - ${name}: ${remediation}`);
  };

  check("git", "install git (https://git-scm.com), needed to initialize and clone repositories");
  check("node", "install Node.js, needed to run the setup CLI");

  if (missing.length > 0) {
    throw new SetupError(
      [
        `ERROR: ${missing.length} required command(s) missing:`,
        ...missing,
        "Install the missing tool(s), then re-run setup.",
      ].join("\n"),
    );
  }
}

export function requireFiles(kitRoot, options) {
  const files = [
    "manifest.yaml",
    "package.json",
    "bin/ent-app-kit.js",
    "src/cli.js",
    "src/setup/config.js",
    "src/setup/state.js",
    "src/setup/compile-check.js",
    "src/setup/tools.js",
    "payload/repos.yaml",
    "schemas/manifest-v1.json",
    "schemas/repos-v1.json",
    "skills/kit-orchestrator/SKILL.md",
    `skills/kit-method-${options.method}/SKILL.md`,
  ];
  for (const relative of files) {
    if (!fs.existsSync(path.join(kitRoot, relative))) {
      if (relative === "payload/repos.yaml") {
        throw new SetupError(
          [
            "ERROR: payload/repos.yaml is required after payload injection.",
            "Use examples/payload/minimal/repos.yaml as a minimal shape, or provide the generated repository topology.",
          ].join("\n"),
        );
      }
      throw new SetupError(`ERROR: required file not found: ${path.join(kitRoot, relative)}`);
    }
  }
}
