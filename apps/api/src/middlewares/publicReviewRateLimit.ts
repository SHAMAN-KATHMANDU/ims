import rateLimit from "express-rate-limit";

/**
 * Abuse guard for anonymous review submissions. Keyed on the client IP
 * (the default); 5 posts per IP per 15 minutes is tight enough to stop
 * drive-by rating brigades without blocking a household that shares an
 * IP and wants to review multiple products in one session.
 */
export const publicReviewRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res
      .status(429)
      .json({ message: "Too many review submissions. Try again later." });
  },
});
