/**
 * Security tests: rate limiting on POST /api/v1/auth/me/password.
 *
 * The real auth router configures:
 *   rateLimit({ windowMs: 15 * 60 * 1000, max: 5,
 *               keyGenerator: (req) => req.user?.id ?? req.ip,
 *               skip: (req) => !req.user })
 *
 * These tests replicate that configuration in a minimal Express app so we can
 * exercise the limiter in isolation without a DB connection.  Each test creates
 * a fresh app instance (and therefore a fresh in-memory rate-limit store).
 */

import { describe, it, expect } from "vitest";
import express from "express";
import type { Application } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import request from "supertest";

// ─── Minimal test app factory ─────────────────────────────────────────────────

const TEST_JWT_SECRET = "rate-limit-test-secret";

function makeToken(userId: string): string {
  return jwt.sign(
    {
      id: userId,
      tenantId: "tenant-rate-test",
      role: "user",
      username: userId,
      tenantSlug: "rate-test",
    },
    TEST_JWT_SECRET,
    { expiresIn: "1h" },
  );
}

/**
 * Creates a fresh Express application each call.
 * The rate limiter is new per call → fresh in-memory store → no cross-test bleed.
 */
function createApp(): Application {
  const app = express();
  app.use(express.json());

  // Minimal verifyToken — only JWT signature check, no DB
  app.use((req: any, _res: any, next: any) => {
    const authHeader = req.headers.authorization as string | undefined;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;
    if (token) {
      try {
        const decoded = jwt.verify(token, TEST_JWT_SECRET) as any;
        req.user = decoded;
      } catch {
        // invalid token → req.user stays undefined
      }
    }
    next();
  });

  // Replica of the real changePasswordLimiter from apps/api/src/modules/auth/auth.router.ts
  // validate.keyGeneratorIpFallback=false suppresses the express-rate-limit IPv6 warning
  // that fires when supertest uses ::1 as the fallback IP key.
  const changePasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    keyGenerator: (req: any) => req.user?.id ?? req.ip ?? "unknown",
    standardHeaders: false,
    skip: (req: any) => !req.user,
    validate: { keyGeneratorIpFallback: false },
  });

  // Stub handler — always returns 400 (simulates Zod validation failure without DB)
  app.post(
    "/api/v1/auth/me/password",
    changePasswordLimiter,
    (_req: any, res: any) => {
      res.status(400).json({ message: "Validation error (stub)" });
    },
  );

  return app;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Rate limiting: POST /api/v1/auth/me/password", () => {
  it("first 5 requests are allowed (non-429), 6th returns 429", async () => {
    const app = createApp();
    const token = makeToken("alice-rate-test-001");

    // Attempts 1–5: rate limiter allows through; stub returns 400
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post("/api/v1/auth/me/password")
        .set("Authorization", `Bearer ${token}`)
        .send({ currentPassword: "old", newPassword: "new" });

      expect(res.status, `attempt ${i} should NOT be 429`).not.toBe(429);
    }

    // Attempt 6: rate limiter kicks in → 429
    const res6 = await request(app)
      .post("/api/v1/auth/me/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "old", newPassword: "new" });

    expect(res6.status).toBe(429);
  });

  it("unauthenticated requests are never rate-limited (limiter skip: !req.user)", async () => {
    const app = createApp();

    // 10 requests without a token — all should bypass the limiter
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post("/api/v1/auth/me/password")
        .send({ currentPassword: "old", newPassword: "new" });

      // No auth → no req.user → rate limiter is skipped → stub 400, not 429
      expect(res.status).not.toBe(429);
    }
  });

  it("rate limit is per user ID, not shared across different users", async () => {
    const app = createApp();
    const tokenAlice = makeToken("alice-per-user-001");
    const tokenBob = makeToken("bob-per-user-001");

    // Alice makes 5 requests (reaches her limit)
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/v1/auth/me/password")
        .set("Authorization", `Bearer ${tokenAlice}`)
        .send({ currentPassword: "old", newPassword: "new" });
      expect(res.status).not.toBe(429);
    }

    // Bob's first request should NOT be rate-limited (independent counter)
    const bobFirst = await request(app)
      .post("/api/v1/auth/me/password")
      .set("Authorization", `Bearer ${tokenBob}`)
      .send({ currentPassword: "old", newPassword: "new" });
    expect(bobFirst.status).not.toBe(429);

    // Alice's 6th request → 429
    const alice6 = await request(app)
      .post("/api/v1/auth/me/password")
      .set("Authorization", `Bearer ${tokenAlice}`)
      .send({ currentPassword: "old", newPassword: "new" });
    expect(alice6.status).toBe(429);
  });

  it("invalid JWT token results in no req.user → rate limiter skips", async () => {
    const app = createApp();

    // Even 10 requests with a malformed token bypass the limiter
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post("/api/v1/auth/me/password")
        .set("Authorization", "Bearer not.a.valid.token")
        .send({ currentPassword: "old", newPassword: "new" });

      // invalid token → req.user is undefined → skip fires → no 429
      expect(res.status).not.toBe(429);
    }
  });
});
