// @ts-check

import path from "node:path";

/** @type {import("./types.js").AgentAdapter} */
export const kiroAdapter = {
  id: "kiro",
  label: "Kiro",
  version: "1",
  materialized: true,
  skillSurface: ({ workspaceRoot }) => ({
    installDir: path.join(workspaceRoot, ".kiro", "skills"),
    refRoot: ".kiro/skills",
  }),
  instructionSurface: ({ workspaceRoot }) => ({
    target: path.join(workspaceRoot, ".kiro", "steering", "enterprise-app-kit.md"),
    variant: "kiro-steering",
  }),
  skillEntryMode: "before-implementation",
  methods: {
    speckit: {
      integration: "kiro-cli",
      integrationOptions: [],
    },
    openspec: {
      tool: "kiro",
    },
  },
  impeccable: {
    provider: "kiro",
  },
  nativeSurfaces: [
    { id: "kiro-steering", kind: "steering", optional: false },
  ],
  validate: () => ({ ok: true, errors: [] }),
};
