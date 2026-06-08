import "reflect-metadata";

import { bootstrap } from "./bootstrap.js";

void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
