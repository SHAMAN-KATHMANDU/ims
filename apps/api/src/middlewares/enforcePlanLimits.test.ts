import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { enforcePlanLimits, enforcePlanFeature } from "./enforcePlanLimits";

const mockNext = vi.fn();

vi.mock("@/config/prisma", () => ({
  default: { user: { count: vi.fn() }, product: { count: vi.fn() } },
  basePrisma: { planLimit: { findUnique: vi.fn() } },
}));

vi.mock("@repo/shared", () => ({
  DEFAULT_PLAN_LIMITS: {
    STARTER: {
      maxUsers: 3,
      maxProducts: 100,
      maxLocations: 1,
      maxMembers: 500,
      maxCustomers: 100,
      bulkUpload: false,
      analytics: false,
      promoManagement: false,
      auditLogs: false,
      apiAccess: false,
      salesPipeline: false,
    },
    PROFESSIONAL: {
      maxUsers: 10,
      maxProducts: 1000,
      maxLocations: 5,
      maxMembers: 2000,
      maxCustomers: 500,
      bulkUpload: true,
      analytics: true,
      promoManagement: true,
      auditLogs: false,
      apiAccess: false,
      salesPipeline: true,
    },
  },
}));

import prisma from "@/config/prisma";
import { basePrisma } from "@/config/prisma";

describe("enforcePlanLimits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockRes(): Partial<Response> {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  }

  it("calls next when tenant is missing", async () => {
    const middleware = enforcePlanLimits("users");
    const req = { tenant: undefined, user: { role: "admin" } } as Request;
    const res = mockRes() as Response;

    await middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(basePrisma.planLimit.findUnique).not.toHaveBeenCalled();
  });

  it("calls next when user is platformAdmin", async () => {
    const middleware = enforcePlanLimits("users");
    const req = {
      tenant: { plan: "STARTER" },
      user: { role: "platformAdmin" },
    } as Request;
    const res = mockRes() as Response;

    await middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 when user count exceeds limit", async () => {
    vi.mocked(basePrisma.planLimit.findUnique).mockResolvedValue({
      maxUsers: 3,
      maxProducts: 100,
      maxLocations: 1,
      maxMembers: 500,
      maxCustomers: 100,
    } as never);
    vi.mocked(prisma.user.count).mockResolvedValue(3);

    const middleware = enforcePlanLimits("users");
    const req = {
      tenant: { plan: "STARTER" },
      user: { role: "admin" },
    } as Request;
    const res = mockRes() as Response;

    await middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "plan_limit_exceeded",
        message: expect.stringContaining("maximum of 3 users"),
        resource: "users",
        limit: 3,
        current: 3,
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("calls next when under limit", async () => {
    vi.mocked(basePrisma.planLimit.findUnique).mockResolvedValue({
      maxUsers: 3,
      maxProducts: 100,
      maxLocations: 1,
      maxMembers: 500,
      maxCustomers: 100,
    } as never);
    vi.mocked(prisma.user.count).mockResolvedValue(2);

    const middleware = enforcePlanLimits("users");
    const req = {
      tenant: { plan: "STARTER" },
      user: { role: "admin" },
    } as Request;
    const res = mockRes() as Response;

    await middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("enforcePlanFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockRes(): Partial<Response> {
    return {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  }

  it("calls next when tenant is missing", async () => {
    const middleware = enforcePlanFeature("analytics");
    const req = { tenant: undefined, user: { role: "admin" } } as Request;
    const res = mockRes() as Response;

    await middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("calls next when user is platformAdmin", async () => {
    const middleware = enforcePlanFeature("analytics");
    const req = {
      tenant: { plan: "STARTER" },
      user: { role: "platformAdmin" },
    } as Request;
    const res = mockRes() as Response;

    await middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 when feature is disabled for plan", async () => {
    vi.mocked(basePrisma.planLimit.findUnique).mockResolvedValue({
      maxUsers: 3,
      maxProducts: 100,
      maxLocations: 1,
      maxMembers: 500,
      maxCustomers: 100,
      bulkUpload: false,
      analytics: false,
      promoManagement: false,
      auditLogs: false,
      apiAccess: false,
      salesPipeline: false,
    } as never);

    const middleware = enforcePlanFeature("analytics");
    const req = {
      tenant: { plan: "STARTER" },
      user: { role: "admin" },
    } as Request;
    const res = mockRes() as Response;

    await middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "feature_not_available",
        message: expect.stringContaining("Advanced analytics"),
        feature: "analytics",
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("calls next when feature is enabled for plan", async () => {
    vi.mocked(basePrisma.planLimit.findUnique).mockResolvedValue({
      maxUsers: 10,
      maxProducts: 1000,
      maxLocations: 5,
      maxMembers: 2000,
      maxCustomers: 500,
      bulkUpload: true,
      analytics: true,
      promoManagement: true,
      auditLogs: false,
      apiAccess: false,
      salesPipeline: true,
    } as never);

    const middleware = enforcePlanFeature("analytics");
    const req = {
      tenant: { plan: "PROFESSIONAL" },
      user: { role: "admin" },
    } as Request;
    const res = mockRes() as Response;

    await middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
