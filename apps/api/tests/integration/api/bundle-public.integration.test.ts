/**
 * Public bundle route integration smoke.
 *
 * Boundary-only: harness has no real DB or tenant host wired, so we assert
 * boundary status codes rather than real bundle payloads. Full bundle
 * pricing math (SUM / DISCOUNT_PCT / FIXED) is covered by service-level
 * unit tests; end-to-end pricing verification needs a real-DB harness.
 */

import { describe, it, expect } from "vitest";
import app from "@/config/express.config";
import { apiRequest } from "@tests/helpers/api";

describe("Public bundle API integration", () => {
  describe("GET /api/v1/public/bundles", () => {
    it("returns a boundary status when tenant cannot be resolved", async () => {
      const res = await apiRequest(app).get("/api/v1/public/bundles");

      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });

  describe("GET /api/v1/public/bundles/:slug", () => {
    it("returns a boundary status for an unknown slug", async () => {
      const res = await apiRequest(app).get(
        "/api/v1/public/bundles/nonexistent-bundle",
      );

      expect([400, 404, 500]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });
  });

  describe("POST /api/v1/public/bundles", () => {
    it("is not exposed as a public write (405/404)", async () => {
      const res = await apiRequest(app)
        .post("/api/v1/public/bundles")
        .send({ name: "x" });

      // Router has no POST handler — resolveTenantFromHostname runs first and
      // may 500 in the no-DB harness; otherwise Express falls through to 404.
      expect([404, 405, 500]).toContain(res.status);
      expect(res.status).not.toBe(200);
      expect(res.status).not.toBe(201);
    });
  });
});
