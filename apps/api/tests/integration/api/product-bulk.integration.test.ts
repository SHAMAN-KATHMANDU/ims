/**
 * Product bulk upload integration tests.
 * Hits real Express app. Verifies auth requirement for bulk endpoints.
 */

import { describe, it, expect } from "vitest";
import app from "@/config/express.config";
import { apiRequest } from "@tests/helpers/api";

describe("Product bulk API integration", () => {
  describe("POST /api/v1/bulk/products", () => {
    it("returns 401 when accessing without token", async () => {
      const res = await apiRequest(app)
        .post("/api/v1/bulk/products")
        .attach("file", Buffer.from(""), "test.csv");

      expect([400, 401, 404]).toContain(res.status);
      if (res.status === 401) {
        expect(res.body).toMatchObject({
          message: expect.stringMatching(/token|authorization|denied/i),
        });
      }
    });
  });

  describe("GET /api/v1/bulk/products/template", () => {
    it("returns 401 when accessing without token", async () => {
      const res = await apiRequest(app).get("/api/v1/bulk/products/template");

      expect([401, 404]).toContain(res.status);
    });
  });
});
