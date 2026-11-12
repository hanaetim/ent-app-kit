// @ts-check

import path from "node:path";

/** @type {import("./types.js").AgentAdapter} */
export const codexAdapter = {
  id: "codex",
  label: "Codex",
  version: "1",
  materialized: true,
  skillSurface: ({ workspaceRoot }) => ({
    installDir: path.join(workspaceRoot, ".agents", "skills"),
    refRoot: ".agents/skills",
  }),
  instructionSurface: ({ workspaceRoot }) => ({
    target: path.join(workspaceRoot, "AGENTS.md"),
    variant: "standard",
  }),
  skillEntryMode: "before-implementation",
  methods: {
    speckit: {
      integration: "codex",
      integrationOptions: ["--skills"],
    },
    openspec: {
      tool: "codex",
    },
  },
  impeccable: {
    provider: "codex",
  },
  nativeSurfaces: [
    { id: "openai-plugin", kind: "plugin", optional: true },
  ],
  validate: () => ({ ok: true, errors: [] }),
};
