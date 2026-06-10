import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

/**
 * Abuse guards for the unauthenticated storefront write endpoints, keyed on
 * client IP like publicReviewRateLimit. Config and handlers are exported so
 * tests can pin the contract without poking express-rate-limit internals.
 *
 * Guest checkout: 20 orders per IP per 15 minutes. A real shopper places a
 * handful of orders at most; this stops order-flooding scripts without
 * blocking a shared household/office IP that genuinely buys repeatedly.
 *
 * Cart pings fire on every (debounced) cart mutation while a guest shops, so
 * that ceiling is deliberately generous — it only exists to stop scripted
 * floods of the abandoned-cart table, not to throttle real browsing.
 */
export const STOREFRONT_RATE_LIMITS = {
  orders: { windowMs: 15 * 60 * 1000, max: 20 },
  cartPings: { windowMs: 15 * 60 * 1000, max: 300 },
} as const;

export function orderRateLimitHandler(
  _req: Request,
  res: Response,
  _next?: NextFunction,
): void {
  res
    .status(429)
    .json({ message: "Too many orders from this address. Try again later." });
}

export function cartPingRateLimitHandler(
  _req: Request,
  res: Response,
  _next?: NextFunction,
): void {
  res.status(429).json({ message: "Too many requests. Try again later." });
}

export const publicOrderRateLimit = rateLimit({
  windowMs: STOREFRONT_RATE_LIMITS.orders.windowMs,
  max: STOREFRONT_RATE_LIMITS.orders.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: orderRateLimitHandler,
});

export const publicCartPingRateLimit = rateLimit({
  windowMs: STOREFRONT_RATE_LIMITS.cartPings.windowMs,
  max: STOREFRONT_RATE_LIMITS.cartPings.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: cartPingRateLimitHandler,
});
