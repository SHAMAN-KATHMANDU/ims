/**
 * Request logging middleware for all API calls.
 * Logs method, path, and request ID on request; logs status code and duration on response.
 * Does not log request body or headers to avoid leaking secrets.
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "@/config/logger";

const API_BASE_PATH = "/api/v1";

export const requestLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Only log requests to the API (exclude /health, /api-docs, etc.)
  if (!req.path.startsWith(API_BASE_PATH)) {
    return next();
  }

  const requestId = req.requestId ?? "unknown";
  const method = req.method;
  const path = req.path;
  const start = Date.now();
  const tenantId = req.user?.tenantId;
  const userId = req.user?.id;

  logger.request("API request", requestId, { method, path, tenantId, userId });

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const statusCode = res.statusCode;
    logger.request("API response", requestId, {
      method,
      path,
      tenantId,
      userId,
      statusCode,
      latencyMs: durationMs,
    });
  });

  next();
};
