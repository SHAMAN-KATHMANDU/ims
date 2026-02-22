import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import authController from "./auth.controller";

const mockFindUniqueTenant = vi.fn();
const mockFindFirstUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockFindUniqueUser = vi.fn();
const mockCreateRefreshToken = vi.fn();
const mockFindFirstRefreshToken = vi.fn();
const mockUpdateRefreshToken = vi.fn();
const mockUpdateManyRefreshToken = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/config/prisma", () => ({
  basePrisma: {
    tenant: {
      findUnique: (...args: unknown[]) => mockFindUniqueTenant(...args),
    },
    user: {
      findFirst: (...args: unknown[]) => mockFindFirstUser(...args),
      findUnique: (...args: unknown[]) => mockFindUniqueUser(...args),
      update: (...args: unknown[]) => mockUpdateUser(...args),
    },
    auditLog: { create: (...args: unknown[]) => mockCreateAuditLog(...args) },
    refreshToken: {
      create: (...args: unknown[]) => mockCreateRefreshToken(...args),
      findFirst: (...args: unknown[]) => mockFindFirstRefreshToken(...args),
      update: (...args: unknown[]) => mockUpdateRefreshToken(...args),
      updateMany: (...args: unknown[]) => mockUpdateManyRefreshToken(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const mockCompare = vi.fn();
vi.mock("bcryptjs", () => ({
  default: { compare: (...args: unknown[]) => mockCompare(...args) },
}));

const mockSign = vi.fn();
vi.mock("jsonwebtoken", () => ({
  default: { sign: (...args: unknown[]) => mockSign(...args) },
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

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("AuthController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (tx: any) => Promise<unknown>)({
          user: { update: (...txArgs: unknown[]) => mockUpdateUser(...txArgs) },
          auditLog: {
            create: (...txArgs: unknown[]) => mockCreateAuditLog(...txArgs),
          },
          refreshToken: {
            create: (...txArgs: unknown[]) => mockCreateRefreshToken(...txArgs),
            update: (...txArgs: unknown[]) => mockUpdateRefreshToken(...txArgs),
          },
        });
      }
      return null;
    });
  });

  describe("logIn", () => {
    it("returns 400 when username and password are missing", async () => {
      const req = {
        body: {},
        headers: {},
        ip: undefined,
        socket: { remoteAddress: undefined },
        get: vi.fn(),
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.logIn(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Username and password are required",
      });
      expect(mockFindUniqueTenant).not.toHaveBeenCalled();
    });

    it("returns 400 when username is empty string", async () => {
      const req = {
        body: { username: "   ", password: "pwd" },
        headers: {},
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.logIn(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Username and password are required",
      });
    });

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
      expect(mockFindUniqueTenant).not.toHaveBeenCalled();
    });

    it("returns 404 when organization (tenant) is not found", async () => {
      mockFindUniqueTenant.mockResolvedValue(null);
      const req = {
        body: { username: "user", password: "pass" },
        headers: { "x-tenant-slug": "unknown-org" },
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.logIn(req, res);

      expect(mockFindUniqueTenant).toHaveBeenCalledWith({
        where: { slug: "unknown-org" },
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Organization not found",
      });
    });

    it("returns 403 when tenant is inactive", async () => {
      mockFindUniqueTenant.mockResolvedValue({
        id: "tenant-1",
        slug: "acme",
        name: "Acme",
        isActive: false,
        plan: "free",
        subscriptionStatus: "active",
        planExpiresAt: null,
        trialEndsAt: null,
      });
      const req = {
        body: { username: "user", password: "pass" },
        headers: { "x-tenant-slug": "acme" },
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.logIn(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "This organization has been deactivated",
      });
    });

    it("returns 401 when user is not found", async () => {
      mockFindUniqueTenant.mockResolvedValue({
        id: "tenant-1",
        slug: "acme",
        name: "Acme",
        isActive: true,
        plan: "free",
        subscriptionStatus: "active",
        planExpiresAt: null,
        trialEndsAt: null,
      });
      mockFindFirstUser.mockResolvedValue(null);
      const req = {
        body: { username: "nobody", password: "pass" },
        headers: { "x-tenant-slug": "acme" },
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.logIn(req, res);

      expect(mockFindFirstUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid username or password",
      });
    });

    it("returns 401 when password does not match", async () => {
      const tenant = {
        id: "tenant-1",
        slug: "acme",
        name: "Acme",
        isActive: true,
        plan: "free",
        subscriptionStatus: "active",
        planExpiresAt: null,
        trialEndsAt: null,
      };
      const user = {
        id: "user-1",
        tenantId: "tenant-1",
        username: "user",
        role: "admin",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      };
      mockFindUniqueTenant.mockResolvedValue(tenant);
      mockFindFirstUser.mockResolvedValue(user);
      mockCompare.mockResolvedValue(false);

      const req = {
        body: { username: "user", password: "wrong" },
        headers: { "x-tenant-slug": "acme" },
      } as unknown as Request;
      const res = mockRes() as Response;

      await authController.logIn(req, res);

      expect(mockCompare).toHaveBeenCalledWith("wrong", "hashed");
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid username or password",
      });
      // Lockout: basePrisma.user.update is called to increment failedLoginAttempts
      expect(mockUpdateUser).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: expect.objectContaining({
          failedLoginAttempts: 1,
        }),
      });
    });

    it("returns 200 with token and user on successful login", async () => {
      const tenant = {
        id: "tenant-1",
        slug: "acme",
        name: "Acme",
        isActive: true,
        plan: "free",
        subscriptionStatus: "active",
        planExpiresAt: null,
        trialEndsAt: null,
      };
      const user = {
        id: "user-1",
        tenantId: "tenant-1",
        username: "user",
        role: "admin",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      };
      mockFindUniqueTenant.mockResolvedValue(tenant);
      mockFindFirstUser.mockResolvedValue(user);
      mockCompare.mockResolvedValue(true);
      mockUpdateUser.mockResolvedValue(user);
      mockCreateAuditLog.mockResolvedValue({});
      mockCreateRefreshToken.mockResolvedValue({ id: "session-1" });
      mockSign.mockReturnValue("jwt-token-here");

      const req = {
        body: { username: "User", password: "correct" },
        headers: { "x-tenant-slug": "acme" },
        ip: "127.0.0.1",
        socket: { remoteAddress: "127.0.0.1" },
        get: vi.fn().mockReturnValue("Mozilla/5.0"),
      } as unknown as Request;
      const res = mockRes() as Response;
      (res.setHeader as ReturnType<typeof vi.fn>) = vi.fn().mockReturnThis();

      await authController.logIn(req, res);

      expect(mockCompare).toHaveBeenCalledWith("correct", "hashed");
      expect(mockUpdateUser).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: expect.objectContaining({
          lastLoginAt: expect.any(Date),
          failedLoginAttempts: 0,
          lockedUntil: null,
        }),
      });
      expect(mockCreateAuditLog).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          userId: "user-1",
          action: "LOGIN",
          resource: "auth",
          resourceId: "user-1",
          details: { username: "user", tenantSlug: "acme" },
        }),
      });
      expect(mockSign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "user-1",
          username: "user",
          role: "admin",
          tenantId: "tenant-1",
          tenantSlug: "acme",
          sessionId: "session-1",
        }),
        "test-secret",
        { expiresIn: "15m" },
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Set-Cookie",
        expect.any(Array),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        user: expect.not.objectContaining({ password: expect.anything() }),
        tenant: expect.objectContaining({
          id: "tenant-1",
          slug: "acme",
          name: "Acme",
        }),
      });
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
      expect(mockFindUniqueUser).not.toHaveBeenCalled();
    });

    it("returns 401 when user is not found in database", async () => {
      mockFindUniqueUser.mockResolvedValue(null);
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

      expect(mockFindUniqueUser).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: expect.any(Object),
      });
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
      mockFindUniqueUser.mockResolvedValue(dbUser);
      mockFindUniqueTenant.mockResolvedValue(dbTenant);

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
      mockUpdateManyRefreshToken.mockResolvedValue({ count: 1 });
      const req = {
        user: { id: "user-1", role: "admin", tenantId: "tenant-1" },
        body: {},
      } as unknown as Request;
      const res = mockRes() as Response;
      (res.setHeader as ReturnType<typeof vi.fn>) = vi.fn().mockReturnThis();

      await authController.logOut(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Set-Cookie",
        expect.any(Array),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Logout successful",
        revokedSessions: 1,
      });
    });
  });
});
