/**
 * Read-only Guard Middleware
 *
 * Rejects anything that isn't GET/HEAD/OPTIONS with HTTP 405. Used at the
 * top of /public/v1/* — the public Data API is intentionally read-only.
 * OPTIONS is allowed so the CORS preflight can succeed; the actual response
 * headers are produced by enforceOriginMatch.
 */

import { Request, Response, NextFunction } from "express";

const ALLOWED = new Set(["GET", "HEAD", "OPTIONS"]);

export function readOnlyGuard(req: Request, res: Response, next: NextFunction) {
  if (!ALLOWED.has(req.method)) {
    res.setHeader("Allow", "GET, HEAD, OPTIONS");
    return res.status(405).json({
      success: false,
      message:
        "The Public Data API is read-only — only GET requests are allowed.",
    });
  }
  return next();
}

export default readOnlyGuard;
