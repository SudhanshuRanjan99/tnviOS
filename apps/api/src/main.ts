import "reflect-metadata";

import { bootstrap } from "./bootstrap.js";
import { apiLogger } from "./logging/api-logger.js";

void bootstrap().catch((error: unknown) => {
  apiLogger.fatal("API bootstrap failed", error);
  process.exitCode = 1;
});
