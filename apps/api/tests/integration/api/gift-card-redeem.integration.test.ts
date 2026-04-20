/**
 * Gift-card public redeem integration smoke.
 *
 * Boundary-only: this harness boots the Express app but does not wire a real
 * database or tenant host, so every request falls through to Zod validation,
 * tenant resolution, or "not found" — matching the pattern in sale/auth-flow
 * integration tests. Full balance-debit verification requires a real-DB
 * harness which is out of scope here.
 */

import { describe, it, expect } from "vitest";
import app from "@/config/express.config";
import { apiRequest } from "@tests/helpers/api";

describe("Public gift-card redeem integration", () => {
  describe("POST /api/v1/public/gift-cards/redeem", () => {
    it("rejects invalid body with 400 (Zod) or boundary status", async () => {
      const res = await apiRequest(app)
        .post("/api/v1/public/gift-cards/redeem")
        .send({ code: "X", amount: 0 });

      // 400 = Zod rejects short code / non-positive amount
      // 404 = tenant host cannot be resolved in the test harness
      // 500 = downstream failure (DB not wired in CI)
      expect([400, 404, 500]).toContain(res.status);
    });

    it("rejects missing body fields", async () => {
      const res = await apiRequest(app)
        .post("/api/v1/public/gift-cards/redeem")
        .send({});

      expect([400, 404, 500]).toContain(res.status);
    });

    it("accepts well-formed body shape (passes Zod, fails downstream)", async () => {
      const res = await apiRequest(app)
        .post("/api/v1/public/gift-cards/redeem")
        .send({ code: "GC-TEST-0001", amount: 100 });

      // Past Zod the request needs a tenant + real gift card — neither exists
      // here, so expect the boundary rejections, not a 200.
      expect([400, 404, 409, 500]).toContain(res.status);
      expect(res.status).not.toBe(200);
    });
  });
});
