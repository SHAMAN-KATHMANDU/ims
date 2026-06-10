import rateLimit from "express-rate-limit";

/**
 * Abuse guards for the unauthenticated storefront write endpoints, keyed on
 * client IP like publicReviewRateLimit.
 *
 * Guest checkout: 20 orders per IP per 15 minutes. A real shopper places a
 * handful of orders at most; this stops order-flooding scripts without
 * blocking a shared household/office IP that genuinely buys repeatedly.
 */
export const publicOrderRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res
      .status(429)
      .json({ message: "Too many orders from this address. Try again later." });
  },
});

/**
 * Cart pings fire on every (debounced) cart mutation while a guest shops, so
 * the ceiling is deliberately generous — it only exists to stop scripted
 * floods of the abandoned-cart table, not to throttle real browsing.
 */
export const publicCartPingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ message: "Too many requests. Try again later." });
  },
});
