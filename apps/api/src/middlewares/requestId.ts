/**
 * Request ID middleware for request tracing and correlation.
 * Adds a unique request ID to each request for logging and debugging.
 */

import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * Extend Express Request type to include requestId
 */
declare global {
  // Express's own type augmentation point is a TS namespace; required to extend Request.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Middleware to add a unique request/correlation ID to each request.
 * Reads X-Correlation-ID from incoming request (e.g. from frontend), or generates one.
 * The ID is available in req.requestId and can be used for logging and tracing.
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const incoming = (
    typeof req.headers["x-correlation-id"] === "string"
      ? req.headers["x-correlation-id"]
      : Array.isArray(req.headers["x-correlation-id"])
        ? req.headers["x-correlation-id"][0]
        : undefined
  )?.trim();
  const requestId = incoming || randomUUID();
  req.requestId = requestId;

  res.setHeader("X-Request-ID", requestId);
  res.setHeader("X-Correlation-ID", requestId);

  next();
};
