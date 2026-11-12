import { cancel, confirm, isCancel, note, outro, select } from "@clack/prompts";
import { DEFAULTS } from "./options.js";
import { streamColors } from "./output.js";
import { SetupError } from "./process.js";

const AGENT_CHOICES = [
  { value: "ibm-bob", label: "IBM Bob" },
  { value: "codex", label: "Codex" },
  { value: "claude-code", label: "Claude Code" },
  { value: "kiro", label: "Kiro" },
];

const METHOD_CHOICES = [
  { value: "speckit", label: "Spec Kit - phase-heavy workflow for more formal spec-driven delivery" },
  { value: "openspec", label: "OpenSpec - leaner workflow for faster spec-driven delivery" },
  { value: "bmad", label: "BMAD", hint: "coming soon", disabled: true },
];

const MODE_CHOICES = [
  {
    value: "autopilot",
    label: "Autopilot - run the full build end-to-end unless blocked",
  },
  {
    value: "interactive",
    label: "Interactive - pause for input at key decisions",
  },
];

export async function promptMissingOptions(options, io) {
  const missing = missingSelectionFlags(options);
  if (missing.length === 0) return;

  if (options.nonInteractive || !isInteractive(io)) {
    throw new SetupError(missingSelectionMessage(missing));
  }

  const promptOptions = clackIo(io);
  let collected = false;

  try {
    printSetupIntro(promptOptions.output);
    note(setupOverview(), "Workspace preparation", promptOptions);

    if (!options.agentSet) {
      note(
        [
          "Enterprise App Kit works with the AI coding assistant you already have access to.",
          "Setup needs to know which assistant will work on this project so it can place the right project instructions and skills in the right location.",
          "The assistant must already be installed or available in your environment. Setup will not install the assistant or configure credentials.",
        ].join("\n"),
        "Assistant access",
        promptOptions,
      );
      options.agent = await promptChoice(
        "Select AI coding assistant",
        AGENT_CHOICES,
        DEFAULTS.agent,
        promptOptions,
      );
      collected = true;
    }
    if (!options.methodSet) {
      note(deliveryMethodOverview(), "Delivery method", promptOptions);
      options.method = await promptChoice(
        "Select delivery method",
        METHOD_CHOICES,
        DEFAULTS.method,
        promptOptions,
      );
      collected = true;
    }
    if (!options.modeSet) {
      note(executionModeOverview(), "Execution mode", promptOptions);
      options.mode = await promptChoice(
        "Select execution mode",
        MODE_CHOICES,
        DEFAULTS.mode,
        promptOptions,
      );
      collected = true;
    }

    if (collected) {
      note(formatSetupSelection(options), "Selected configuration", promptOptions);
      const shouldContinue = await confirm({
        message: "Continue and initialize this workspace?",
        initialValue: true,
        ...promptOptions,
      });
      if (isCancel(shouldContinue) || shouldContinue !== true) {
        clackCancel("Setup canceled before workspace changes.", promptOptions);
        throw new SetupError("ERROR: setup canceled before workspace changes.", isCancel(shouldContinue) ? 130 : 1);
      }
      outro("Setup configuration accepted.", promptOptions);
    }
  } catch (error) {
    if (error instanceof SetupError) throw error;
    throw new SetupError(
      [
        "ERROR: interactive setup prompt failed before workspace changes.",
        error?.message ? `Reason: ${error.message}` : "",
        "Rerun setup with explicit flags:",
        `  ${exampleSetupCommand()}`,
      ].filter(Boolean).join("\n"),
    );
  }
}

export async function promptToolDecision(io, tool, probe) {
  if (!isInteractive(io)) return "";

  const promptOptions = clackIo(io);
  const found = probe.version ? `${tool.command} ${probe.version}` : tool.command;
  try {
    if (probe.status === "missing") {
      note(
        [
          `${tool.label} is required but is not installed.`,
          `Recommended package: ${toolPackageLine(tool)}`,
        ].join("\n"),
        `${tool.label} setup`,
        promptOptions,
      );
      return await promptChoice(
        `${tool.label}: choose setup action`,
        [
          { value: "install", label: `Install ${toolPackageLine(tool)}` },
          { value: "abort", label: "Abort setup" },
        ],
        "install",
        promptOptions,
      );
    }

    note(
      [
        `${tool.label} is installed but does not match this App Kit.`,
        `Found: ${found}`,
        `Expected: ${tool.command} ${tool.version}`,
        probe.status === "unknown" ? "The installed version could not be verified." : "",
        `Updating to ${tool.version} is recommended for reproducible setup.`,
      ].filter(Boolean).join("\n"),
      `${tool.label} version`,
      promptOptions,
    );
    return await promptChoice(
      `${tool.label}: choose version action`,
      [
        { value: "keep", label: `Keep ${probe.version ?? "installed"}` },
        { value: "update", label: `Update to ${tool.version}` },
        { value: "abort", label: "Abort setup" },
      ],
      "keep",
      promptOptions,
    );
  } catch (error) {
    if (error instanceof SetupError) throw error;
    throw new SetupError(`ERROR: ${tool.label} prompt failed: ${error?.message ?? String(error)}`);
  }
}

