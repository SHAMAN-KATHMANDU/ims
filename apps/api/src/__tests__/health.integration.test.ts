import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "@/config/express.config";

describe("Health endpoint", () => {
  it("GET /health returns healthy response", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
  });
});
