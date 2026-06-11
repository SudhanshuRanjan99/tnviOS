import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvironmentFile } from "@tnvios/config";

import { MigrationRunner } from "./migrations.js";

const action = process.argv[2] ?? "status";
const migrationName = process.argv[3];
const environmentFile = process.env.TNVIOS_ENV_FILE ?? ".env.local";
const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

try {
  const environment = await loadEnvironmentFile(resolve(repositoryRoot, environmentFile));
  const runner = new MigrationRunner({ environment, entities: [], debug: false });

  switch (action) {
    case "status": {
      const status = await runner.status();
      console.warn(`Executed migrations: ${status.executed.length}`);
      console.warn(`Pending migrations: ${status.pending.length}`);
      break;
    }
    case "up": {
      const migrations = await runner.up();
      console.warn(`Applied migrations: ${migrations.length}`);
      break;
    }
    case "down": {
      if (!migrationName) {
        throw new Error("Migration name is required for rollback");
      }

      const migrations = await runner.down(
        migrationName,
        process.env.TNVIOS_ALLOW_PRODUCTION_MIGRATION_ROLLBACK === "true",
      );
      console.warn(`Rolled back migrations: ${migrations.length}`);
      break;
    }
    default:
      throw new Error(`Unknown migration action "${action}"`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown migration error.";
  console.error(`Migration command "${action}" failed: ${message}`);
  process.exitCode = 1;
}
