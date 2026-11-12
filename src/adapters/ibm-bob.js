// @ts-check

import path from "node:path";

/** @type {import("./types.js").AgentAdapter} */
export const ibmBobAdapter = {
  id: "ibm-bob",
  label: "IBM Bob",
  version: "1",
  materialized: true,
  skillSurface: ({ workspaceRoot }) => ({
    installDir: path.join(workspaceRoot, ".bob", "skills"),
    refRoot: ".bob/skills",
  }),
  instructionSurface: ({ workspaceRoot }) => ({
    target: path.join(workspaceRoot, "AGENTS.md"),
    variant: "standard",
  }),
  skillEntryMode: "entry-point",
  methods: {
    speckit: {
      integration: "bob",
      integrationOptions: ["--skills"],
    },
    openspec: {
      tool: "bob",
    },
  },
  impeccable: {
    provider: "codex",
    skillOnlyFromCodex: true,
  },
  nativeSurfaces: [
    { id: "bob-skills", kind: "skills", optional: false },
  ],
  validate: () => ({ ok: true, errors: [] }),
};
