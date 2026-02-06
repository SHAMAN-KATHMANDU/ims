/**
 * Structured logger for request/runtime logging.
 * In dev: logs all levels to console with structured format
 * In staging/prod: only logs errors and warnings
 * Do not use for startup failures (use console.error there).
 */

import { env } from "@/config/env";

function noop(_?: unknown) {}

/**
 * Format log message with timestamp and optional request ID
 */
function formatMessage(
  level: string,
  message: string,
  requestId?: string,
  data?: any,
): string {
  const timestamp = new Date().toISOString();
  const reqId = requestId ? `[${requestId}]` : "";
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  return `[${timestamp}] [${level}]${reqId} ${message}${dataStr}`;
}

export const logger = {
  /**
   * Log info messages (dev only)
   */
  log: (message: string, requestId?: string, data?: any) => {
    if (env.isDev) {
      console.log(formatMessage("INFO", message, requestId, data));
    }
  },

  /**
   * Log warning messages (dev and staging/prod)
   */
  warn: (message: string, requestId?: string, data?: any) => {
    if (env.isDev || env.isStaging || env.isProd) {
      console.warn(formatMessage("WARN", message, requestId, data));
    }
  },

  /**
   * Log error messages (all environments)
   */
  error: (message: string, requestId?: string, data?: any) => {
    console.error(formatMessage("ERROR", message, requestId, data));
  },

  /**
   * Log info with structured data (dev only)
   */
  info: (message: string, requestId?: string, data?: any) => {
    if (env.isDev) {
      console.log(formatMessage("INFO", message, requestId, data));
    }
  },

  /**
   * Log API request/response (all environments) for audit and debugging.
   * Use for request logging middleware only; do not log secrets.
   */
  request: (message: string, requestId?: string, data?: any) => {
    console.log(formatMessage("REQUEST", message, requestId, data));
  },
};
