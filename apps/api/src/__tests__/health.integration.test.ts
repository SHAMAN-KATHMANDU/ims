import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "@/config/express.config";

describe("Health endpoint", () => {
  it("GET /health returns a valid health response", async () => {
    const res = await request(app).get("/health");
    expect([200, 503]).toContain(res.status);

    if (res.status === 200) {
      expect(res.body.status).toBe("healthy");
      expect(res.body.database).toBe("connected");
    } else {
      expect(res.body.status).toBe("unhealthy");
      expect(res.body.database).toBe("disconnected");
    }

    expect(typeof res.body.timestamp).toBe("string");
  });
});
