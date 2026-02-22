/**
 * Structured logger for request/runtime logging.
 * In dev: logs all levels to console with structured format
 * In staging/prod: only logs errors and warnings
 * Do not use for startup failures (use console.error there).
 */

import { env } from "@/config/env";

function parseArgs(
  requestIdOrData?: string | unknown,
  maybeData?: unknown,
): {
  requestId?: string;
  data?: unknown;
} {
  if (typeof requestIdOrData === "string") {
    return { requestId: requestIdOrData, data: maybeData };
  }
  return { requestId: undefined, data: requestIdOrData };
}

function emit(
  level: string,
  message: string,
  requestId?: string,
  data?: unknown,
) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    env: env.nodeEnv,
    requestId,
    message,
    data,
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  /**
   * Log info messages (dev only)
   */
  log: (
    message: string,
    requestIdOrData?: string | unknown,
    data?: unknown,
  ) => {
    if (env.isDev) {
      const parsed = parseArgs(requestIdOrData, data);
      emit("info", message, parsed.requestId, parsed.data);
    }
  },

  /**
   * Log warning messages (dev and staging/prod)
   */
  warn: (
    message: string,
    requestIdOrData?: string | unknown,
    data?: unknown,
  ) => {
    if (env.isDev || env.isStaging || env.isProd) {
      const parsed = parseArgs(requestIdOrData, data);
      emit("warn", message, parsed.requestId, parsed.data);
    }
  },

  /**
   * Log error messages (all environments)
   */
  error: (
    message: string,
    requestIdOrData?: string | unknown,
    data?: unknown,
  ) => {
    const parsed = parseArgs(requestIdOrData, data);
    emit("error", message, parsed.requestId, parsed.data);
  },

  /**
   * Log info with structured data (dev only)
   */
  info: (
    message: string,
    requestIdOrData?: string | unknown,
    data?: unknown,
  ) => {
    if (env.isDev) {
      const parsed = parseArgs(requestIdOrData, data);
      emit("info", message, parsed.requestId, parsed.data);
    }
  },

  /**
   * Log API request/response (all environments) for audit and debugging.
   * Use for request logging middleware only; do not log secrets.
   */
  request: (
    message: string,
    requestIdOrData?: string | unknown,
    data?: unknown,
  ) => {
    const parsed = parseArgs(requestIdOrData, data);
    emit("request", message, parsed.requestId, parsed.data);
  },
};
