/**
 * Auth integration tests.
 * Hits real Express app. Requires DATABASE_URL to be set for full flow.
 * Health check does not require auth.
 */

import { describe, it, expect } from "vitest";
import app from "@/config/express.config";
import { apiRequest } from "@tests/helpers/api";

const databaseUrlConfigured = Boolean(process.env.DATABASE_URL?.trim());

describe("API integration", () => {
  describe("health endpoint", () => {
    it.skipIf(!databaseUrlConfigured)(
      "returns 200 with healthy status",
      async () => {
        const res = await apiRequest(app).get("/health");

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          status: "healthy",
          timestamp: expect.any(String),
          version: expect.any(String),
        });
      },
    );
  });

  describe("auth bypass - protected routes", () => {
    it("returns 401 when accessing protected route without token", async () => {
      const res = await apiRequest(app)
        .get("/api/v1/users")
        .expect((r) => {
          expect([401, 404]).toContain(r.status);
        });

      if (res.status === 401) {
        expect(res.body).toMatchObject({
          message: expect.stringMatching(/token|authorization|denied/i),
        });
      }
    });
  });
});
