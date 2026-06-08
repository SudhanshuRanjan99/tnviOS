import { validateEnvironment } from "@tnvios/config";

import { createApplication, getApiRuntimeOptions } from "./application.js";

export async function bootstrap(environment: NodeJS.ProcessEnv = process.env): Promise<void> {
  validateEnvironment(environment);

  const application = await createApplication();
  const { host, port } = getApiRuntimeOptions(environment);

  await application.listen(port, host);
}
