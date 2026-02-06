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
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Middleware to add a unique request ID to each request.
 * The request ID is available in req.requestId and can be used for logging.
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Generate a unique request ID
  const requestId = randomUUID();
  req.requestId = requestId;

  // Add request ID to response header for client correlation
  res.setHeader("X-Request-ID", requestId);

  next();
};
