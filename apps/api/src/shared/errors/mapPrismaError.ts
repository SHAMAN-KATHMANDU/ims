/**
 * Maps known Prisma error codes to user-friendly message and status.
 * Used by the global error handler to normalize Prisma errors without leaking details.
 */

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
    case "P2002":
      return {
        message: "A record with this value already exists.",
        statusCode: 409,
      };
    case "P2003":
      return {
        message: "Invalid reference.",
        statusCode: 400,
      };
    default:
      return null;
  }
}
