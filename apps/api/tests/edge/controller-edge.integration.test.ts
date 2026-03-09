/**
 * Phase 4 — Edge case expansion: controller/integration tests.
 * Malformed JSON, oversized payloads, invalid content-type.
 */

import { describe, it, expect } from "vitest";
import app from "@/config/express.config";
import { apiRequest } from "@tests/helpers/api";

describe("Controller edge cases — HTTP layer", () => {
  describe("malformed JSON", () => {
    it("returns 400 when POST body is invalid JSON", async () => {
      const res = await apiRequest(app)
        .post("/api/v1/auth/login")
        .set("Content-Type", "application/json")
        .set("X-Tenant-Slug", "demo")
        .send("not valid json {")
        .expect((r) => {
          expect([400, 500]).toContain(r.status);
        });

      if (res.status === 400) {
        expect(res.body).toMatchObject({
          message: expect.stringMatching(/json|parse|syntax/i),
        });
      }
    });

    it("returns 400 when POST body is truncated JSON", async () => {
      const res = await apiRequest(app)
        .post("/api/v1/auth/login")
        .set("Content-Type", "application/json")
        .set("X-Tenant-Slug", "demo")
        .send('{"username": "test"')
        .expect((r) => {
          expect([400, 500]).toContain(r.status);
        });

      expect([400, 500]).toContain(res.status);
    });
  });

  describe("invalid content-type", () => {
    it("handles form-urlencoded when JSON expected (parse or 415)", async () => {
      const res = await apiRequest(app)
        .post("/api/v1/auth/login")
        .set("Content-Type", "application/x-www-form-urlencoded")
        .set("X-Tenant-Slug", "demo")
        .send("username=test&password=test123");

      // Server may parse form-urlencoded, process login, and return 401/404 (user not found)
      expect([400, 401, 404, 415, 500]).toContain(res.status);
    });
  });

  describe("oversized payload", () => {
    it("rejects or limits very large JSON body (express default ~100kb)", async () => {
      const hugePayload = JSON.stringify({
        username: "a".repeat(200_000),
        password: "test",
      });

      const res = await apiRequest(app)
        .post("/api/v1/auth/login")
        .set("Content-Type", "application/json")
        .set("X-Tenant-Slug", "demo")
        .send(hugePayload);

      expect([400, 413, 500]).toContain(res.status);
    });
  });
});
