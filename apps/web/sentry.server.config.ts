import * as Sentry from "@sentry/nextjs";

if (globalThis.process?.env?.SENTRY_DSN) {
  Sentry.init({
    dsn: globalThis.process?.env?.SENTRY_DSN,
    tracesSampleRate: Number(
      globalThis.process?.env?.SENTRY_TRACES_SAMPLE_RATE ?? 0.1,
    ),
  });
}
