/**
 * Rate Limit by API Key
 *
 * Per-key sliding window via express-rate-limit. The `windowMs` is fixed at
 * 60 seconds; the per-key `max` is read from the loaded `req.apiKey.rateLimitPerMin`
 * so different tenants/keys can carry different ceilings without re-deploying.
 *
 * Must run AFTER publicApiKeyAuth (which loads `req.apiKey`).
 */

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";

const FALLBACK_PER_MIN = 120;

export const rateLimitByApiKey = rateLimit({
  windowMs: 60 * 1000,
  // Per-key limit: read from the loaded record. If apiKey is missing (which
  // shouldn't happen because publicApiKeyAuth runs first), fall back to a
  // conservative default rather than crashing.
  max: (req: Request) => req.apiKey?.rateLimitPerMin ?? FALLBACK_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  // Key by api-key id, not IP — the whole point is to limit per credential.
  // Fallback (no api key loaded) keys by IP, normalized via the lib helper
  // that masks IPv6 to a subnet — bare req.ip throws ERR_ERL_KEY_GEN_IPV6
  // under express-rate-limit's validator and lets IPv6 clients evade limits.
  keyGenerator: (req: Request) =>
    req.apiKey?.id ?? `ip:${ipKeyGenerator(req.ip ?? "unknown")}`,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: "Rate limit exceeded for this API key. Try again shortly.",
    });
  },
});

export default rateLimitByApiKey;
