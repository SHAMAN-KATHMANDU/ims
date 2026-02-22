import * as Sentry from "@sentry/node";
import { env } from "@/config/env";

let initialized = false;

export function initSentry(): void {
  if (initialized || !env.sentryDsn) return;

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    tracesSampleRate: env.sentryTracesSampleRate,
    release: process.env.npm_package_version,
  });

  initialized = true;
}

export { Sentry };
