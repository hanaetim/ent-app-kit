// @ts-check

/**
 * @typedef {"codex" | "claude-code" | "kiro" | "ibm-bob"} AgentId
 */

/**
 * @typedef {"speckit" | "openspec"} MethodId
 */

/**
 * @typedef {Object} AdapterContext
 * @property {string} workspaceRoot
 * @property {string} kitRoot
 */

/**
 * @typedef {Object} SkillSurface
 * @property {string} installDir
 * @property {string} refRoot
 */

/**
 * @typedef {Object} InstructionSurface
 * @property {string} target
 * @property {"standard" | "kiro-steering"} variant
 */

/**
 * @typedef {Object} SpecKitMethodSurface
 * @property {string} integration
 * @property {string[]} integrationOptions
 */

/**
 * @typedef {Object} OpenSpecMethodSurface
 * @property {string} tool
 */

/**
 * @typedef {Object} MethodSurfaces
 * @property {SpecKitMethodSurface} speckit
 * @property {OpenSpecMethodSurface} openspec
 */

/**
 * @typedef {Object} ImpeccableSurface
 * @property {string} provider
 * @property {boolean} [skillOnlyFromCodex]
 */

/**
 * @typedef {Object} NativeSurface
 * @property {string} id
 * @property {string} kind
 * @property {boolean} optional
 */

/**
 * @typedef {Object} AdapterValidationResult
 * @property {boolean} ok
 * @property {string[]} errors
 */

/**
 * @typedef {Object} AgentAdapter
 * @property {AgentId} id
 * @property {string} label
 * @property {string} version
 * @property {boolean} materialized
 * @property {(ctx: AdapterContext) => SkillSurface} skillSurface
 * @property {(ctx: AdapterContext) => InstructionSurface} instructionSurface
 * @property {"before-implementation" | "entry-point"} skillEntryMode
 * @property {MethodSurfaces} methods
 * @property {ImpeccableSurface | null} impeccable
 * @property {NativeSurface[]} nativeSurfaces
 * @property {(ctx: AdapterContext) => AdapterValidationResult} validate
 */

export {};
