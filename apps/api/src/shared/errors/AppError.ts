/**
 * Base application error with status code and optional error code.
 * Used by services to throw domain-specific errors that are translated to HTTP responses.
 * Optional details (e.g. insufficientStock) are included in the API response when set.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
