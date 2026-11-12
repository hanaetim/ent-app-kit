#!/usr/bin/env node
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { formatCliError } from "../src/cli-error.js";
import { ensureRuntimeDependencies } from "../src/runtime-deps.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireFromBin = createRequire(import.meta.url);

try {
  ensureRuntimeDependencies({
    packageRoot,
    resolver: requireFromBin.resolve,
  });
  const { main } = await import("../src/cli.js");
  await main(process.argv);
} catch (error) {
  const { message, exitCode } = formatCliError(error);
  console.error(message);
  process.exitCode = exitCode;
}
