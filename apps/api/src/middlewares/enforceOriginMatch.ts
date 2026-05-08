/**
 * Enforce Origin Match Middleware
 *
 * Requires the request's `Origin` header host to match the bound
 * `req.apiKey.tenantDomain.hostname`. The tenant has already proven domain
 * ownership via DNS TXT verification; pinning Origin to that domain limits
 * the blast radius of a leaked key — even if a key is exfiltrated, browser
 * requests from any other origin will be rejected.
 *
 * Must run AFTER publicApiKeyAuth.
 *
 * Also sets the `Access-Control-Allow-Origin` header on the response so the
 * browser accepts the cross-origin response. Origin is reflected ONLY when
 * it matches; we never echo `*` and never reflect an arbitrary origin.
 */

import { Request, Response, NextFunction } from "express";

function originHost(origin: string | undefined): string | null {
  if (!origin || typeof origin !== "string") return null;
  try {
    const url = new URL(origin);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function enforceOriginMatch(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const apiKey = req.apiKey;
  if (!apiKey) {
    // publicApiKeyAuth must have run first.
    return res
      .status(500)
      .json({ success: false, message: "Auth context missing" });
  }

  const allowedHost = apiKey.tenantDomain.hostname.toLowerCase();
  const reqOrigin = req.headers.origin;
  const reqHost = originHost(
    typeof reqOrigin === "string" ? reqOrigin : undefined,
  );

  if (!reqHost || reqHost !== allowedHost) {
    return res.status(403).json({
      success: false,
      message: "Request origin does not match the API key's bound domain",
    });
  }

  // CORS: reflect the matched origin so the browser accepts the response.
  res.setHeader("Access-Control-Allow-Origin", reqOrigin as string);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "false");

  return next();
}
