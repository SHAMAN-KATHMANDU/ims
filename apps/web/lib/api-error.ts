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
 * User-friendly messages for every error type (single source of truth).
 */
const MESSAGES = {
  network:
    "We couldn't reach the server. Check your internet connection and try again.",
  timeout: "The request took too long. Please try again.",
  sessionExpired: "Your session has expired. Please sign in again.",
  forbidden: "You don't have permission to do this.",
  validation: "Please check your input and try again.",
  notFound: "The requested item was not found.",
  conflict:
    "This action conflicts with existing data. Please refresh and try again.",
  fileTooLarge: "The file is too large. Please choose a smaller file.",
  rateLimit: "Too many requests. Please wait a moment and try again.",
  server: "Something went wrong on our end. Please try again in a few minutes.",
  serverUnavailable:
    "The service is temporarily unavailable. Please try again in a few minutes.",
  unknown: "Something went wrong. Please try again.",
} as const;

/**
 * Get a user-friendly message from any API error (Axios, timeout, network, status codes).
 * Use for toasts and for throwing a consistent Error in handleApiError.
 */
export function getApiErrorMessage(error: unknown, context?: string): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const backendMessage =
      typeof error.response?.data?.message === "string" &&
      error.response.data.message.trim() !== ""
        ? error.response.data.message.trim()
        : null;

    if (error.code === "ERR_NETWORK") {
      return MESSAGES.network;
    }
    if (error.code === "ECONNABORTED") {
      return MESSAGES.timeout;
    }

    switch (status) {
      case 400:
        return backendMessage ?? MESSAGES.validation;
      case 401:
        return backendMessage ?? MESSAGES.sessionExpired;
      case 403:
        return backendMessage ?? MESSAGES.forbidden;
      case 404:
        return backendMessage ?? MESSAGES.notFound;
      case 408:
        return MESSAGES.timeout;
      case 409:
        return backendMessage ?? MESSAGES.conflict;
      case 413:
        return MESSAGES.fileTooLarge;
      case 429:
        return MESSAGES.rateLimit;
      case 500:
        return MESSAGES.server;
      case 502:
      case 503:
        return MESSAGES.serverUnavailable;
      default:
        if (status && status >= 500) {
          return MESSAGES.server;
        }
        return backendMessage ?? MESSAGES.unknown;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }
  return context ? `${MESSAGES.unknown} (${context})` : MESSAGES.unknown;
}

/**
 * Handle API errors and convert to user-friendly messages (rethrows).
 */
export function handleApiError(error: unknown, context: string): never {
  const message = getApiErrorMessage(error, context);
  throw new Error(message);
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
