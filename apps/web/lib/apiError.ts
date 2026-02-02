/**
 * API Error Handler
 *
 * Shared error handling utility for all services.
 * All services must use handleApiError for API errors; do not implement custom axios error handling in services.
 * Converts axios errors to user-friendly error messages.
 */

import { AxiosError } from "axios";

interface ApiErrorResponse {
  message?: string;
}

/**
 * Handle API errors and convert to user-friendly messages
 */
export function handleApiError(error: unknown, context: string): never {
  // Handle axios errors
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    // Network error
    if (error.code === "ERR_NETWORK") {
      throw new Error(
        "Cannot connect to server. Please check your network connection.",
      );
    }

    // HTTP status code errors
    switch (status) {
      case 400:
        throw new Error(message || `Invalid data provided for ${context}`);
      case 401:
        throw new Error(`Unauthorized: Please log in to ${context}`);
      case 403:
        throw new Error(`Forbidden: You don't have permission to ${context}`);
      case 404:
        throw new Error(`${context} not found`);
      case 409:
        throw new Error(message || `Conflict while trying to ${context}`);
      default:
        if (status && status >= 500) {
          throw new Error("Server error: Please try again later");
        }
        throw new Error(message || `Failed to ${context}`);
    }
  }

  // Re-throw if already an Error
  if (error instanceof Error) {
    throw error;
  }

  // Unknown error
  throw new Error(`An unexpected error occurred while trying to ${context}`);
}

/**
 * Type guard for axios errors
 */
function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (
    typeof error === "object" &&
    error !== null &&
    "isAxiosError" in error &&
    (error as AxiosError).isAxiosError === true
  );
}
