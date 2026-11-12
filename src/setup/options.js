import { SetupError } from "./process.js";

export const DEFAULTS = {
  agent: "ibm-bob",
  method: "speckit",
  mode: "autopilot",
};

export function printSetupHelp(out) {
  out.write(`Enterprise App Kit setup

Usage:
  ent-app-kit setup [options]

Options:
  --agent <codex|claude-code|ibm-bob|kiro>
  --method <speckit|openspec>
  --mode <autopilot|interactive>
  --replace-agent-instructions Replace an existing active agent instructions file
  --keep-agent-instructions    Keep an existing active agent instructions file unchanged
  --skip-impeccable
  --ensure-tools             Install or update setup tools to App Kit's pinned versions
  --no-tool-downloads        Never download, install, update, or run pinned package tools
  --verbose-tools            Stream full setup-tool output for troubleshooting
  --skip-compile-check
  --non-interactive
  --yes
  -h, --help

Run this command from the workspace root that contains ent-app-kit/.
Setup reuses installed tools by default and prompts before downloads when the terminal is interactive.
Use --ensure-tools for reproducible non-interactive setup with pinned tool versions.
`);
}

export function parseSetupArgs(args) {
  const options = {
    agent: undefined,
    method: undefined,
    mode: undefined,
    workspaceRoot: process.cwd(),
    replaceAgentInstructions: false,
    keepAgentInstructions: false,
    installImpeccable: true,
    ensureTools: false,
    noToolDownloads: false,
    verboseTools: false,
    runCompileCheck: true,
    nonInteractive: false,
    agentSet: false,
    methodSet: false,
    modeSet: false,
    help: false,
  };

  for (let i = 0; i < args.length; ) {
    const arg = args[i];
    switch (arg) {
      case "--agent":
        options.agent = requireValue(args, i, arg);
        options.agentSet = true;
        i += 2;
        break;
      case "--method":
        options.method = requireValue(args, i, arg);
        options.methodSet = true;
        i += 2;
        break;
      case "--mode":
        options.mode = normalizeMode(requireValue(args, i, arg));
        options.modeSet = true;
        i += 2;
        break;
      case "--replace-agent-instructions":
        options.replaceAgentInstructions = true;
        i += 1;
        break;
      case "--keep-agent-instructions":
        options.keepAgentInstructions = true;
        i += 1;
        break;
      case "--skip-impeccable":
        options.installImpeccable = false;
        i += 1;
        break;
      case "--ensure-tools":
        options.ensureTools = true;
        i += 1;
        break;
      case "--no-tool-downloads":
        options.noToolDownloads = true;
        i += 1;
        break;
      case "--verbose-tools":
        options.verboseTools = true;
        i += 1;
        break;
      case "--skip-compile-check":
        options.runCompileCheck = false;
        i += 1;
        break;
      case "--non-interactive":
      case "--yes":
        options.nonInteractive = true;
        i += 1;
        break;
      case "-h":
      case "--help":
        options.help = true;
        i += 1;
        break;
      default:
        printSetupHelp(process.stderr);
        throw new SetupError(`ERROR: unknown option: ${arg}`);
    }
  }

  return options;
}

export function normalizeMode(mode) {
  return mode;
}

function requireValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new SetupError(`ERROR: missing value for ${flag}`);
  }
  return value;
}