export async function promptAgentInstructionsDecision(io, relativeTarget) {
  if (!isInteractive(io)) return "";

  const promptOptions = clackIo(io);
  try {
    const answer = await promptChoice(
      `How should setup handle the project-local ${relativeTarget}?`,
      [
        { value: "replace", label: `Replace` },
        { value: "keep", label: `Keep - not recommended; agent performance may degrade` },
        { value: "cancel", label: "Cancel setup" },
      ],
      "replace",
      promptOptions,
    );
    if (answer === "cancel") {
      clackCancel("Setup canceled before changing agent instructions.", promptOptions);
      throw new SetupError("ERROR: setup canceled before changing agent instructions.", 130);
    }
    return answer;
  } catch (error) {
    if (error instanceof SetupError) throw error;
    throw new SetupError(`ERROR: agent-instructions prompt failed: ${error?.message ?? String(error)}`);
  }
}

export function missingSelectionFlags(options) {
  const missing = [];
  if (!options.agentSet || !options.agent) missing.push("--agent");
  if (!options.methodSet || !options.method) missing.push("--method");
  if (!options.modeSet || !options.mode) missing.push("--mode");
  return missing;
}

export function missingSelectionMessage(missing) {
  return [
    `ERROR: setup requires explicit selection(s): ${missing.join(", ")}.`,
    "Interactive prompting is unavailable or disabled.",
    "Rerun setup with explicit flags:",
    `  ${exampleSetupCommand()}`,
  ].join("\n");
}

function clackIo(io) {
  return {
    input: io.stdin,
    output: io.stderr ?? io.stdout,
  };
}

function clackCancel(message, options) {
  /** @type {any} */ (cancel)(message, options);
}

function isInteractive(io) {
  return Boolean(io.stdin?.isTTY && (io.stderr?.isTTY || io.stdout?.isTTY));
}

async function promptChoice(message, options, initialValue, promptOptions) {
  const answer = await select({
    message,
    options,
    initialValue,
    ...promptOptions,
  });
  if (isCancel(answer)) {
    clackCancel("Setup canceled before workspace changes.", promptOptions);
    throw new SetupError("ERROR: setup canceled before workspace changes.", 130);
  }
  return answer;
}

function formatSetupSelection(options) {
  return [
    `Agent: ${options.agent}`,
    `Method: ${options.method}`,
    `Mode: ${options.mode}`,
  ].join("\n");
}

function printSetupIntro(output) {
  output.write(`\n┌  ${formatSetupTitle(output)}\n`);
}

function formatSetupTitle(output) {
  const colors = streamColors(output);
  return `${colors.bold}${colors.cyan}Enterprise App Kit Setup${colors.reset}`;
}

function setupOverview() {
  return [
    "This setup prepares the current project workspace for AI-assisted application delivery.",
    "",
    "It will:",
    "- validate the Enterprise App Kit package",
    "- prepare the project repositories declared by the kit",
    "- add project instructions and skills for the selected assistant",
    "- initialize the selected delivery workflow",
    "- save the setup choices for future runs",
    "",
    "This setup only prepares the current workspace. It does not build the application or run the delivery workflow.",
  ].join("\n");
}

function deliveryMethodOverview() {
  return [
    "Enterprise App Kit uses spec-driven development to help translate project intent into working application code.",
    "",
    "These workflows give the assistant structure for clarifying requirements, planning implementation, and tracking progress instead of relying only on ad-hoc prompting.",
  ].join("\n");
}

function executionModeOverview() {
  return [
    "This setting controls how the assistant should interact with you while building the application.",
    "",
    "It only sets the expected collaboration style. It does not change command approval settings, tool permissions, or security controls.",
    "Individual tools may still provide interactive experiences in either mode.",
  ].join("\n");
}

function exampleSetupCommand() {
  return [
    "npx --yes --package ./ent-app-kit ent-app-kit setup",
    `--agent ${DEFAULTS.agent}`,
    `--method ${DEFAULTS.method}`,
    `--mode ${DEFAULTS.mode}`,
  ].join(" ");
}

function toolPackageLine(tool) {
  return tool.runner === "uv" ? `${tool.packageName}==${tool.version}` : `${tool.packageName}@${tool.version}`;
}
