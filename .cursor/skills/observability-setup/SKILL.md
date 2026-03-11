---
name: observability-setup
description: OpenTelemetry, Prometheus, Grafana, Jaeger integration patterns.
origin: projectX-audit
---

# Observability Setup

Self-hosted, free observability stack for production APIs.

## Stack

- **Logging** — pino (JSON, structured)
- **Metrics** — prom-client + Prometheus
- **Tracing** — OpenTelemetry → Jaeger
- **Dashboards** — Grafana

## API Integration

### Metrics

- `/metrics` endpoint for Prometheus scraping
- Histogram: `http_request_duration_seconds`
- Counter: `http_requests_total`

### Tracing

- Load instrumentation before app: `node -r ./dist/instrumentation.js dist/index.js`
- Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces`
- Jaeger UI: http://localhost:16686

### Correlation ID

- Frontend sends `X-Correlation-ID`
- Backend propagates in logs and response headers

## Docker Compose

Run: `docker compose -f docker-compose.yml -f docker-compose.observability.yml up`
