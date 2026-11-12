// @ts-check

import { claudeCodeAdapter } from "./claude-code.js";
import { codexAdapter } from "./codex.js";
import { ibmBobAdapter } from "./ibm-bob.js";
import { kiroAdapter } from "./kiro.js";

/** @type {import("./types.js").AgentAdapter[]} */
const ADAPTERS = [
  codexAdapter,
  claudeCodeAdapter,
  ibmBobAdapter,
  kiroAdapter,
];

/** @type {ReadonlyMap<string, import("./types.js").AgentAdapter>} */
const ADAPTER_BY_ID = new Map(ADAPTERS.map((adapter) => [adapter.id, adapter]));

export const SUPPORTED_AGENT_IDS = Object.freeze(ADAPTERS.map((adapter) => adapter.id));

/**
 * @param {string} agent
 * @returns {import("./types.js").AgentAdapter | undefined}
 */
export function findAgentAdapter(agent) {
  return ADAPTER_BY_ID.get(agent);
}

/**
 * @param {string} agent
 * @returns {import("./types.js").AgentAdapter}
 */
export function getAgentAdapter(agent) {
  const adapter = findAgentAdapter(agent);
  if (!adapter) throw new Error(`unsupported agent: ${agent}`);
  return adapter;
}

/**
 * @param {string} agent
 * @returns {boolean}
 */
export function isSupportedAgent(agent) {
  return ADAPTER_BY_ID.has(agent);
}

export function listAgentAdapters() {
  return [...ADAPTERS];
}
