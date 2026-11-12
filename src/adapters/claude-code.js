// @ts-check

import path from "node:path";

/** @type {import("./types.js").AgentAdapter} */
export const claudeCodeAdapter = {
  id: "claude-code",
  label: "Claude Code",
  version: "1",
  materialized: true,
  skillSurface: ({ workspaceRoot }) => ({
    installDir: path.join(workspaceRoot, ".claude", "skills"),
    refRoot: ".claude/skills",
  }),
  instructionSurface: ({ workspaceRoot }) => ({
    target: path.join(workspaceRoot, "CLAUDE.md"),
    variant: "standard",
  }),
  skillEntryMode: "before-implementation",
  methods: {
    speckit: {
      integration: "claude",
      integrationOptions: [],
    },
    openspec: {
      tool: "claude",
    },
  },
  impeccable: {
    provider: "claude",
  },
  nativeSurfaces: [
    { id: "claude-code-plugin", kind: "plugin", optional: true },
  ],
  validate: () => ({ ok: true, errors: [] }),
};
