#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const image = process.env.ENT_APP_KIT_SMOKE_IMAGE || "node:20-bookworm";
const runtime = resolveContainerRuntime();
const keepWorkspace = process.argv.includes("--keep");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ent app kit container smoke "));
const copiedKitRoot = path.join(tmpRoot, "ent-app-kit");

try {
  copyKit();
  runContainerSmoke();
  console.log(`Container smoke test passed with ${runtime} and ${image}`);
} finally {
  if (!keepWorkspace) {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } else {
    console.log(`Kept container smoke workspace: ${tmpRoot}`);
  }
}

function copyKit() {
  fs.cpSync(kitRoot, copiedKitRoot, {
    recursive: true,
    filter(source) {
      const relative = normalizePath(path.relative(kitRoot, source));
      if (!relative) return true;
      return ![
        ".git",
        "node_modules",
        "openspec",
        ".kit-state",
        "repos",
        "out",
      ].some((entry) => relative === entry || relative.startsWith(`${entry}/`));
    },
  });
}

function runContainerSmoke() {
  const result = spawnSync(runtime, [
    "run",
    "--rm",
    "-v",
    bindMountArg(tmpRoot),
    "-w",
    "/work/ent-app-kit",
    image,
    "bash",
    "-lc",
    "apt-get update && apt-get install -y git && npm install && npm run test:smoke",
  ], {
    text: true,
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`failed to run ${runtime}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`container smoke test failed with exit code ${result.status}`);
  }
}

function resolveContainerRuntime() {
  const requested = process.env.ENT_APP_KIT_CONTAINER_RUNTIME;
  if (requested) {
    if (!runtimeAvailable(requested)) {
      throw new Error(`requested container runtime is unavailable: ${requested}`);
    }
    return requested;
  }

  for (const candidate of ["podman", "docker"]) {
    if (runtimeAvailable(candidate)) return candidate;
  }

  throw new Error([
    "podman or docker is required for the container smoke test.",
    "Install one of them, or set ENT_APP_KIT_CONTAINER_RUNTIME to the runtime command.",
  ].join("\n"));
}

function runtimeAvailable(command) {
  const result = spawnSync(command, ["--version"], {
    text: true,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0;
}

function bindMountArg(source) {
  if (runtime === "podman") return `${source}:/work:Z`;
  return `${source}:/work`;
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}
