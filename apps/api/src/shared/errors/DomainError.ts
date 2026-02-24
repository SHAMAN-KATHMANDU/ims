import { AppError } from "./AppError";

/**
 * Domain validation error for 400/404 responses.
 * Use for business rule violations, invalid input, or resource not found.
 */
export class DomainError extends AppError {
  constructor(statusCode: 400 | 404 = 400, message: string, code?: string) {
    super(message, statusCode, code);
    this.name = "DomainError";
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}
