/**
 * Structured logger using pino.
 * Dev: pretty-printed human-readable output
 * Staging/prod: JSON for log aggregation (ELK, Loki, etc.)
 *
 * Do not use for startup failures (use console.error there).
 */

import pino from "pino";
import { env } from "@/config/env";

const redactPaths = [
  "password",
  "token",
  "authorization",
  "jwt",
  "secret",
  "*.password",
  "*.token",
  "*.authorization",
  "*.jwt",
  "*.secret",
];

const pinoBase = pino({
  level: env.isDev ? "debug" : "info",
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(env.isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

function bindContext(
  requestId?: string,
  data?: unknown,
): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};
  if (requestId) ctx.requestId = requestId;
  if (data !== undefined) {
    if (data && typeof data === "object" && !Array.isArray(data)) {
      Object.assign(ctx, data);
    } else {
      ctx.data = data;
    }
  }
  return ctx;
}

export const logger = {
  /**
   * Log info messages (dev only in non-request context)
   */
  log: (message: string, requestId?: string, data?: unknown) => {
    if (env.isDev) {
      pinoBase.info(bindContext(requestId, data), message);
    }
  },

  /**
   * Log warning messages (all environments)
   */
  warn: (message: string, requestId?: string, data?: unknown) => {
    pinoBase.warn(bindContext(requestId, data), message);
  },

  /**
   * Log error messages (all environments)
   */
  error: (message: string, requestId?: string, data?: unknown) => {
    pinoBase.error(bindContext(requestId, data), message);
  },

  /**
   * Log info with structured data (dev only)
   */
  info: (message: string, requestId?: string, data?: unknown) => {
    if (env.isDev) {
      pinoBase.info(bindContext(requestId, data), message);
    }
  },

  /**
   * Log API request/response (all environments) for audit and debugging.
   * Use for request logging middleware only; do not log secrets.
   */
  request: (message: string, requestId?: string, data?: unknown) => {
    pinoBase.info(bindContext(requestId, data), message);
  },
};
