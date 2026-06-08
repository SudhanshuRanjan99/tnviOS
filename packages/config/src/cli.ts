import { resolve } from "node:path";

import { EnvironmentValidationError, loadEnvironmentFile } from "./environment.js";

const environmentFile = process.argv[2] ?? ".env.local";

try {
  await loadEnvironmentFile(resolve(environmentFile));
  console.warn(`Environment validation passed for "${environmentFile}".`);
} catch (error) {
  if (error instanceof EnvironmentValidationError) {
    console.error(`Environment validation failed for "${environmentFile}":`);

    for (const issue of error.issues) {
      console.error(`- ${issue.path}: ${issue.message}`);
    }
  } else {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`Unable to validate environment file "${environmentFile}": ${message}`);
  }

  process.exitCode = 1;
}
