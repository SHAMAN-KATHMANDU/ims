/**
 * Prometheus metrics middleware.
 * Records request count and duration for HTTP handlers.
 * Exclude /health and /metrics from metrics to reduce noise.
 */

import { Request, Response, NextFunction } from "express";
import { Counter, Histogram, register } from "prom-client";

const HTTP_REQUEST_DURATION = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

const HTTP_REQUESTS_TOTAL = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

function normalizeRoute(path: string): string {
  // Normalize dynamic segments for cardinality control
  return (
    path
      .replace(/\/api\/v1/, "")
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ":id",
      )
      .replace(/\/\d+/g, "/:id")
      .replace(/\/$/, "") || "/"
  );
}

const SKIP_PATHS = ["/health", "/metrics"];

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (SKIP_PATHS.some((p) => req.path === p || req.path.endsWith(p))) {
    return next();
  }
  const start = performance.now();
  const route = normalizeRoute(req.path);

  const onFinish = () => {
    res.removeListener("finish", onFinish);
    const duration = (performance.now() - start) / 1000;
    const status = res.statusCode.toString();

    HTTP_REQUEST_DURATION.observe(
      { method: req.method, route, status },
      duration,
    );
    HTTP_REQUESTS_TOTAL.inc({ method: req.method, route, status });
  };

  res.on("finish", onFinish);
  next();
}

export async function getMetrics(): Promise<string> {
  return register.metrics();
}
