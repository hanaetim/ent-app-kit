export function terminalColors(io) {
  return streamColors(io.stderr);
}

export function streamColors(stream) {
  const enabled = Boolean(stream.isTTY) && !process.env.NO_COLOR;
  if (!enabled) {
    return { reset: "", bold: "", cyan: "", yellow: "", reverse: "" };
  }
  return {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    cyan: "\x1b[38;2;15;98;254m",
    yellow: "\x1b[33m",
    reverse: "\x1b[7m",
  };
}

export function status(label, io) {
  const colors = streamColors(io.stdout);
  io.stdout.write(`\n${colors.bold}${colors.cyan}${label}${colors.reset}\n`);
}

export function note(message, io) {
  const colors = terminalColors(io);
  io.stderr.write(`  ${colors.yellow}!${colors.reset} ${message}\n`);
}

export function formatToolOutput(output, io) {
  for (const line of output.split(/\r?\n/)) {
    if (!line) continue;
    if (line.startsWith("WARN: ")) note(line.slice(6), io);
    else if (line.startsWith("Compile check passed")) {
      const match = line.match(/with ([0-9]+) warning/);
      if (match) io.stdout.write(`  Checks passed with ${match[1]} setup note(s).\n`);
      else io.stdout.write(`  ${line}\n`);
    } else {
      io.stdout.write(`  ${line}\n`);
    }
  }
}
