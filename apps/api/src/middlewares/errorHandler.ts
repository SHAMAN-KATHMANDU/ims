/**
 * Global error handler middleware.
 * Standardizes error responses to ApiResponse format and prevents internal error details from leaking in production.
 */

import { Request, Response, NextFunction } from "express";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { Sentry } from "@/config/sentry";
import { AppError, mapPrismaError } from "@/shared/errors";

export type { AppError };

/**
 * Standardized error response format (ApiResponse)
 */
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
  stack?: string;
}

/**
 * Global error handler middleware.
 * Must be added after all routes.
 * Uses mapPrismaError for Prisma errors; otherwise uses AppError or generic 500.
 */
export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const requestId = (req as any).requestId || "unknown";

  // Check for Prisma errors first
  const prismaMapped = mapPrismaError(err);
  const statusCode = prismaMapped
    ? prismaMapped.statusCode
    : (err as AppError).statusCode || 500;
  const errorMessage = prismaMapped
    ? prismaMapped.message
    : statusCode === 500 && !env.isDev
      ? "Something went wrong. Please try again."
      : err.message;

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

  const errorResponse: ErrorResponse = {
    success: false,
    error: errorMessage,
  };
  if ((err as AppError).code) {
    errorResponse.code = (err as AppError).code;
  }
  if ((err as AppError).details !== undefined) {
    errorResponse.details = (err as AppError).details;
  }
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
  return new AppError(message, statusCode, code);
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
