# Enterprise App Kit

Turn a packaged set of specifications into working, enterprise-grade software — built for you by an AI coding agent, leveraging established spec-driven development frameworks like Spec Kit and OpenSpec, with BMAD planned.

## Prerequisites

- **Node.js 20.12+** with npm/npx, and **git**
- **uv** when using the `speckit` method so setup can install the official `specify-cli` tool user-wide
- **macOS, Linux, or Windows** for the Node setup path.
- A supported AI coding agent installed and authenticated:

  | Agent | Status |
  |---|---|
  | Claude Code | ✅ Supported |
  | Codex CLI | ✅ Supported |
  | Kiro CLI | ✅ Supported |
  | IBM Bob | ✅ Supported |

- A spec-driven development (SDD) method for how the agent plans and implements:

  | Method | Status | What it is |
  |---|---|---|
  | `speckit` | ✅ Supported | Spec-driven delivery with GitHub Spec Kit (default) |
  | `openspec` | ✅ Supported | OpenSpec delivery using generated OpenSpec skills and one change per delivery slice |
  | `bmad` | Coming soon | BMAD-style PRD/architecture/story workflow |

- Selected setup tools are resolved only when needed. OpenSpec can be installed globally with npm when the `openspec` method is selected, Spec Kit can be installed user-wide with `uv tool install` when the `speckit` method is selected, and Impeccable uses pinned `npx` setup execution when enabled. Setup never updates existing global tools without explicit interactive approval or `--ensure-tools`.
- Restricted-network environments should either allowlist or mirror the pinned package sources used during setup, or preinstall the required tools before running setup with `--no-tool-downloads`. That flag disables setup-managed installs and pinned `npx` execution; it does not make missing tools optional.

## Quick Start Scripts

For convenience, this package includes startup scripts at the repository root:

### `start.sh` - Startup Script

Handles environment setup and dependency installation:

```bash
./start.sh
```

The script performs the following:
1. Validates Node.js version (20.12+ required)
2. Installs npm dependencies if needed
3. Validates package structure (CLI entry point, manifest, payload)
4. Displays available commands and usage instructions
5. Includes graceful shutdown handling (trap SIGINT/SIGTERM)

**Note:** Enterprise App Kit is a CLI orchestrator, not a persistent service. The startup script prepares the environment and displays available commands. Use `npx ent-app-kit setup` to configure agent workspaces.

### `stop.sh` - Stop Script

Gracefully stops any running processes tracked by the startup script:

```bash
./stop.sh
```

Both scripts are executable and include proper signal handling for clean shutdown.

## Example: Customer Analysis System

This package currently includes a complete payload for the **Customer Analysis System** - an Arabic-first periodic customer behavior analysis application for the General Administration of Customs – Abu Dhabi (DG-CC).

**System Features:**
- 7 specialized AI agents (AGN1-AGN7) with deterministic backbone
- 8 MCP tools (TOL1-TOL8) with fixture-backed implementation
- Arabic-first report generation (تقرير تحليل المتعاملين)
- Mandatory approval gates (coverage validation, Section Head approval)
- Fixture data for functional acceptance testing
- Clean swap boundaries for future production integration

**To build this system:**

1. Run setup from workspace root:
   ```bash
   npx --yes --package ./ent-app-kit ent-app-kit setup --agent claude-code --method speckit --mode autopilot
   ```

2. Open Claude Code and run:
   ```
   Build the app kit.
   ```

The system will be built into `repos/customer-analysis/` as a complete Python CLI application with all agents, tools, fixtures, and tests.

See `payload/README.md` for detailed system specifications.

## Quickstart

Create or choose a workspace folder, put `ent-app-kit/` inside it, and open a terminal in that workspace root.
The recommended starting layout is:

```text
my-new-app/
  ent-app-kit/
```

**1.** In your terminal, from the workspace root, run setup. The Clack setup wizard asks for agent, method, and mode, then confirms the selected configuration before changing the workspace:

```bash
npx --yes --package ./ent-app-kit ent-app-kit setup
# or skip the interactive setup:
npx --yes --package ./ent-app-kit ent-app-kit setup --agent ibm-bob --method speckit --mode autopilot
# OpenSpec is also supported:
npx --yes --package ./ent-app-kit ent-app-kit setup --agent codex --method openspec --mode autopilot
```

