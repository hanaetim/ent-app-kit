import { parseSetupArgs, printSetupHelp } from "./setup/options.js";
import { SetupError } from "./setup/process.js";
import { runSetup } from "./setup/index.js";

export async function main(argv = process.argv, io = process) {
  const args = argv.slice(2);
  const command = args[0];

  if (!command || command === "-h" || command === "--help") {
    printRootHelp(io.stdout);
    return 0;
  }

  if (command !== "setup") {
    printRootHelp(io.stderr);
    throw new SetupError(`ERROR: unknown command: ${command}`);
  }

  const options = parseSetupArgs(args.slice(1));
  if (options.help) {
    printSetupHelp(io.stdout);
    return 0;
  }

  await runSetup(options, io);
  return 0;
}

function printRootHelp(out) {
  out.write(`Enterprise App Kit CLI

Usage:
  ent-app-kit setup [options]

Commands:
  setup    Bootstrap an Enterprise App Kit workspace

Run "ent-app-kit setup --help" for setup options.
`);
}
