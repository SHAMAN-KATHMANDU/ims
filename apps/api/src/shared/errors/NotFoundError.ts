import { AppError } from "./AppError";

/**
 * Resource not found error (404).
 * Use when a requested entity does not exist.
 */
export class NotFoundError extends AppError {
  constructor(
    message: string = "The requested resource was not found.",
    code?: string,
  ) {
    super(message, 404, code);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
