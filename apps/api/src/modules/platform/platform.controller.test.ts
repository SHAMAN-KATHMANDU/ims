import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./platform.service", () => ({
  default: {
    createTenant: vi.fn(),
    findAllTenants: vi.fn(),
    findTenantById: vi.fn(),
    createTenantUser: vi.fn(),
    resetTenantUserPassword: vi.fn(),
    updateTenant: vi.fn(),
    changePlan: vi.fn(),
    deactivateTenant: vi.fn(),
    activateTenant: vi.fn(),
    getStats: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

import platformController from "./platform.controller";
import * as platformServiceModule from "./platform.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = platformServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

describe("PlatformController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTenant", () => {
    it("returns 201 with tenant and adminUser on success", async () => {
      const tenant = { id: "t1", name: "Acme", slug: "acme" };
      const adminUser = { id: "u1", username: "admin", role: "superAdmin" };
      mockService.createTenant.mockResolvedValue({ tenant, adminUser });

      const req = makeReq({
        body: {
          name: "Acme",
          slug: "acme",
          adminUsername: "admin",
          adminPassword: "secret123",
        },
      });
      const res = mockRes() as Response;

      await platformController.createTenant(req, res);

      expect(mockService.createTenant).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Acme",
          slug: "acme",
          adminUsername: "admin",
          adminPassword: "secret123",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Tenant created successfully",
        tenant,
        adminUser,
      });
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({
        body: { name: "Acme", slug: "acme" }, // missing adminUsername, adminPassword
      });
      const res = mockRes() as Response;

      await platformController.createTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.createTenant).not.toHaveBeenCalled();
    });

    it("returns 409 when slug already exists", async () => {
      mockService.createTenant.mockRejectedValue(
        Object.assign(new Error('Tenant with slug "acme" already exists'), {
          statusCode: 409,
        }),
      );
      const req = makeReq({
        body: {
          name: "Acme",
          slug: "acme",
          adminUsername: "admin",
          adminPassword: "secret123",
        },
      });
      const res = mockRes() as Response;

      await platformController.createTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.createTenant.mockRejectedValue(new Error("DB down"));
      const req = makeReq({
        body: {
          name: "Acme",
          slug: "acme",
          adminUsername: "admin",
          adminPassword: "secret123",
        },
      });
      const res = mockRes() as Response;

      await platformController.createTenant(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("listTenants", () => {
    it("returns 200 with tenants on success", async () => {
      const tenants = [{ id: "t1", name: "Acme", slug: "acme" }];
      mockService.findAllTenants.mockResolvedValue(tenants);

      const req = makeReq();
      const res = mockRes() as Response;

      await platformController.listTenants(req, res);

      expect(mockService.findAllTenants).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ tenants });
    });

    it("calls sendControllerError on error", async () => {
      mockService.findAllTenants.mockRejectedValue(new Error("DB error"));
      const req = makeReq();
      const res = mockRes() as Response;

      await platformController.listTenants(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getTenant", () => {
    it("returns 200 with tenant on success", async () => {
      const tenant = { id: "t1", name: "Acme", slug: "acme" };
      mockService.findTenantById.mockResolvedValue(tenant);

      const req = makeReq({ params: { id: "t1" } });
      const res = mockRes() as Response;

      await platformController.getTenant(req, res);

      expect(mockService.findTenantById).toHaveBeenCalledWith("t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ tenant });
    });

    it("returns 404 when tenant not found", async () => {
      mockService.findTenantById.mockResolvedValue(null);

      const req = makeReq({ params: { id: "t1" } });
      const res = mockRes() as Response;

      await platformController.getTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Tenant not found",
      });
    });
  });

  describe("createTenantUser", () => {
    it("returns 201 with user on success", async () => {
      const user = {
        id: "u1",
        username: "newuser",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockService.createTenantUser.mockResolvedValue(user);

      const req = makeReq({
        params: { tenantId: "t1" },
        body: { username: "newuser", password: "secret123", role: "user" },
      });
      const res = mockRes() as Response;

      await platformController.createTenantUser(req, res);

      expect(mockService.createTenantUser).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          username: "newuser",
          password: "secret123",
          role: "user",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "User created successfully",
        user,
      });
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({
        params: { tenantId: "t1" },
        body: { username: "newuser" }, // missing password, role
      });
      const res = mockRes() as Response;

      await platformController.createTenantUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.createTenantUser).not.toHaveBeenCalled();
    });

    it("returns 404 when tenant not found", async () => {
      mockService.createTenantUser.mockRejectedValue(
        Object.assign(new Error("Tenant not found"), { statusCode: 404 }),
      );
      const req = makeReq({
        params: { tenantId: "t1" },
        body: { username: "newuser", password: "secret123", role: "user" },
      });
      const res = mockRes() as Response;

      await platformController.createTenantUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 409 when username already exists", async () => {
      mockService.createTenantUser.mockRejectedValue(
        Object.assign(new Error("User with this username already exists"), {
          statusCode: 409,
        }),
      );
      const req = makeReq({
        params: { tenantId: "t1" },
        body: { username: "existing", password: "secret123", role: "user" },
      });
      const res = mockRes() as Response;

      await platformController.createTenantUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 403 when plan limit exceeded", async () => {
      mockService.createTenantUser.mockRejectedValue(
        Object.assign(
          new Error("Tenant has reached the user limit for their plan."),
          { statusCode: 403 },
        ),
      );
      const req = makeReq({
        params: { tenantId: "t1" },
        body: { username: "newuser", password: "secret123", role: "user" },
      });
      const res = mockRes() as Response;

      await platformController.createTenantUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.createTenantUser.mockRejectedValue(new Error("DB down"));
      const req = makeReq({
        params: { tenantId: "t1" },
        body: { username: "newuser", password: "secret123", role: "user" },
      });
      const res = mockRes() as Response;

      await platformController.createTenantUser(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("updateTenant", () => {
    it("returns 200 with updated tenant on success", async () => {
      const tenant = { id: "t1", name: "New Name", slug: "acme" };
      mockService.updateTenant.mockResolvedValue(tenant);

      const req = makeReq({
        params: { id: "t1" },
        body: { name: "New Name" },
      });
      const res = mockRes() as Response;

      await platformController.updateTenant(req, res);

      expect(mockService.updateTenant).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({ name: "New Name" }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ tenant });
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({
        params: { id: "t1" },
        body: { slug: "INVALID-SLUG" }, // uppercase invalid
      });
      const res = mockRes() as Response;

      await platformController.updateTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.updateTenant).not.toHaveBeenCalled();
    });

    it("returns 403 when setting isActive false on system tenant", async () => {
      mockService.updateTenant.mockRejectedValue(
        Object.assign(new Error("Cannot deactivate the system tenant."), {
          statusCode: 403,
        }),
      );

      const req = makeReq({
        params: { id: "sys-tenant-id" },
        body: { isActive: false },
      });
      const res = mockRes() as Response;

      await platformController.updateTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Cannot deactivate the system tenant.",
      });
    });
  });

  describe("deactivateTenant", () => {
    it("returns 200 with tenant on success", async () => {
      const tenant = { id: "t1", isActive: false };
      mockService.deactivateTenant.mockResolvedValue(tenant);

      const req = makeReq({ params: { id: "t1" } });
      const res = mockRes() as Response;

      await platformController.deactivateTenant(req, res);

      expect(mockService.deactivateTenant).toHaveBeenCalledWith("t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Tenant deactivated",
        tenant,
      });
    });

    it("returns 404 when tenant not found", async () => {
      mockService.deactivateTenant.mockRejectedValue(
        Object.assign(new Error("Tenant not found"), { statusCode: 404 }),
      );

      const req = makeReq({ params: { id: "t1" } });
      const res = mockRes() as Response;

      await platformController.deactivateTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 403 when deactivating system tenant", async () => {
      mockService.deactivateTenant.mockRejectedValue(
        Object.assign(new Error("Cannot deactivate the system tenant."), {
          statusCode: 403,
        }),
      );

      const req = makeReq({ params: { id: "sys-tenant-id" } });
      const res = mockRes() as Response;

      await platformController.deactivateTenant(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "Cannot deactivate the system tenant.",
      });
    });
  });

  describe("getStats", () => {
    it("returns 200 with stats on success", async () => {
      const stats = {
        totalTenants: 10,
        activeTenants: 8,
        trialTenants: 2,
        totalUsers: 50,
        totalSales: 1000,
        planDistribution: [],
      };
      mockService.getStats.mockResolvedValue(stats);

      const req = makeReq();
      const res = mockRes() as Response;

      await platformController.getStats(req, res);

      expect(mockService.getStats).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(stats);
    });
  });
});
