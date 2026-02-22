/**
 * Global error handler middleware.
 * Standardizes error responses and prevents internal error details from leaking in production.
 */

import { Request, Response, NextFunction } from "express";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { Sentry } from "@/config/sentry";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Standardized error response format
 */
interface ErrorResponse {
  message: string;
  code?: string;
  statusCode: number;
  // Only include stack trace in development
  stack?: string;
}

/**
 * Global error handler middleware.
 * Must be added after all routes.
 */
export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Get request ID if available (from requestId middleware)
  const requestId = (req as any).requestId || "unknown";

  // Determine status code
  const statusCode = (err as AppError).statusCode || 500;

  // Log error with context
  logger.error("Request error", requestId, {
    message: err.message,
    statusCode,
    code: (err as AppError).code,
    path: req.path,
    method: req.method,
    stack: env.isDev ? err.stack : undefined,
  });

  if (env.sentryDsn) {
    Sentry.captureException(err, {
      tags: {
        requestId,
        path: req.path,
        method: req.method,
      },
      user: req.user ? { id: req.user.id } : undefined,
      extra: {
        statusCode,
      },
    });
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    message:
      statusCode === 500 && !env.isDev
        ? "Something went wrong. Please try again."
        : err.message,
    statusCode,
  };

  // Include error code if present
  if ((err as AppError).code) {
    errorResponse.code = (err as AppError).code;
  }

  // Include stack trace only in development
  if (env.isDev && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Create an AppError with status code and optional code
 */
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string,
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
