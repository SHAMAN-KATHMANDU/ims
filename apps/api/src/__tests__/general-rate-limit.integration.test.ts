import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "@/config/express.config";

describe("General API rate limit", () => {
  it("returns 429 after 100 requests per minute", async () => {
    for (let i = 0; i < 101; i++) {
      const res = await request(app).get("/api/v1/auth/me");

      if (i < 100) {
        expect(res.status).not.toBe(429);
      } else {
        expect(res.status).toBe(429);
      }
    }
  });
});
