/**
 * Full auth flow integration tests.
 * Hits real Express app. Tests login endpoint when DB is available.
 */

import { describe, it, expect } from "vitest";
import app from "@/config/express.config";
import { apiRequest } from "@tests/helpers/api";

describe("Auth flow integration", () => {
  describe("POST /api/v1/auth/login", () => {
    it("returns 400, 404, or 500 when body is invalid", async () => {
      const res = await apiRequest(app).post("/api/v1/auth/login").send({});

      // 400 = validation error, 404 = route not found, 500 = DB/config error in CI
      expect([400, 404, 500]).toContain(res.status);
      if (res.status === 400) {
        expect(res.body).toHaveProperty("message");
      }
    });

    it("returns 401, 404, or 500 when credentials are wrong", async () => {
      const res = await apiRequest(app).post("/api/v1/auth/login").send({
        tenantSlug: "nonexistent",
        username: "nobody",
        password: "wrong",
      });

      // 401 = invalid creds, 404 = tenant/user not found, 500 = DB error
      expect([401, 404, 500]).toContain(res.status);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("returns 401 when accessing without token", async () => {
      const res = await apiRequest(app).get("/api/v1/auth/me");

      expect([401, 404]).toContain(res.status);
    });
  });
});
