/**
 * Shared controller error utilities.
 * Maps Prisma errors to user-friendly responses and sends standardized 500 responses
 * without leaking error details to the client.
 */

import { Request, Response } from "express";
import { logger } from "@/config/logger";

interface PrismaErrorLike {
  code?: string;
  meta?: { target?: string[] };
}

/**
 * Map known Prisma error codes to user-friendly message and status.
 * Returns null for unknown codes so callers can fall back to generic 500.
 */
export function mapPrismaError(
  error: unknown,
): { message: string; statusCode: number } | null {
  const prismaError = error as PrismaErrorLike;
  const code = prismaError?.code;

  switch (code) {
    case "P2025":
      return {
        message: "The requested resource was not found.",
        statusCode: 404,
      };
    case "P2002": {
      const fields = prismaError?.meta?.target;
      const fieldHint =
        Array.isArray(fields) && fields.length > 0
          ? ` (${fields.join(", ")})`
          : "";
      return {
        message: `A record with this value already exists${fieldHint}.`,
        statusCode: 409,
      };
    }
    case "P2003":
      return {
        message:
          "Invalid reference. One of the linked records (contact, member, deal, or assigned user) was not found or is not valid.",
        statusCode: 400,
      };
    default:
      return null;
  }
}

/**
 * Log the error (with requestId) and send a standardized JSON response.
 * Uses mapPrismaError for known Prisma codes; otherwise sends 500 with a generic message.
 * Never attaches error.message or stack to the response.
 */
export function sendControllerError(
  req: Request,
  res: Response,
  error: unknown,
  contextMessage: string,
): void {
  const requestId = (req as any).requestId;

  const mapped = mapPrismaError(error);
  if (mapped) {
    res.status(mapped.statusCode).json({ message: mapped.message });
    return;
  }

  logger.error(contextMessage, requestId, {
    error: error instanceof Error ? error.message : String(error),
  });
  res.status(500).json({
    message: "Something went wrong. Please try again.",
  });
}
