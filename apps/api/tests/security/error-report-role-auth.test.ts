/**
 * Security tests: Error report role authorization.
 * Verifies that GET and PATCH /error-reports require platformAdmin;
 * superAdmin and other roles receive 403.
 */

import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";

function makeReq(role: string): Partial<Request> {
  return {
    user: {
      id: "u1",
      tenantId: "t1",
      role,
      tenantSlug: "acme",
    },
  };
}

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("Error report role authorization", () => {
  it("authorizeRoles(platformAdmin) rejects superAdmin for list/update", () => {
    const middleware = authorizeRoles("platformAdmin");
    const req = makeReq("superAdmin") as Request;
    const res = mockRes() as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Unauthorized",
        required: ["platformAdmin"],
        current: "superAdmin",
      }),
    );
  });

  it("authorizeRoles(platformAdmin) rejects admin for list/update", () => {
    const middleware = authorizeRoles("platformAdmin");
    const req = makeReq("admin") as Request;
    const res = mockRes() as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("authorizeRoles(platformAdmin) allows platformAdmin", () => {
    const middleware = authorizeRoles("platformAdmin");
    const req = makeReq("platformAdmin") as Request;
    const res = mockRes() as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("authorizeRoles for create allows user, admin, superAdmin, platformAdmin", () => {
    const middleware = authorizeRoles("user", "admin", "superAdmin", "platformAdmin");
    const roles = ["user", "admin", "superAdmin", "platformAdmin"];

    for (const role of roles) {
      const req = makeReq(role) as Request;
      const res = mockRes() as Response;
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    }
  });
});
