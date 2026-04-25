/**
 * OpenTelemetry instrumentation — load before app with: node -r ./dist/instrumentation.js dist/index.js
 * Set OTEL_EXPORTER_OTLP_ENDPOINT (e.g. http://localhost:4318/v1/traces) to enable.
 * No-op when OTEL_EXPORTER_OTLP_ENDPOINT is not set.
 */

/* eslint-disable @typescript-eslint/no-require-imports --
 * Lazy require()s so the OpenTelemetry packages are only resolved when the
 * env var is set. ESM `import` would force eager load + bloat cold-start.
 */
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
if (endpoint) {
  const { NodeSDK } = require("@opentelemetry/sdk-node");
  const {
    getNodeAutoInstrumentations,
  } = require("@opentelemetry/auto-instrumentations-node");
  const {
    OTLPTraceExporter,
  } = require("@opentelemetry/exporter-trace-otlp-http");
  const { Resource } = require("@opentelemetry/resources");

  const traceExporter = new OTLPTraceExporter({ url: endpoint });
  const sdk = new NodeSDK({
    resource: new Resource({
      "service.name": process.env.OTEL_SERVICE_NAME ?? "ims-api",
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });
  sdk.start();
  process.on("SIGTERM", () => {
    sdk.shutdown().finally(() => process.exit(0));
  });
}
