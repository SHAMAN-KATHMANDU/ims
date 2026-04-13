/**
 * Require Internal Token Middleware
 *
 * Guards /internal/* endpoints with a shared-secret token. These endpoints
 * are called server-to-server by Caddy's on_demand_tls `ask` hook and by the
 * tenant-site Next.js renderer — never by a browser, never with a JWT.
 *
 * Accepts the token via either:
 *   - Header `X-Internal-Token: <secret>` (preferred, used by tenant-site)
 *   - Query param `?_t=<secret>` (fallback for Caddy's ask hook — the
 *     Caddyfile `ask` directive can't inject headers)
 *
 * Uses constant-time comparison to avoid leaking token length via timing.
 */

import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/config/env";

const HEADER = "x-internal-token";
const QUERY_PARAM = "_t";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return timingSafeEqual(aBuf, bBuf);
}

function extractToken(req: Request): string | null {
  const headerRaw = req.headers[HEADER];
  const header = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
  if (typeof header === "string" && header.length > 0) return header;

  const queryRaw = req.query[QUERY_PARAM];
  const query = Array.isArray(queryRaw) ? queryRaw[0] : queryRaw;
  if (typeof query === "string" && query.length > 0) return query;

  return null;
}

export function requireInternalToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void {
  const expected = env.internalApiToken;

  // Fail-closed: if no token is configured, refuse every request rather than
  // accidentally allowing unauthenticated access to internal endpoints.
  if (!expected) {
    return res.status(503).json({
      error: "internal_token_not_configured",
      message: "Internal API token is not configured on the server.",
    });
  }

  const provided = extractToken(req);

  if (!provided) {
    return res
      .status(401)
      .json({ error: "missing_internal_token", message: "Unauthorized" });
  }

  if (!constantTimeEqual(provided, expected)) {
    return res
      .status(401)
      .json({ error: "invalid_internal_token", message: "Unauthorized" });
  }

  return next();
}

export default requireInternalToken;
