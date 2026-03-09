import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./auth.service", () => ({
  AuthService: vi.fn(),
  default: {
    login: vi.fn(),
    getMe: vi.fn(),
  },
}));

vi.mock("@/config/env", () => ({
  env: { isDev: false, jwtSecret: "test-secret" },
}));

vi.mock("@/config/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}));

const mockSendControllerError = vi.fn();
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: (...args: unknown[]) => mockSendControllerError(...args),
}));

import { createError } from "@/middlewares/errorHandler";
import authController from "./auth.controller";
import * as authServiceModule from "./auth.service";

const mockService = authServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("AuthController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logIn", () => {
    it("returns 500 when x-tenant-slug header is missing", async () => {
      const req = {
        body: { username: "user", password: "pass" },
        headers: {},
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.logIn(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "No tenant configured. Please contact support.",
      });
      expect(mockService.login).not.toHaveBeenCalled();
    });

    it("returns 400 when username and password are missing", async () => {
      const req = {
        body: {},
        headers: { "x-tenant-slug": "acme" },
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.logIn(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Username and password are required",
      });
      expect(mockService.login).not.toHaveBeenCalled();
    });

    it("returns 400 when username is empty string", async () => {
      const req = {
        body: { username: "   ", password: "pwd" },
        headers: { "x-tenant-slug": "acme" },
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.logIn(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Username and password are required",
      });
    });

    it("returns 404 when organization (tenant) is not found", async () => {
      mockService.login.mockRejectedValue(
        createError("Organization not found", 404),
      );
      const req = {
        body: { username: "user", password: "pass" },
        headers: { "x-tenant-slug": "unknown-org" },
        get: vi.fn(),
        ip: undefined,
        socket: { remoteAddress: undefined },
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.logIn(req, res);

      expect(mockService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "user",
          password: "pass",
          tenantSlug: "unknown-org",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Organization not found",
      });
    });

    it("returns 403 when tenant is inactive", async () => {
      mockService.login.mockRejectedValue(
        createError("This organization has been deactivated", 403),
      );
      const req = {
        body: { username: "user", password: "pass" },
        headers: { "x-tenant-slug": "acme" },
        get: vi.fn(),
        ip: undefined,
        socket: { remoteAddress: undefined },
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.logIn(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "This organization has been deactivated",
      });
    });

    it("returns 401 when user is not found", async () => {
      mockService.login.mockRejectedValue(
        createError("Invalid username or password", 401),
      );
      const req = {
        body: { username: "nobody", password: "pass" },
        headers: { "x-tenant-slug": "acme" },
        get: vi.fn(),
        ip: undefined,
        socket: { remoteAddress: undefined },
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.logIn(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid username or password",
      });
    });

    it("returns 200 with token and user on successful login", async () => {
      const result = {
        token: "jwt-token-here",
        user: {
          id: "user-1",
          tenantId: "tenant-1",
          username: "user",
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        tenant: {
          id: "tenant-1",
          slug: "acme",
          name: "Acme",
          plan: "free",
          subscriptionStatus: "active",
          planExpiresAt: null,
          trialEndsAt: null,
        },
      };
      mockService.login.mockResolvedValue(result);

      const req = {
        body: { username: "User", password: "correct" },
        headers: { "x-tenant-slug": "acme" },
        ip: "127.0.0.1",
        socket: { remoteAddress: "127.0.0.1" },
        get: vi.fn().mockReturnValue("Mozilla/5.0"),
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.logIn(req, res);

      expect(mockService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          username: "user",
          password: "correct",
          tenantSlug: "acme",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(result);
    });
  });

  describe("getCurrentUser", () => {
    it("returns 401 when req.user is missing", async () => {
      const req = { user: undefined } as unknown as Request;
      const res = mockRes() as Response;

      await authController.getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "User not authenticated",
      });
      expect(mockService.getMe).not.toHaveBeenCalled();
    });

    it("returns 401 when user is not found in database", async () => {
      mockService.getMe.mockRejectedValue(
        createError("User not found or session invalid", 401),
      );
      const req = {
        user: {
          id: "user-1",
          role: "admin",
          tenantId: "t1",
          tenantSlug: "acme",
        },
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.getCurrentUser(req, res);

      expect(mockService.getMe).toHaveBeenCalledWith("user-1");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "User not found or session invalid",
      });
    });

    it("returns 200 with user and tenant when found", async () => {
      const dbUser = {
        id: "user-1",
        tenantId: "tenant-1",
        username: "user",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const dbTenant = {
        id: "tenant-1",
        slug: "acme",
        name: "Acme",
        plan: "free",
        subscriptionStatus: "active",
        planExpiresAt: null,
        trialEndsAt: null,
      };
      mockService.getMe.mockResolvedValue({ user: dbUser, tenant: dbTenant });

      const req = {
        user: {
          id: "user-1",
          role: "admin",
          tenantId: "tenant-1",
          tenantSlug: "acme",
        },
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ user: dbUser, tenant: dbTenant });
    });
  });

  describe("logOut", () => {
    it("returns 200 with success message", async () => {
      const req = {} as Request;
      const res = mockRes() as Response;

      await authController.logOut(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Logout successful",
      });
    });
  });
});
