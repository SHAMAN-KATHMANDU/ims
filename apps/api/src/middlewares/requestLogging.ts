/**
 * Request logging middleware for all API calls.
 * Logs method, path, and request ID on request; logs status code and duration on response.
 * Records Prometheus metrics (duration, count) for /api/v1 requests.
 * Does not log request body or headers to avoid leaking secrets.
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "@/config/logger";
import { httpRequestDuration, httpRequestTotal } from "@/config/metrics";
import { getAuthContext } from "@/shared/auth/getAuthContext";

const API_BASE_PATH = "/api/v1";

export const requestLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Only log and record metrics for API requests
  if (!req.path.startsWith(API_BASE_PATH)) {
    return next();
  }

  const requestId = req.requestId ?? "unknown";
  const method = req.method;
  const path = req.path;
  const start = Date.now();
  const auth = req.authContext ?? getAuthContext(req);
  const tenantId = auth?.tenantId;
  const userId = auth?.userId;

  logger.request("API request", requestId, { method, path, tenantId, userId });

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const durationSec = durationMs / 1000;
    const statusCode = String(res.statusCode);
    const route = path.split("?")[0];

    logger.request("API response", requestId, {
      method,
      path,
      tenantId,
      userId,
      statusCode: res.statusCode,
      latencyMs: durationMs,
    });

    httpRequestDuration.observe(
      { method, route, status: statusCode },
      durationSec,
    );
    httpRequestTotal.inc({ method, route, status: statusCode });
  });

  next();
};
