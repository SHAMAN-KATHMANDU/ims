import { initLogger } from "braintrust";
import { env } from "./env";
import { logger } from "./logger";

if (env.braintrustApiKey) {
  initLogger({
    projectName: env.braintrustProjectName,
    apiKey: env.braintrustApiKey,
  });
  logger.log(
    `[Braintrust] Logger initialized for project "${env.braintrustProjectName}"`,
  );
} else {
  logger.warn("[Braintrust] BRAINTRUST_API_KEY not set; tracing disabled");
}
