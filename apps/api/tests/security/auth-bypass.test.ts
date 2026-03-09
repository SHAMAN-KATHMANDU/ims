/**
 * Security tests: auth bypass.
 * Verifies that unauthenticated requests to protected routes return 401.
 * Paths align with router.config.ts — all routes below verifyToken require auth.
 */

import { describe, it, expect } from "vitest";
import app from "@/config/express.config";
import { apiRequest } from "@tests/helpers/api";

const PROTECTED_GET_PATHS = [
  "/api/v1/users",
  "/api/v1/products",
  "/api/v1/categories",
  "/api/v1/vendors",
  "/api/v1/locations",
  "/api/v1/inventory",
  "/api/v1/transfers",
  "/api/v1/members",
  "/api/v1/sales",
  "/api/v1/promos",
  "/api/v1/audit-logs",
  "/api/v1/error-reports",
  "/api/v1/dashboard/user-summary",
  "/api/v1/companies",
  "/api/v1/contacts",
  "/api/v1/leads",
  "/api/v1/deals",
  "/api/v1/tasks",
  "/api/v1/attribute-types",
  "/api/v1/crm/dashboard",
];

describe("Auth bypass security", () => {
  const protectedPaths = PROTECTED_GET_PATHS.map((path) => ({
    method: "get" as const,
    path,
  }));

  for (const { method, path } of protectedPaths) {
    it(`${method.toUpperCase()} ${path} returns 401 without token`, async () => {
      const res = await apiRequest(app)[method](path);

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        message: expect.any(String),
      });
      expect(res.body.message.toLowerCase()).toMatch(
        /token|authorization|denied|unauthorized/i,
      );
    });
  }

  it("returns 401 when token is invalid", async () => {
    const res = await apiRequest(app)
      .get("/api/v1/users")
      .set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/valid|invalid|denied/i);
  });

  it("returns 401 when Authorization header is malformed", async () => {
    const res = await apiRequest(app)
      .get("/api/v1/users")
      .set("Authorization", "Basic base64credentials");

    expect(res.status).toBe(401);
  });
});
