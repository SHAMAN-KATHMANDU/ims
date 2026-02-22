import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "@/config/express.config";

describe("Auth rate limit", () => {
  it("POST /api/v1/auth/login returns 429 after limit", async () => {
    for (let i = 0; i < 6; i++) {
      const res = await request(app).post("/api/v1/auth/login").send({});
      if (i < 5) {
        expect(res.status).not.toBe(429);
      } else {
        expect(res.status).toBe(429);
      }
    }
  });
});
