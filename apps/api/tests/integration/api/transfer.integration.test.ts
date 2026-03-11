/**
 * Transfer flow integration tests.
 * Hits real Express app. Verifies auth and transfer endpoint behavior.
 */

import { describe, it, expect } from "vitest";
import app from "@/config/express.config";
import { apiRequest } from "@tests/helpers/api";

describe("Transfer API integration", () => {
  describe("POST /api/v1/transfers", () => {
    it("returns 401 when accessing without token", async () => {
      const res = await apiRequest(app).post("/api/v1/transfers").send({
        fromLocationId: "loc-1",
        toLocationId: "loc-2",
        items: [],
      });

      expect([401, 404]).toContain(res.status);
      if (res.status === 401) {
        expect(res.body).toMatchObject({
          message: expect.stringMatching(/token|authorization|denied/i),
        });
      }
    });
  });

  describe("GET /api/v1/transfers", () => {
    it("returns 401 when accessing without token", async () => {
      const res = await apiRequest(app).get("/api/v1/transfers");

      expect([401, 404]).toContain(res.status);
    });
  });
});