Registry execution is not currently supported. The supported setup path requires a local `ent-app-kit/` directory in the workspace and runs with `npx --yes --package ./ent-app-kit ent-app-kit setup`.

The setup CLI uses package-managed Node dependencies for the wizard, YAML parsing, and schema validation. On a fresh copied package, the CLI installs its declared runtime dependencies automatically before setup starts; users do not run a separate install step. Selected external setup tools are resolved lazily according to the chosen method and options; use `--ensure-tools` when you want setup to install or update the recommended pinned tool versions automatically.

**2.** Start your coding agent from the workspace root, then tell it:

```
Build the app kit.
```

The app is built into `repos/`. See [Setup in Detail](#setup-in-detail) for the choices behind the flags, and [Prerequisites](#prerequisites) for what must be installed first.

## What Is This?

This directory (`ent-app-kit/`) is a **self-contained package** with three internal concerns:

- **Engine** (`package.json`, `bin/`, `src/`, `skills/`, `schemas/`) — the generic workflow machinery bundled with this App Kit package and versioned by `kit.version`.
- **Agent adapters** (`src/adapters/`) — the coding-agent-specific install contract. Adapters decide where skills are installed, which project instruction file is written, which Spec Kit/OpenSpec integration name is used, and which optional native/plugin/capability surfaces apply. This keeps the core setup flow independent from one agent's packaging model.
- **Payload** (`payload/`) — the injection target for everything specific to *your* project. In a reusable framework checkout it stays empty except placeholders; in an assembled App Kit package, payload injection must provide `payload/repos.yaml` (the repository layout). Beyond that, drop in whatever your project has: requirement docs, design artifacts, specs, backlogs, screenshots. **What's in `payload/` is what gets built — presence is scope.**
- **Examples** (`examples/payload/minimal/`) — a minimal valid payload shape for local experiments, tests, and packagers that need a starting topology.

Some payload directory names get special handling when present:

| Directory | Triggers |
|---|---|
| `payload/design/` | Frontend design workstream uses it as brand/design truth |
| `payload/air/` | Agent framework emitters (LangGraph, Strands) |
| `payload/connectivity/` | Integration and contract checks |
| `payload/nfr/` | Non-functional requirements pack |
| `payload/conformance/` | Conformance test suite |
| `payload/deploy/` | Deployment planning |
| `payload/skills/` | Project-specific agent skills, installed alongside the engine's |

Everything else — any file or folder — is treated as source material the build derives requirements from. Omit what you don't have; an absent directory just means that workstream has no dedicated inputs.

### Declaring repositories (`payload/repos.yaml`)

`repos.yaml` declares the target repository topology — how many repos the solution is built as, and where each one comes from. Setup materializes each declared repository in the workspace before the agent starts.

Payload generators normally write this file during assembly. For a local minimal starting point, copy `examples/payload/minimal/repos.yaml` to `payload/repos.yaml` and then edit the repository names, roles, and paths for your project.

```yaml
schema: appkit-repos-v1
topology: multi            # mono | multi

repositories:
  - name: backend
    role: backend
    workspace_path: repos/backend      # workspace-relative; defaults to repos/<name>
    source: greenfield                 # greenfield | brownfield
    description: Backend service and APIs.

  - name: legacy-core
    role: backend
    workspace_path: repos/legacy-core
    source: brownfield
    remote: git@github.example.com:my-org/legacy-core.git # optional
    branch: develop                    # optional; remote default branch if omitted
```

Per `source`, setup does the following at each repo's `workspace_path`:

- **`greenfield`** — creates the directory and initializes an empty git repository on `main`.
- **`brownfield`** — an existing repo the workflow builds onto. Either:
  - declare `remote` (at `branch` if given) and setup clones it — the clone must succeed or setup fails; configure git credentials for the host first (e.g. `gh auth login`, SSH keys); or
  - omit `remote` and copy the existing repo into `workspace_path` yourself before running setup — setup detects and uses it as-is.

Setup is idempotent: re-running it leaves existing repos and their working trees untouched. It fails rather than guesses on conflicts — a `workspace_path` that already contains unrelated content, or a clone whose existing origin URL differs from the declared `remote`. `workspace_path` must stay inside the workspace (no absolute paths, no `..`).

You run one setup command, open your coding agent, and ask it to build.

## How It Works

```
ent-app-kit/          You drop this package into the workspace folder
  └── bin/            One-time bootstrap CLI: installs skills, writes workspace state
        │
        ▼
your coding agent     Reads the installed instructions and builds the app
        │
        ▼
repos/                Generated application code (e.g. backend, frontend)
out/                  Generated reports
.kit-state/           Workflow state (lets the agent resume where it left off)
```

The agent works method-driven: it derives delivery slices from the packaged specs, implements them one by one, and verifies the result against the original artifacts. Everything it builds is traceable back to the kit.

## LLM Wiki

Enterprise App Kit can generate an `llm-wiki/` beside `ent-app-kit/`: a persistent, agent-readable knowledge layer derived from the package payload and structured with Open Knowledge Format (OKF) conventions.

The wiki does not replace `payload/` as source of truth. Instead, it gives the coding agent a faster way to orient itself before it checks the exact requirements, contracts, wireframes, and acceptance criteria in `payload/`.

The main advantages are:

- **Less repeated context reconstruction** — durable product, architecture, workflow, agent, integration, data, control, and implementation knowledge is summarized once and reused across slices.
- **Better navigation across large payloads** — related concepts are linked through pages such as agents, tools, systems, controls, evals, decisions, and open questions.
- **More reliable resumability** — future agent sessions can start from `llm-wiki/index.md` to recover the implementation context quickly.
- **Clear source boundaries** — wiki pages point back to payload files, while `payload/` remains the binding source for exact scope.
- **A place for reusable synthesis** — implementation insights and recurring answers can be filed back into the wiki with source traceability.

For ordinary implementation work, agents use the wiki for orientation, then verify exact details in `ent-app-kit/payload/` before coding.

## Impeccable

Enterprise App Kit installs [Impeccable](https://github.com/pbakaus/impeccable) during setup to give supported agents a frontend design skill for shaping, auditing, polishing, and hardening UI work.

Impeccable is resolved through pinned `npx` package execution when setup runs; it is not installed globally by default and is not vendored into the package. Setup installs it into the active agent's project skill directory, for example `.agents/skills/impeccable` for Codex, `.claude/skills/impeccable` for Claude Code, `.kiro/skills/impeccable` for Kiro, or `.bob/skills/impeccable` for IBM Bob.

The main advantages are:

- **Shared design context** — Impeccable can capture product and design intent in `PRODUCT.md` and `DESIGN.md`, so later UI work has durable context for audience, brand, voice, colors, typography, and components.
- **A concrete design vocabulary** — commands such as `shape`, `critique`, `audit`, `polish`, `harden`, `bolder`, and `quieter` give the agent specific ways to improve frontend work instead of relying on vague "make it better" prompts.
- **Automatic quality pressure** — on hook-capable agents, Impeccable can run deterministic design checks after UI edits and feed findings back into the agent flow, catching common issues while the app is being built.
- **Manual design passes still work everywhere** — even without hooks, the installed skill gives the agent structured workflows for frontend review, responsive behavior, accessibility, edge cases, and final polish.

For Codex, Claude Code, and Kiro, setup uses Impeccable's native installer through the pinned package. For IBM Bob, setup installs the skill only; Bob does not currently have a supported Impeccable design hook integration. Skip Impeccable installation with `--skip-impeccable`.

## Setup in Detail

**1. Create or choose a workspace folder**

```
my-workspace/
  └── ent-app-kit/
```

For new apps, start with a fresh folder. With the current local package flow, put `ent-app-kit/` inside it and run setup from the parent workspace root. Registry execution is not currently supported. For brownfield work, setup can clone declared remotes, or you can place an existing local repo at its configured `workspace_path` before setup runs. Do not run setup from inside `ent-app-kit/`.

**2. Run setup from the workspace root in your terminal**

```bash
npx --yes --package ./ent-app-kit ent-app-kit setup
```

Setup opens the Clack wizard and walks you through three choices interactively (or pass them as flags):

```bash
npx --yes --package ./ent-app-kit ent-app-kit setup --agent claude-code --method speckit --mode autopilot
npx --yes --package ./ent-app-kit ent-app-kit setup --agent codex --method openspec --mode autopilot
```

- **Agent** — which coding agent you'll use (see table above).
- **SDD Method** — how the agent plans and implements (see table above).
- **Mode** — `autopilot` runs the workflow end-to-end unless blocked; `interactive` pauses for user input at important workflow phases.

IBM Bob uses the agent id `ibm-bob`.

**3. Open your coding agent in the workspace and ask it to build**

```
Build the app kit.
```

That's it. The agent reads the installed instructions, plans the work in slices, and builds the application into `repos/`.

## What Setup Actually Does

No magic — `ent-app-kit setup` is a deterministic Node.js setup command that:

1. Validates the assembled package contents (`manifest.yaml`, `payload/repos.yaml`, skills).
2. Initializes workspace state in `.kit-state/state.yaml`, including an inventory of what your payload provides.
3. Prepares selected method tools when needed and approved: the pinned OpenSpec npm package for OpenSpec, or the pinned Spec Kit uv tool for Spec Kit.
4. Initializes the selected SDD workspace when needed (`.specify/` for Spec Kit, `openspec/` for OpenSpec).
5. Installs the kit's skills — engine skills from `skills/` plus any project skills from `payload/skills/` — where your agent can find them (e.g. `.claude/skills/` for Claude Code, `.bob/skills/` for IBM Bob).
6. Writes a driver instructions file for your agent (e.g. `CLAUDE.md` for Claude Code or `AGENTS.md` for Codex and IBM Bob). If one already exists, interactive setup asks whether to replace it, keep it, or cancel. Non-interactive setup requires `--replace-agent-instructions` or `--keep-agent-instructions`.
7. Runs Impeccable through the pinned package declared by setup when enabled.
8. Runs a compile check to confirm the workspace is ready.

Agent-specific behavior is routed through adapters rather than spread across setup modules. To add another coding agent, add an adapter that declares the skill surface, instruction surface, method-tool mapping, optional native/plugin surfaces, and capability-provider mappings, then register it and add setup tests. The existing direct-install model remains the default; native plugins are optional adapter outputs, not the core package format.

Run `npx --yes --package ./ent-app-kit ent-app-kit setup --help` from the workspace root for all options. Scripted setup with `--non-interactive` or `--yes` must pass `--agent`, `--method`, and `--mode`; if those selections are missing and prompting is unavailable, setup fails before writing workspace files and prints a complete example command.

The legacy shell/Python startup fallback has been removed from the package. Setup is supported through the Node CLI.

### Third-Party Tools and Dependencies

Enterprise App Kit uses the following third-party components during setup and runtime. This is the README-level install/run inventory for direct components. Transitive dependency details are resolved by the relevant package manager and should be tracked through `package-lock.json`, lockfiles from setup-time tools, or OSS/SBOM review artifacts when required.

Direct runtime npm dependencies for the local `ent-app-kit` package:

| Component | Declared range | Current lockfile version | License | Used for | How it is obtained |
|---|---:|---:|---|---|---|
| `@clack/prompts` | `^1.7.0` | `1.7.0` | MIT | Interactive setup wizard | Installed by npm for the local `ent-app-kit` package |
| `ajv` | `^8.20.0` | `8.20.0` | MIT | JSON schema validation | Installed by npm for the local `ent-app-kit` package |
| `yaml` | `^2.9.0` | `2.9.0` | ISC | YAML parsing | Installed by npm for the local `ent-app-kit` package |

OpenSpec, Spec Kit, and Impeccable are selected setup-time tools, not always-installed dependencies of `ent-app-kit`. Setup resolves only the tools required by the selected method and agent options:

| Component | Pinned package | When used | How setup obtains it | Bundled in `ent-app-kit`? |
|---|---|---|---|---|
| OpenSpec | `@fission-ai/openspec@1.8.0` | When `--method openspec` needs setup-managed OpenSpec installation | npm global install | No |
| Spec Kit | `specify-cli==0.16.2` | When `--method speckit` needs setup-managed Spec Kit installation | `uv tool install` | No |
| Impeccable | `impeccable@3.6.1` | When Impeccable is enabled for the selected agent | pinned `npx` package execution | No |

For restricted-network environments, the possible setup-time package-manager fetches are:

- App Kit runtime npm dependencies for the local `ent-app-kit` package on first run.
- `@fission-ai/openspec@1.8.0` via npm global install when `--method openspec` needs setup-managed OpenSpec installation.
- `specify-cli==0.16.2` via `uv tool install` when `--method speckit` needs setup-managed Spec Kit installation.
- `impeccable@3.6.1` through pinned `npx` package execution when Impeccable is enabled.

The App Kit runtime dependency bootstrap runs `npm install --omit=dev --no-audit --fund=false --ignore-scripts`. The selected setup tools are pinned to the versions above, but their setup-managed install or execution commands do not add an explicit `--ignore-scripts` flag.

OpenSpec and Spec Kit are persistent method tools because users should be able to run plain commands such as `openspec ...` and `specify ...` after setup completes:

- OpenSpec uses the pinned npm global package declared by setup.
- Spec Kit uses the pinned uv user tool declared by setup.

Before invoking either persistent method tool, setup checks whether the command already exists on `PATH` and reports the kit-pinned version:

- If the command is missing, interactive setup asks whether to install the pinned package. Non-interactive setup fails unless `--ensure-tools` is set.
- If the command exists and reports the pinned version, setup reuses it and does not reinstall.
- If the command exists with a different version, interactive setup asks whether to keep the existing version, update to the pinned version, or abort. Non-interactive setup keeps the existing version and prints a warning.
- If the command exists but its version cannot be verified, setup treats it as unpinned and follows the same warning or prompt behavior as a mismatched version.

After every persistent install or update, setup verifies that the command is visible on `PATH` and reports the expected pinned version. If either check fails, setup stops with a remediation message instead of continuing with an unknown tool version.

Impeccable is different: it is setup-time only by default and runs through pinned `npx` package execution. It installs the Impeccable skill into the selected agent's skill directory, but setup does not globally install the `impeccable` command. Setup runs this pinned package automatically when Impeccable is enabled; skip it with `--skip-impeccable`, or use `--no-tool-downloads` to forbid pinned `npx` execution.

Useful setup-tool options:

- `--ensure-tools` installs missing persistent tools and updates mismatched or unverifiable persistent tools to App Kit's pinned versions without additional prompts. Use this for CI and reproducible enterprise bootstrap scripts.
- `--no-tool-downloads` disables package installs, updates, and pinned `npx` execution. Use it only after required method tools are preinstalled on `PATH` or supplied by an enterprise image. Missing required tools fail, and mismatched installed persistent tools are reused with warnings.
- `--verbose-tools` streams full npm, npx, or uv output live when troubleshooting a slow or failing tool command. By default, setup keeps tool output concise and captures package-manager logs for failures.
- `--skip-impeccable` avoids resolving or running Impeccable.

Examples:

```bash
# Interactive setup asks before installing or updating setup tools.
npx --yes --package ./ent-app-kit ent-app-kit setup

# CI/reproducible setup: enforce the kit-pinned setup tools.
npx --yes --package ./ent-app-kit ent-app-kit setup --agent ibm-bob --method speckit --mode autopilot --non-interactive --ensure-tools

# Locked-down setup: never download or update tools.
npx --yes --package ./ent-app-kit ent-app-kit setup --agent codex --method openspec --mode autopilot --non-interactive --no-tool-downloads --skip-impeccable
```

## Everyday Tasks

**Resume an interrupted run** — just ask your agent:

```
Resume the app kit build.
```

The agent reconstructs its position from `.kit-state/` and continues; it never restarts completed work.

**Add a feature after the build** — ask for it in plain language. New features flow through the same workflow as new, traceable scope.

**Change agent, method, or mode** — rerun setup from the workspace root with new flags.

## Quality Checks

Run the unit tests:

```bash
npm test
```

Run the typed-JavaScript contract check:

```bash
npm run typecheck
```

The setup CLI remains runtime JavaScript. TypeScript is used in no-emit mode with JSDoc and `// @ts-check` to catch adapter-contract drift without adding a build step or requiring a TypeScript loader during setup.

Run the local-package smoke test:

```bash
npm run test:smoke
```

The smoke test creates a fresh temporary workspace with spaces in its path, copies `ent-app-kit/` into it without local runtime artifacts, checks the npm package file list, runs the documented local-package `npx --yes --package ./ent-app-kit ent-app-kit setup --agent codex --method openspec --mode autopilot --non-interactive` path against an already initialized OpenSpec workspace, and verifies that setup produced `.kit-state/`, agent instructions, installed skills, and initialized repos. Use `npm run validate` to run typecheck, unit tests, and the smoke test.

Run the same smoke test inside a clean container:

```bash
npm run test:smoke:container
```

The container smoke uses Podman when available and falls back to Docker. It copies the kit to a temporary directory, mounts that copy into `node:20-bookworm`, installs only the container prerequisites, and runs `npm run test:smoke` inside the container. Override the runtime with `ENT_APP_KIT_CONTAINER_RUNTIME=<podman|docker>` and the image with `ENT_APP_KIT_SMOKE_IMAGE=<image>` when needed.

## Workspace Layout After Setup

| Path | What it is | Yours to edit? |
|---|---|---|
| `ent-app-kit/` | The package: engine + `payload/` project content | Treat as read-only input |
| `repos/` | Generated application code | Yes — it's your app |
| `out/` | Generated reports | Generated |
| `.kit-state/` | Workflow runtime state | No — managed by the workflow |

## Security Considerations

### Configuration File Trust

Enterprise App Kit processes configuration files that must be trusted:

- **`repos.yaml`** and **`manifest.yaml`** are trusted configuration files that should be under version control
- These files control git repository URLs, workspace paths, and build-time behavior
- Only use repos.yaml files from trusted sources — malicious configurations could attempt path traversal or command injection
- SSH keys are recommended over HTTPS tokens for git authentication to avoid credential exposure in URLs

### Built-in Security Protections

The kit implements several security measures:

1. **Path Traversal Prevention (CWE-22):**
   - All workspace paths are validated to prevent directory traversal
   - Paths are normalized and checked against workspace boundaries
   - Symbolic links and encoded paths are validated

2. **Command Injection Prevention (CWE-78):**
   - Git URLs are validated against expected patterns
   - Branch names must match git ref naming rules
   - Shell metacharacters and command-like arguments are rejected

3. **Credential Protection (CWE-209):**
   - Git URLs are sanitized in error messages to mask embedded credentials
   - Prefer SSH keys over embedding tokens in URLs

4. **YAML Security (CWE-502):**
   - YAML parsing includes alias count limits to prevent expansion attacks
   - Unsafe YAML constructors are disabled by default
   - Only parse YAML from trusted, version-controlled sources

### Generated Code Security

The framework generates code based on payload specifications. While the framework validates structure:

- Review generated code before deployment to production
- Verify security requirements (approval gates, audit trails, PII masking) are implemented
- Run security scans on generated applications
- Test authentication and authorization logic thoroughly

### Reporting Security Issues

To report security vulnerabilities in Enterprise App Kit itself, please contact the maintainers directly rather than opening public issues.

## Troubleshooting

- **"`payload/repos.yaml` is required"** — run setup only after payload assembly has written the repository topology. For local experiments, copy `examples/payload/minimal/repos.yaml` to `payload/repos.yaml` and edit it.
- **Unsupported agent** — add or fix the corresponding adapter under `src/adapters/`, then confirm the agent id is registered and listed in `manifest.yaml`.
- **Output appears in the wrong place** — run setup in a terminal from the workspace root, not from inside `ent-app-kit/`.
- **A selected setup tool cannot be resolved** — install the required package runner (`npm` for OpenSpec, `uv` for Spec Kit, `npx` for Impeccable), rerun with `--ensure-tools` to let setup install or update pinned tools, or use `--no-tool-downloads` after placing required tools on `PATH`.
- **A method tool installed but the command is still missing** — restart your terminal or IDE, make sure the npm global bin or uv tool bin directory is on `PATH`, then rerun setup.
- **Driver file already exists** — interactive setup asks whether to replace it, keep it, or cancel. Non-interactive setup fails unless you pass `--replace-agent-instructions` or `--keep-agent-instructions`.
- **Agent says setup state is missing** — run setup first from the workspace root; the workflow blocks until `.kit-state/state.yaml` exists.
- **Skip the compile check** (e.g. in constrained environments) — pass `--skip-compile-check`.
