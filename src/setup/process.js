import { spawn as spawnChild, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export class SetupError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

export function commandExists(command, env = process.env, platform = process.platform) {
  const pathValue = env.PATH || "";
  const directories = pathValue.split(path.delimiter).filter(Boolean);
  const extensions = platform === "win32"
    ? (env.PATHEXT || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];

  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = path.join(directory, platform === "win32" ? `${command}${extension}` : command);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        return true;
      } catch {
        // Keep scanning PATH.
      }
    }
  }
  return false;
}

export function spawn(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env || process.env,
    encoding: "utf8",
    input: options.input,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const combined = [stdout, stderr].filter(Boolean).join("");
  if (result.error && !options.allowFailure) {
    throw new SetupError(`ERROR: failed to run ${command}: ${result.error.message}`);
  }
  const status = result.status ?? (result.error ? 1 : 0);
  if (status !== 0 && !options.allowFailure) {
    throw new SetupError(`ERROR: ${options.label || command} failed:\n${combined.trim()}`);
  }
  return { status, stdout, stderr, combined };
}

export function runLoggedCommand(command, args, options = {}) {
  const io = options.io || process;
  const action = options.action || command;
  const verbose = Boolean(options.verbose);
  const heartbeatMs = Number(options.heartbeatMs || process.env.ENT_APP_KIT_TOOL_HEARTBEAT_MS || 30000);
  const detail = options.detail ? ` (${options.detail})` : "";

  io.stdout.write(`  ${action}${detail}\n`);

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const started = Date.now();
    const child = spawnChild(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const heartbeat = heartbeatMs > 0
      ? setInterval(() => {
        const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
        io.stdout.write(`  Still running after ${seconds}s: ${action}\n`);
      }, heartbeatMs)
      : null;

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stdout += text;
      if (verbose) io.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderr += text;
      if (verbose) io.stderr.write(text);
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      if (heartbeat) clearInterval(heartbeat);
      const combined = [stdout, stderr].filter(Boolean).join("");
      if (!options.allowFailure) {
        reject(new SetupError(`ERROR: failed to run ${command}: ${error.message}`));
        return;
      }
      resolve({ status: 1, stdout, stderr, combined, error });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      if (heartbeat) clearInterval(heartbeat);
      const status = code ?? 1;
      const combined = [stdout, stderr].filter(Boolean).join("");
      if (status === 0) {
        io.stdout.write(`  ${action}: completed\n`);
      }
      if (status !== 0 && !options.allowFailure) {
        reject(new SetupError(`ERROR: ${options.label || command} failed:\n${combined.trim()}`));
        return;
      }
      resolve({ status, stdout, stderr, combined });
    });
  });
}

export function isolatedNpmExecEnv(extra = {}) {
  /** @type {NodeJS.ProcessEnv} */
  const env = { ...process.env, ...extra };
  delete env.npm_config_package;
  delete env.npm_config_packages;
  delete env.npm_config_call;
  delete env.npm_config_argv;
  return env;
}
