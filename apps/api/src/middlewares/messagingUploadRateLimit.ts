import rateLimit from "express-rate-limit";

/** Stricter limit for messaging media uploads (abuse prevention). */
export const messagingUploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ message: "Too many uploads. Try again shortly." });
  },
});
