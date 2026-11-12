export function formatCliError(error) {
  const message = error && error.message ? error.message : String(error);
  const exitCode = error && Number.isInteger(error.exitCode) ? error.exitCode : 1;
  return { message, exitCode };
}
